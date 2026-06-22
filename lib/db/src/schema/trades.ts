import { pgTable, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradesTable = pgTable("trades", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  price: doublePrecision("price").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  side: text("side").notNull(), // "buy" | "sell" (aggressor side)
  buyOrderId: text("buy_order_id").notNull(),
  sellOrderId: text("sell_order_id").notNull(),
  buyTraderId: text("buy_trader_id"),
  sellTraderId: text("sell_trader_id"),
  userId: text("user_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(tradesTable);
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
