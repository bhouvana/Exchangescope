// Seed the curated stock list into the companies table.
// Imports symbol maps from marketData.ts so there is a single source of truth.
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { SYMBOLS_NASDAQ, SYMBOLS_NYSE, SYMBOLS_NSE, SYMBOLS_BSE } from "./marketData";

type SeedMap = Record<string, [string, string]>;

async function seedExchange(exchange: string, map: SeedMap): Promise<number> {
  // Clear stale rows first so old companies from previous schema don't pollute results
  await db.delete(companiesTable).where(eq(companiesTable.exchange, exchange));

  const entries = Object.entries(map).map(([symbol, [name, sector]]) => ({
    id: `${exchange}:${symbol}`,
    symbol,
    name,
    exchange,
    sector,
    market_cap: null as number | null,
  }));

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    await db.insert(companiesTable).values(batch).onConflictDoNothing();
    inserted += batch.length;
  }
  return inserted;
}

export async function seedCompanies() {
  logger.info("Seeding companies…");
  const [nasdaq, nyse, nse, bse] = await Promise.all([
    seedExchange("nasdaq", SYMBOLS_NASDAQ as SeedMap),
    seedExchange("nyse",   SYMBOLS_NYSE   as SeedMap),
    seedExchange("nse",    SYMBOLS_NSE    as SeedMap),
    seedExchange("bse",    SYMBOLS_BSE    as SeedMap),
  ]);
  const counts = { nasdaq, nyse, nse, bse };
  logger.info({ counts }, "Seed complete");
  return counts;
}

// Backward-compat alias
export const seedAllCompanies = (_opts?: unknown) => seedCompanies();
