## Why

The game only runs from a local dev server. A GitHub Pages deployment of `JiLiZART/arkham-cards-game-app`, at `https://arkham.artkost.dev`, would let it be played from a link on any computer, rebuilt automatically on every push to `main`.

Two things stop a plain static deploy from working today:
- **Root paths.** A Pages project site lives under `/arkham-cards-game-app/` unless it has its own domain, but several asset URLs assume the site root. (The account's user site redirects to `artkost.dev`, which Cloudflare serves, so this site gets its own subdomain and is built for `/`. Sub-path builds still work.)
- **Card scans.** They come from `cdn.arkham.build`, which sends no CORS headers. The dev server proxies `/cards/*` so WebGL can use the images as textures; GitHub Pages can't proxy.

## What Changes

- **GitHub Actions workflow** (`.github/workflows/deploy.yml`). On push to `main`, and on manual dispatch, it:
  - installs dependencies;
  - runs the tests, lint and content check;
  - builds with the Pages base path;
  - downloads the card scans into the build;
  - publishes the result with the official Pages actions.

  A failing check stops the deploy, and the live site stays on the previous version.
- **Base-path-aware asset URLs.** Card images, card backs, PNG icons and the investigator picker portraits are built from Vite's base URL instead of `/`. The dev server and local builds keep working at `/`.
- **Card scans bundled at deploy.** A script downloads every front, plus the back of each double-sided card, from the CDN into the build's `cards/` folder. These are the same files the dev proxy serves, so the game reads them same-origin. The workflow caches them between runs.
- **Pages setup notes** in the README: "GitHub Actions" as the Pages source; the custom domain and its Cloudflare DNS record; the site URL; how to run the deploy by hand.

The card scans and other art become publicly hosted on the Pages site. This was chosen deliberately over drawn faces or a CORS proxy. The README's personal-use note stays.

## Capabilities

### New Capabilities
- `web-deployment`: building and publishing the game as a static site on GitHub Pages, including how card images are served there.

### Modified Capabilities
<!-- none: gameplay and table UI behaviour don't change -->

## Impact

- New: `.github/workflows/deploy.yml`, `scripts/fetch-card-images.ts` (plus an npm script).
- Changed: `vite.config.ts` (`base` from an env var), `src/ui/images.ts`, `src/ui/icons.ts`, `src/ui/Screens.tsx` (base-aware URLs), README.
- CSS `url(/…)` references (table background, fonts) are rewritten by Vite with the base, so they need no change. This is verified in the built CSS.
- The deployed artifact grows by about 40 MB of card scans (about 230 images). That is well inside the Pages limits.
- No new runtime dependencies. The workflow uses `actions/checkout`, `actions/setup-node`, `actions/cache`, `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`.
