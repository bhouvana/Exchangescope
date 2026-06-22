import { pgTable, text, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";

export const cachedNewsTable = pgTable("cached_news", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  headline: text("headline").notNull(),
  summary: text("summary"),
  source: text("source"),
  url: text("url"),
  category: text("category"),
  sentiment: doublePrecision("sentiment"),
  relatedSymbols: jsonb("related_symbols").$type<string[]>().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CachedNews = typeof cachedNewsTable.$inferSelect;
