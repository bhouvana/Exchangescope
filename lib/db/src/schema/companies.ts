import { pgTable, text, integer, boolean, timestamp, doublePrecision, index } from "drizzle-orm/pg-core";

export const companiesTable = pgTable("companies", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  exchange: text("exchange").notNull(),
  sector: text("sector").notNull().default(""),
  industry: text("industry").notNull().default(""),
  country: text("country").notNull().default(""),
  currency: text("currency").notNull().default("USD"),
  marketCap: doublePrecision("market_cap"),
  employees: integer("employees"),
  website: text("website"),
  logo: text("logo"),
  isActive: boolean("is_active").notNull().default(true),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  symbolIdx: index("idx_companies_symbol").on(table.symbol),
  nameIdx: index("idx_companies_name").on(table.name),
  exchangeIdx: index("idx_companies_exchange").on(table.exchange),
  sectorIdx: index("idx_companies_sector").on(table.sector),
  marketCapIdx: index("idx_companies_market_cap").on(table.marketCap),
}));

export type Company = typeof companiesTable.$inferSelect;
