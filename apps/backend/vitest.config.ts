import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@account-book-app/shared": path.resolve(
        __dirname,
        "../../packages/shared/src"
      ),
    },
  },
});
