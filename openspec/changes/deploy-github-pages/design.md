## Context

- Vite 8 single-page app with no routes; `npm run build` runs `tsc --noEmit && vite build` into `dist/`. The repo is `JiLiZART/arkham-cards-game-app` (public), default branch `main`, and has no `.github/` yet.
- Absolute asset paths in JS:
  - `src/ui/images.ts`: `"/cards"` default card base, and `/table/back-*.png`;
  - `src/ui/icons.ts`: `/icons/*.png`;
  - `src/ui/Screens.tsx`: `/cards/<code>.webp` portraits.
- CSS uses `url(/table/…)` and `url(/fonts/…)`; Vite rewrites public-dir URLs in CSS with `base`.
- Card scans: `cdn.arkham.build/optimized/<code>.webp` (about 175 KB each) sends no `Access-Control-Allow-Origin`. The dev and preview servers proxy `/cards/*` to the CDN. `VITE_CARD_IMAGE_BASE` overrides the base.
- Image failures already fall back to drawn faces, both for WebGL textures (`textures.ts`) and for HTML cards (`CardFace` `onError`).
- `src/content/node.ts` (`loadContentFromDisk`) loads every card definition in Node. It is already used by `scripts/check-content.ts` through `tsx`.

## Goals / Non-Goals

**Goals:** a one-file workflow that only publishes green builds; the same code paths in dev and on Pages (`<base>cards/<code>.webp`); no change for local development.

**Non-Goals:**
- A custom domain.
- PR preview deploys.
- Storing card scans in the repository.
- Offline or PWA support.
- Changing the localStorage save key per deploy (saves made on Pages simply persist on that origin).

## Decisions

### 1. Base path from an env var
`vite.config.ts` sets `base: process.env.PAGES_BASE ?? "/"`. The workflow sets `PAGES_BASE=/arkham-cards-game-app/`.

JS paths use `import.meta.env.BASE_URL`:
- one helper `asset(path)` in `images.ts` returns `${BASE_URL}${path}`;
- `cardImage`, `backUrl`, `iconUrl` and the `Screens` portrait use it;
- the card base default becomes `asset("cards")`, and `VITE_CARD_IMAGE_BASE` still wins.

A unit test checks that no `src/**` file outside the helper contains a string literal starting with `"/cards`, `"/icons`, `"/table` or `"/fonts`, so a new hard-coded path fails CI.

*Alternative:* derive the base from `GITHUB_REPOSITORY` inside the config. Rejected: explicit is easier to read and to reuse for a fork.

### 2. Card scans downloaded into `dist/cards` after the build
`scripts/fetch-card-images.ts`, run as `npm run fetch:cards -- <outDir>`:
- loads content with `loadContentFromDisk`;
- collects every card code that `cardImage` would request: the front `<code>`, plus `<code>b` for `doubleSided` cards (cards with an explicit `image` / `backImage` URL are skipped);
- downloads `https://cdn.arkham.build/optimized/<file>.webp` into `<outDir>/cards/<file>.webp`, 8 at a time, with one retry;
- skips files already present.

It reuses `cardImage` itself, so the list can't drift from what the game requests. A failed file is logged and listed at the end with exit code 0, as the spec requires. Files are written to `dist/` after `vite build`, so `public/` and the repo stay free of scans.

*Alternative:* put the scans in `public/cards` before the build. Rejected: it would clash with the dev proxy path and tempt committing them.

### 3. Caching scans between runs
`actions/cache` on a `.cache/cards` directory, keyed on the hash of the content card files: `hashFiles('content/**/cards*.json', 'content/investigators/**')`. The script downloads into the cache directory, then copies into `dist/cards`. A content change re-downloads only the missing files; restore-keys allow a partial hit. `.cache/` goes in `.gitignore`.

### 4. Workflow shape (`.github/workflows/deploy.yml`)
- Triggers: `push` to `main`, `workflow_dispatch`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`.
- Concurrency: group `pages`, `cancel-in-progress: false`. A running publish finishes; a newer queued run replaces older queued ones.
- Job `build` (ubuntu-latest):
  1. checkout;
  2. `setup-node` with Node 22 and an npm cache;
  3. `npm ci`;
  4. `npm test`, `npm run lint`, `npm run check:content`;
  5. `npm run build` with `PAGES_BASE`;
  6. cache restore;
  7. `npm run fetch:cards -- dist`;
  8. `configure-pages`;
  9. `upload-pages-artifact` (path `dist`).
- Job `deploy` (needs `build`, environment `github-pages`, url from the deploy step's output): `actions/deploy-pages`.

Pinned major versions: checkout@v4, setup-node@v4, cache@v4, configure-pages@v5, upload-pages-artifact@v3, deploy-pages@v4.

### 5. Enabling Pages
Pages must use "GitHub Actions" as its source. The README documents this (Settings → Pages → Source). The apply step does it with `gh api -X POST repos/JiLiZART/arkham-cards-game-app/pages -f build_type=workflow`, or `PUT` if a Pages site already exists, after asking the user, since it changes repository settings.

## Risks / Trade-offs

- [Card scans are hosted publicly] → The user chose this. The README's personal-use note stays, and the scans are fetched at deploy time, never committed. Removing them later means one workflow change and a redeploy.
- [CDN rate limits or outages during deploy] → 8 parallel downloads, one retry, cache between runs; missing scans fall back to drawn faces instead of failing the deploy.
- [A missed absolute path breaks a sub-path asset] → The guard test (Decision 1), plus a post-deploy browser check of the live site's network requests.
- [Saves from the dev server don't carry over] → Different origin, which is expected; the hosted site has its own saves.
- [Node version drift] → Node 22 LTS in CI. Locally Node 25 works today, and the scripts use nothing version-specific.

## Migration Plan

1. Merge the workflow and code to `main`.
2. Enable Pages with source "GitHub Actions".
3. The first push, or a manual run, deploys.

Rollback: re-run the workflow on an older commit, or disable Pages.
