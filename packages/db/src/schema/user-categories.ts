import {
  pgTable,
  serial,
  integer,
  boolean,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { categories } from "./categories";

export const userCategories = pgTable(
  "user_categories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    isVisible: boolean("is_visible").notNull().default(true),
    customName: varchar("custom_name", { length: 50 }),
    displayOrder: integer("display_order"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    unq: unique().on(table.userId, table.categoryId),
  })
);
