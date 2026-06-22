import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { companiesTable, exchangesTable } from "@workspace/db/schema";
import { eq, like, or, and, desc, asc, sql } from "drizzle-orm";
import { getQuote, enrichCompany, setEnrichedCache } from "../lib/marketData";

const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Track which symbols we've already attempted to enrich so we don't re-fetch on every page request
const fundamentalsEnrichedSymbols = new Set<string>();

/**
 * Fire-and-forget Finnhub enrichment for a list of US-exchange rows.
 * Yahoo Finance v7/quote is now blocked; Finnhub profile2 is used instead.
 * Rate: 1 call per ~1.1 s to stay under the 60/min free-tier limit.
 */
function scheduleFinnhubEnrichment(
  rows: Array<{ symbol: string; name: string; exchange: string | null; sector: string | null; marketCap: number | null }>,
): void {
  const apiKey = process.env.FINNHUB_API_KEY ?? "";
  if (!apiKey) return;
  const usRows = rows.filter(r => r.exchange === "nasdaq" || r.exchange === "nyse");
  if (usRows.length === 0) return;

  // Run asynchronously — never awaited, so it never blocks the HTTP response
  (async () => {
    for (const row of usRows) {
      try {
        const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(row.symbol)}&token=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, { headers: { "User-Agent": YAHOO_UA, Accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json() as any;
        const mktCapMillions = data.marketCapitalization ?? 0;
        if (mktCapMillions <= 0) continue;
        const existing = getQuote(row.symbol);
        setEnrichedCache(row.symbol, {
          symbol: row.symbol,
          name: (data.name ?? "").trim() || row.name || row.symbol,
          sector: existing?.sector || row.sector || "",
          price: existing?.price ?? 0,
          change: existing?.change ?? 0,
          changePercent: existing?.changePercent ?? 0,
          volume: existing?.volume ?? 0,
          marketCap: mktCapMillions * 1_000_000,
          peRatio: existing?.peRatio ?? 0,
          week52High: existing?.week52High ?? 0,
          week52Low: existing?.week52Low ?? 0,
          updatedAt: new Date().toISOString(),
        });
      } catch { /* skip on network error */ }
      await new Promise(r => setTimeout(r, 1100)); // ≈54 calls/min
    }
  })().catch(() => {});
}

/** Queue missing-cap rows for Finnhub enrichment; return immediately so API response isn't delayed. */
function bulkEnrich(
  rows: Array<{ symbol: string; name: string; exchange: string | null; sector: string | null; marketCap: number | null }>,
): void {
  const missing = rows.filter(r => {
    if (fundamentalsEnrichedSymbols.has(r.symbol)) return false;
    const q = getQuote(r.symbol);
    return !q || q.marketCap === 0;
  });
  if (missing.length === 0) return;
  // Mark all as in-progress NOW so concurrent page loads don't schedule duplicate fetches
  for (const row of missing) fundamentalsEnrichedSymbols.add(row.symbol);
  scheduleFinnhubEnrichment(missing);
}

const router: IRouter = Router();

// Snapshot cache: keyed by "exchange|sector|search|sortBy|sortDir", TTL 20 s.
// All page requests that share those parameters slice the same sorted array,
// so page 1 and page 2 always come from an identical ranked list regardless of
// how background enrichment mutates the live-quote cache between requests.
const liveResultSnapshot = new Map<string, { at: number; rows: any[]; total: number }>();
const SNAPSHOT_TTL_MS = 20_000;

// GET /companies — paginated company list with search, filter, sort
router.get("/companies", async (req, res) => {
  try {
    const exchange = (req.query.exchange as string) || "";
    const search = (req.query.search as string) || "";
    const sector = (req.query.sector as string) || "";
    const sortBy = (req.query.sortBy as string) || "marketCap";
    const sortDir = (req.query.sortDir as string) || "desc";
    const page = Math.max(0, parseInt(req.query.page as string) || 0);
    const pageSize = Math.min(250, Math.max(10, parseInt(req.query.pageSize as string) || 50));

    const conditions: any[] = [];
    if (exchange) conditions.push(eq(companiesTable.exchange, exchange));
    if (sector) conditions.push(eq(companiesTable.sector, sector));
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(or(
        like(companiesTable.symbol, pattern),
        like(companiesTable.name, pattern),
      ));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Columns that live in the DB — can be sorted at query time
    const dbSortColMap: Record<string, any> = {
      symbol: companiesTable.symbol,
      name: companiesTable.name,
      exchange: companiesTable.exchange,
      sector: companiesTable.sector,
    };

    // Columns that come from live quotes — must be sorted in-memory after enrichment
    // marketCap is here because the DB column is always null (populated via background enrichment)
    const liveSortColumns = new Set(["price", "changePercent", "volume", "marketCap"]);

    if (liveSortColumns.has(sortBy)) {
      const snapKey = `${exchange}|${sector}|${search}|${sortBy}|${sortDir}`;

      // Serve from snapshot when still fresh — guarantees all pages use the same ranked list
      const existing = liveResultSnapshot.get(snapKey);
      if (existing && (Date.now() - existing.at) < SNAPSHOT_TTL_MS) {
        const paginated = existing.rows.slice(page * pageSize, (page + 1) * pageSize);
        res.json({ data: paginated, total: existing.total, page, pageSize, totalPages: Math.ceil(existing.total / pageSize) });
        return;
      }

      // Fetch ALL matching rows, enrich, sort in-memory, then paginate
      const [totalResult, allRows] = await Promise.all([
        db.select({ total: sql<number>`COUNT(*)::int` }).from(companiesTable).where(where),
        db.select().from(companiesTable).where(where).orderBy(asc(companiesTable.symbol)),
      ]);

      bulkEnrich(allRows);

      const allEnriched: any[] = allRows.map(r => {
        const q = enrichCompany(r);
        return { ...r, ...q, name: q.name || r.name };
      });

      // Stable sort: primary by sortBy, secondary by symbol as tiebreaker so the
      // order is deterministic even when two rows have the same live value.
      allEnriched.sort((a, b) => {
        const av = (a[sortBy] ?? 0) as number;
        const bv = (b[sortBy] ?? 0) as number;
        // Push zero/null stubs to the end regardless of sort direction
        if (av === 0 && bv !== 0) return 1;
        if (bv === 0 && av !== 0) return -1;
        const cmp = sortDir === "asc" ? av - bv : bv - av;
        if (cmp !== 0) return cmp;
        return a.symbol.localeCompare(b.symbol);
      });

      const total = totalResult[0]?.total ?? 0;

      // Store snapshot; prune entries that are well past their TTL
      liveResultSnapshot.set(snapKey, { at: Date.now(), rows: allEnriched, total });
      for (const [k, v] of liveResultSnapshot) {
        if (Date.now() - v.at > SNAPSHOT_TTL_MS * 3) liveResultSnapshot.delete(k);
      }

      const paginated = allEnriched.slice(page * pageSize, (page + 1) * pageSize);
      res.json({ data: paginated, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
      return;
    }

    // DB-level sort for static columns
    const sortCol = dbSortColMap[sortBy] || companiesTable.marketCap;
    const orderBy = sortDir === "asc" ? asc(sortCol) : desc(sortCol);

    const [totalResult, rows] = await Promise.all([
      db.select({ total: sql<number>`COUNT(*)::int` }).from(companiesTable).where(where),
      db.select().from(companiesTable).where(where).orderBy(orderBy).limit(pageSize).offset(page * pageSize),
    ]);

    // Batch-fetch Yahoo quotes for symbols not yet in the live cache
    await bulkEnrich(rows);

    const enriched = rows.map(r => {
      const q = enrichCompany(r);
      return { ...r, ...q, name: q.name || r.name };
    });

    res.json({
      data: enriched,
      total: totalResult[0]?.total ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((totalResult[0]?.total ?? 0) / pageSize),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Companies list failed");
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// GET /companies/search — instant search with top results (for autocomplete)
router.get("/companies/search", async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    if (!q || q.length < 1) { res.json([]); return; }

    const pattern = `%${q}%`;
    const exchange = req.query.exchange as string;
    const conditions: any[] = [
      or(
        like(companiesTable.symbol, pattern),
        like(companiesTable.name, pattern),
      ),
    ];
    if (exchange) conditions.push(eq(companiesTable.exchange, exchange));

    const rows = await db.select({
      id: companiesTable.id,
      symbol: companiesTable.symbol,
      name: companiesTable.name,
      exchange: companiesTable.exchange,
      sector: companiesTable.sector,
      marketCap: companiesTable.marketCap,
    }).from(companiesTable)
      .where(and(...conditions))
      .orderBy(desc(companiesTable.marketCap))
      .limit(15);

    res.json(rows);
  } catch (err: any) {
    logger.error({ err: err.message }, "Company search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /companies/sectors — list distinct sectors
router.get("/companies/sectors", async (req, res) => {
  try {
    const exchange = req.query.exchange as string;
    const conditions: any[] = [];
    if (exchange) conditions.push(eq(companiesTable.exchange, exchange));

    const rows = await db.selectDistinct({
      sector: companiesTable.sector,
    }).from(companiesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(companiesTable.sector);

    res.json(rows.map(r => r.sector).filter(Boolean));
  } catch (err: any) {
    logger.error({ err: err.message }, "Sectors list failed");
    res.status(500).json({ error: "Failed to fetch sectors" });
  }
});

// GET /exchanges — list all exchanges with metadata
router.get("/exchanges", async (_req, res) => {
  try {
    const rows = await db.select().from(exchangesTable).orderBy(exchangesTable.name);
    res.json(rows);
  } catch (err: any) {
    logger.error({ err: err.message }, "Exchanges list failed");
    res.status(500).json({ error: "Failed to fetch exchanges" });
  }
});

export default router;
