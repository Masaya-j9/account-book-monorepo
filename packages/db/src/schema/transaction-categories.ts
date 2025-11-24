import { pgTable, serial, integer, unique } from "drizzle-orm/pg-core";
import { transactions } from "./transactions";
import { categories } from "./categories";

export const transactionCategories = pgTable(
  "transaction_categories",
  {
    id: serial("id").primaryKey(),
    transactionId: integer("transaction_id")
      .notNull()
      .references(() => transactions.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
  },
  (table) => ({
    unq: unique().on(table.transactionId, table.categoryId),
  })
);
