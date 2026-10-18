import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// card images come from the arkham.build CDN, which sends no CORS headers; WebGL textures need
// same-origin (or CORS) images, so the dev/preview server proxies /cards/* to the CDN.
// On GitHub Pages the scans are downloaded into the build instead (scripts/fetch-card-images.ts);
// elsewhere, configure the same rewrite on the host or set VITE_CARD_IMAGE_BASE.
const cardProxy = {
  // only /cards/… (a bare "/cards" prefix would also catch the Russian images in /cards-ru/)
  "^/cards/": {
    target: "https://cdn.arkham.build",
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/cards/, "/optimized"),
  },
};

// the build's version, shown in bug reports (the Debug panel's Copy report)
const appVersion = (JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string }).version;

export default defineConfig({
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion) },
  // GitHub Pages serves the site under /<repo>/ (the deploy workflow sets PAGES_BASE); locally it is /
  base: process.env.PAGES_BASE ?? "/",
  plugins: [react()],
  server: { proxy: cardProxy },
  preview: { proxy: cardProxy },
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
});
