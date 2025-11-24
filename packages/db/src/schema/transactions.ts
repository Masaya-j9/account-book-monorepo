import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { currencies } from "./currencies";
import { transactionTypes } from "./transaction-types";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  typeId: integer("type_id")
    .notNull()
    .references(() => transactionTypes.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  title: varchar("title", { length: 100 }).notNull(),
  amount: integer("amount").notNull(),
  currencyId: integer("currency_id")
    .notNull()
    .references(() => currencies.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  date: date("date").notNull(),
  memo: text("memo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
