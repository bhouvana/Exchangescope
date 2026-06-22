import { pgTable, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const cachedEarningsTable = pgTable("cached_earnings", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  quarter: text("quarter").notNull(),
  fiscalYear: doublePrecision("fiscal_year"),
  reportedEps: doublePrecision("reported_eps"),
  estimatedEps: doublePrecision("estimated_eps"),
  surprise: doublePrecision("surprise"),
  surprisePct: doublePrecision("surprise_pct"),
  revenue: doublePrecision("revenue"),
  estimatedRevenue: doublePrecision("estimated_revenue"),
  reportDate: timestamp("report_date", { withTimezone: true }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CachedEarnings = typeof cachedEarningsTable.$inferSelect;
