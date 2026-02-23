import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "../../.env" });

export default defineConfig({
	schema: [
		"./src/schema/categories.ts",
		"./src/schema/currencies.ts",
		"./src/schema/token-blacklists.ts",
		"./src/schema/transaction-categories.ts",
		"./src/schema/transaction-types.ts",
		"./src/schema/transactions.ts",
		"./src/schema/user-categories.ts",
		"./src/schema/users.ts",
	],
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "",
	},
	verbose: true,
	strict: true,
});
