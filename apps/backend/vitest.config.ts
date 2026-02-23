import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
	},
	resolve: {
		alias: {
			"@account-book-app/db": path.resolve(__dirname, "../../packages/db/src"),
			"@account-book-app/shared": path.resolve(
				__dirname,
				"../../packages/shared/src",
			),
		},
	},
});
