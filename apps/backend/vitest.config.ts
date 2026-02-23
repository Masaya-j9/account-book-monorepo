import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		// CI 環境に .env が存在しない場合でも db.ts の DATABASE_URL チェックを通過させるダミー値。
		// テストでは db インスタンス自体をモックするため実際には接続しない。
		env: {
			DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test",
		},
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
