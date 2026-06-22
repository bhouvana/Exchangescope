import { pgTable, text, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";

export const cachedFundamentalsTable = pgTable("cached_fundamentals", {
  symbol: text("symbol").primaryKey(),
  companyName: text("company_name"),
  sector: text("sector"),
  industry: text("industry"),
  marketCap: doublePrecision("market_cap"),
  peRatio: doublePrecision("pe_ratio"),
  forwardPe: doublePrecision("forward_pe"),
  eps: doublePrecision("eps"),
  dividendYield: doublePrecision("dividend_yield"),
  beta: doublePrecision("beta"),
  high52Week: doublePrecision("high_52_week"),
  low52Week: doublePrecision("low_52_week"),
  avgVolume: doublePrecision("avg_volume"),
  revenue: doublePrecision("revenue"),
  revenueGrowth: doublePrecision("revenue_growth"),
  profitMargin: doublePrecision("profit_margin"),
  debtToEquity: doublePrecision("debt_to_equity"),
  freeCashFlow: doublePrecision("free_cash_flow"),
  insiderOwnership: doublePrecision("insider_ownership"),
  institutionalOwnership: doublePrecision("institutional_ownership"),
  sharesOutstanding: doublePrecision("shares_outstanding"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CachedFundamentals = typeof cachedFundamentalsTable.$inferSelect;
