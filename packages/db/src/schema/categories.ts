import {
	boolean,
	integer,
	pgTable,
	serial,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { transactionTypes } from "./transaction-types";

export const categories = pgTable("categories", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 50 }).notNull().unique(),
	typeId: integer("type_id")
		.notNull()
		.references(() => transactionTypes.id, {
			onDelete: "restrict",
			onUpdate: "cascade",
		}),
	isDefault: boolean("is_default").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
