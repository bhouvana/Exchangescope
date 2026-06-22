import { Router, type IRouter, type Request, type Response } from "express";
import { createSession, getSession, destroySession, SESSION_COOKIE, getUserId } from "../lib/session";
import { db } from "@workspace/db";
import { ordersTable, tradesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const router: IRouter = Router();

const GOOGLE_VERIFY_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";

router.post("/auth/google", async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400).json({ error: "Missing credential" });
    return;
  }

  try {
    let payload: { sub: string; email: string; name: string; picture?: string };

    if (process.env.NODE_ENV === "development" && credential === "dev-mode") {
      payload = {
        sub: "dev-user-001",
        email: "dev@exchangescope.local",
        name: "Dev User",
        picture: undefined,
      };
    } else {
      const resp = await fetch(`${GOOGLE_VERIFY_URL}${encodeURIComponent(credential)}`);
      if (!resp.ok) {
        res.status(401).json({ error: "Invalid credential" });
        return;
      }
      payload = await resp.json() as any;
    }

    const sid = createSession(payload);

    res.cookie(SESSION_COOKIE, sid, {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Auth failed");
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.get("/auth/session", (req: Request, res: Response): void => {
  const sid = req.signedCookies?.[SESSION_COOKIE] ?? req.cookies?.[SESSION_COOKIE];
  if (!sid) {
    res.json({ user: null });
    return;
  }
  const session = getSession(sid);
  if (!session) {
    res.json({ user: null });
    return;
  }
  res.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      picture: session.picture,
    },
  });
});

router.post("/auth/logout", (req: Request, res: Response): void => {
  const sid = req.signedCookies?.[SESSION_COOKIE] ?? req.cookies?.[SESSION_COOKIE];
  if (sid) destroySession(sid);
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

router.get("/auth/config", (_req: Request, res: Response): void => {
  const cid = process.env.GOOGLE_CLIENT_ID;
  res.json({
    googleClientId: cid && cid !== "GOOGLE_CLIENT_ID_PLACEHOLDER" ? cid : null,
  });
});

router.get("/auth/orders", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { symbol, limit } = req.query;
  const lim = Math.min(Number(limit) || 50, 200);

  const cond = [eq(ordersTable.userId, userId)];
  if (symbol) cond.push(eq(ordersTable.symbol, String(symbol).toUpperCase()));

  const rows = await db
    .select()
    .from(ordersTable)
    .where(and(...cond))
    .orderBy(desc(ordersTable.createdAt))
    .limit(lim);

  res.json(rows.map(r => ({
    id: r.id,
    symbol: r.symbol,
    type: r.type,
    side: r.side,
    quantity: r.quantity,
    price: r.price,
    status: r.status,
    filledQuantity: r.filledQuantity,
    avgFillPrice: r.avgFillPrice,
    userId: r.userId,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: r.updatedAt?.toISOString() ?? null,
  })));
});

router.get("/auth/trades", async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { symbol, limit } = req.query;
  const lim = Math.min(Number(limit) || 100, 500);

  const cond = [eq(tradesTable.userId, userId)];
  if (symbol) cond.push(eq(tradesTable.symbol, String(symbol).toUpperCase()));

  const rows = await db
    .select()
    .from(tradesTable)
    .where(and(...cond))
    .orderBy(desc(tradesTable.timestamp))
    .limit(lim);

  res.json(rows.map(r => ({
    id: r.id,
    symbol: r.symbol,
    price: r.price,
    quantity: r.quantity,
    side: r.side,
    buyOrderId: r.buyOrderId,
    sellOrderId: r.sellOrderId,
    userId: r.userId,
    timestamp: r.timestamp?.toISOString() ?? new Date().toISOString(),
  })));
});

export default router;
