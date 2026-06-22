import { pgTable, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const cachedAnalystRatingsTable = pgTable("cached_analyst_ratings", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  firm: text("firm").notNull(),
  action: text("action").notNull(), // upgrade | downgrade | init | reiterate
  targetFrom: doublePrecision("target_from"),
  targetTo: doublePrecision("target_to"),
  ratingFrom: text("rating_from"),
  ratingTo: text("rating_to"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CachedAnalystRating = typeof cachedAnalystRatingsTable.$inferSelect;
