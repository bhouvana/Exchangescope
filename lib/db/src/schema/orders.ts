import { pgTable, text, serial, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(), // "market" | "limit"
  side: text("side").notNull(), // "buy" | "sell"
  quantity: doublePrecision("quantity").notNull(),
  price: doublePrecision("price"),
  status: text("status").notNull().default("queued"), // queued|partial|filled|cancelled|rejected
  filledQuantity: doublePrecision("filled_quantity").notNull().default(0),
  avgFillPrice: doublePrecision("avg_fill_price"),
  traderId: text("trader_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
