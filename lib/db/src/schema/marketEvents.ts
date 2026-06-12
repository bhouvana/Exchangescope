import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketEventsTable = pgTable("market_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // order_submitted|order_queued|order_matched|order_filled|order_partial|order_cancelled|trade_executed|market_control
  symbol: text("symbol").notNull(),
  data: jsonb("data").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMarketEventSchema = createInsertSchema(marketEventsTable);
export type InsertMarketEvent = z.infer<typeof insertMarketEventSchema>;
export type MarketEvent = typeof marketEventsTable.$inferSelect;
