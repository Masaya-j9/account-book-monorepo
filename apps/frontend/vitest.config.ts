import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: true,
  },
  define: {
    "process.env.VITEST": JSON.stringify("true"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@account-book-app/shared": path.resolve(
        __dirname,
        "../../packages/shared/src"
      ),
    },
  },
});
