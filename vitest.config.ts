import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";

/**
 * Test-only Vite config.
 *
 * Kept separate from `vite.config.ts` on purpose: that config loads the
 * TanStack Start and Nitro plugins, which build a server bundle and are both
 * unnecessary and slow for unit tests. Here we only need JSX transformed.
 *
 * `#/*` imports resolve through the `imports` field in package.json, so no
 * path aliases are needed.
 */
export default defineConfig({
  plugins: [viteReact()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
