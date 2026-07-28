import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({
      rollupConfig: {
        // @sentry is optional and unused at runtime; keep it external.
        // kysely / @better-auth/kysely-adapter are bundled normally now that
        // kysely is pinned to 0.28.x (see package.json "overrides"), so they
        // no longer need to be external. Bundling them into the server output
        // avoids ERR_MODULE_NOT_FOUND on Vercel (externals aren't shipped).
        external: [/^@sentry\//],
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
