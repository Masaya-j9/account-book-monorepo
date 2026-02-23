import {
	integer,
	pgTable,
	serial,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const tokenBlacklists = pgTable("token_blacklists", {
	id: serial("id").primaryKey(),
	tokenIdentifier: varchar("token_identifier", { length: 255 })
		.notNull()
		.unique(),
	userId: integer("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
