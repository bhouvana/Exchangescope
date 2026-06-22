import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const researchReportsTable = pgTable("research_reports", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // company_research | sector_research | thesis_builder | daily_briefing | learning_response
  title: text("title").notNull(),
  symbol: text("symbol"),
  sector: text("sector"),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  summary: text("summary"),
  modelUsed: text("model_used"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ResearchReport = typeof researchReportsTable.$inferSelect;
