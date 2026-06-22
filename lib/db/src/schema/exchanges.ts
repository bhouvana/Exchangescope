import { pgTable, text, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const exchangesTable = pgTable("exchanges", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  currency: text("currency").notNull(),
  currencySymbol: text("currency_symbol").notNull(),
  timezone: text("timezone").notNull(),
  openTime: text("open_time").notNull(),
  closeTime: text("close_time").notNull(),
  companyCount: integer("company_count").notNull().default(0),
  suffix: text("suffix").notNull().default(""),
  isOpen: boolean("is_open").notNull().default(false),
  color: text("color").notNull().default("#00FF88"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Exchange = typeof exchangesTable.$inferSelect;
