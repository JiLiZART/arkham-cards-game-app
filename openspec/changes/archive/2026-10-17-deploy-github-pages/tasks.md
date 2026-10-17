## 1. Sub-path support

- [x] 1.1 `vite.config.ts` reads `base` from `PAGES_BASE` (default `/`). An `asset(path)` helper uses `import.meta.env.BASE_URL` and is used by `cardImage`, `backUrl`, `iconUrl` and the `Screens` portraits; `VITE_CARD_IMAGE_BASE` still overrides cards. Add a guard test that fails on new hard-coded `"/cards|/icons|/table|/fonts` literals in `src/`. Verify with `npm test`, then `PAGES_BASE=/arkham-cards-game-app/ npm run build`: the built JS and CSS reference only `/arkham-cards-game-app/…` asset paths (grep `dist/`).

## 2. Card scans

- [x] 2.1 `scripts/fetch-card-images.ts` and the `fetch:cards` npm script, as in design §2–3: the file list comes from `cardImage` over all content, there are 8 parallel downloads with one retry into a cache directory, files are copied into `<out>/cards/`, failures are listed and the exit code is 0. `.cache/` goes in `.gitignore`. Unit-test the file list (it includes a double-sided card's `b` image and has no duplicates). Verify by running it into a scratch `dist/` and counting the files, about 230.

## 3. Workflow

- [x] 3.1 `.github/workflows/deploy.yml` as in design §4: checks, then the build with `PAGES_BASE`, cached card fetch, Pages artifact and the deploy job. Verify the YAML parses (`npx yaml-lint` or a node YAML parse), and dry-run the build steps locally: `npm ci && npm test && npm run lint && npm run check:content && PAGES_BASE=/arkham-cards-game-app/ npm run build && npm run fetch:cards -- dist`. Then serve `dist/` under `/arkham-cards-game-app/` (`npx vite preview --base /arkham-cards-game-app/` with the proxy off). In the browser, the menu, a started game with scans on the map and the hand load with no failed requests or CORS errors.

## 4. Publish

- [x] 4.1 README: a "Deploying" section with the Pages URL (`https://arkham.artkost.dev`), the custom domain and its Cloudflare `CNAME` record, the one-time "Source: GitHub Actions" setting, manual runs, and that card scans are fetched at deploy time and publicly hosted. Ask the user before changing the repository's Pages settings (`gh api`) and before committing or pushing. Once they agree, push to `main` and watch the run (`gh run watch`). Verify the live site in the browser: the game starts, scans show on the map, and the console and network have no errors.
