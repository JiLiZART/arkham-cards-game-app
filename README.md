# Arkham Table

A browser version of *Arkham Horror: The Card Game* on a 3D table (React + react-three-fiber), with a rules engine in plain TypeScript. 1–4 investigators play hot-seat on one device. It ships the **Night of the Zealot** campaign and starter decks for the five core investigators.

Fan project for personal use. Card text comes from ArkhamDB and card images from arkham.build. The game is © Fantasy Flight Games.

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # engine, content and UI-logic tests
npm run check:content  # validate every file under content/
npm run build
```

Card images are loaded from `https://cdn.arkham.build/optimized/<code>.webp`. That CDN sends no CORS headers, so the dev and preview servers proxy `/cards/*` to it (see `vite.config.ts`). The GitHub Pages build downloads the scans into the site instead (see Deploying). On another host, set up the same rewrite, or set `VITE_CARD_IMAGE_BASE` to a CORS-enabled mirror. When an image cannot load, the card is drawn from its data instead.

Icons come from the ArkhamCards icon fonts in `inspired/ArkhamCards` (`arkhamicons`, `arkhamslim` for small and inline icons, `tokens` for chaos tokens, `blood` and `standalone` for later sets). Only art the fonts don't have is a PNG: the physical damage, horror, clue, doom and resource tokens, the lead token, the chaos bag and the connector plaques (from `inspired/icons`, cut out along the hand-made transparent copies in `inspired/icons/transparent`). The card backs come from ArkhamCards too, and the framed table background from `inspired/icons`; the card fonts are Teutonic, Teutonic RU and Alegreya. `scripts/extract-assets.sh` copies all of these into `public/icons`, `public/table` and `public/fonts`, and writes the glyph map `src/ui/glyphs.generated.json` from the fonts' IcoMoon configs; it needs ImageMagick and node. The copies are committed, so builds never read `inspired/`. Like the card scans, the art, fonts and imported text are for personal use.

## Deploying

Every push to `main` deploys the game to GitHub Pages at **https://arkham.artkost.dev** (`.github/workflows/deploy.yml`). The workflow runs the tests, lint and content check, builds, and then publishes. A failing check publishes nothing and the site keeps the previous version. To deploy without a push, use Actions → "Deploy to GitHub Pages" → Run workflow.

- **One-time setup:**
  - Settings → Pages: Source "GitHub Actions", custom domain `arkham.artkost.dev`, Enforce HTTPS.
  - In Cloudflare DNS for `artkost.dev`: a `CNAME` record `arkham` → `jilizart.github.io`, proxy off (DNS only), so GitHub can issue the certificate.
- **Why a subdomain:** the account's user site has the custom domain `artkost.dev`, so `jilizart.github.io/<repo>/` redirects to `artkost.dev/<repo>/`, which Cloudflare serves as the portfolio. Without a custom domain, the game would live at `/<repo>/`: build with `PAGES_BASE=/arkham-cards-game-app/`, and every asset path follows (see below).
- **Card scans:** `npm run fetch:cards -- dist` downloads every scan the game uses (about 230 files, 46 MB) into `dist/cards`, so the map's WebGL cards load them from the same origin. They are cached in `.cache/cards` and never committed. A scan that can't be downloaded is listed in the log and that card shows its drawn face. The scans are publicly hosted on the Pages site.
- **Trying a deploy build locally:** `npm run build && npm run fetch:cards -- dist && npx vite preview`, then open http://localhost:4173/. Add `PAGES_BASE=/some-path/` to both commands to check a sub-path build.
- In code, files under `public/` are referenced with `asset("…")` from `src/ui/images.ts`, never with a leading `/`; a test enforces this.

## Layout

```
content/                         game data — no engine changes needed to add more
  packs/core/cards.generated.json  imported from ArkhamDB (never edit by hand)
  packs/core/cards.json            hand-written behavior & fixes, merged over the generated data by card code
  packs/core/scripts/<code>.ts     TS for cards the data format can't express
  investigators/<code>.json        deckbuilding rules, signature cards
  decks/<id>.json                  deck lists
  campaigns/<id>/campaign.json     scenario order, chaos bags, campaign-log labels
  campaigns/<id>/scenarios/*.json  setup, connections, map layout, chaos token effects, resolutions
  campaigns/<id>/scripts/<scenario>.ts  objectives and scenario-specific hooks
  i18n/<locale>/{ui,cards,campaigns}.json            hand-written translations (English is the fallback)
  i18n/<locale>/*.generated.json   imported translations; the hand-written files win field by field
scripts/import-cards.ts          ArkhamDB → cards.generated.json
src/engine/                      rules engine (no React/three imports — enforced by ESLint)
src/content/                     zod schemas, loader, i18n
src/ui/                          React HUD + R3F table
```

## Adding cards

1. Import a pack: `npm run import:cards -- --pack <pack_code>` (add the code prefix in `scripts/import-cards.ts` if needed). This only rewrites `cards.generated.json`.
2. Describe behavior in `content/packs/<pack>/cards.json`:

   ```json
   "01088": { "abilities": [{ "kind": "onPlay", "effects": [{ "op": "gainResources", "amount": 3 }] }] }
   ```

   Ability kinds are `action`, `fast`, `reaction`, `forced`, `constant`, `revelation` (also an act's or agenda's back side), `onPlay` (also a skill card's effect when committed), and `elderSign`. Effects, conditions, triggers and modifiers form a closed vocabulary defined in `src/content/schema.ts`. Unknown names fail validation.
3. If something can't be expressed this way, set `"script": true` and add `scripts/<code>.ts` exporting a `CardScript`. Copy any existing script as a starting point.
4. Run `npm run check:content`.

## Translations

Translations are imported, not typed in:

```bash
npm run import:i18n -- --locale ru               # campaign/scenario names, intros, resolutions, log labels,
                                                 # encounter sets and matching UI labels from inspired/ArkhamCards
npm run import:cards -- --pack core --locale ru  # card names, traits and text from ru.arkhamdb.com
```

Both write only `content/i18n/<locale>/*.generated.json`. Fix a string by putting it in the hand-written `ui.json`, `cards.json` or `campaigns.json` next to them; re-running an import never touches those. Campaigns and scenarios name their ArkhamCards counterpart with `i18nId`. If ArkhamDB is unreachable, the card import exits with an error and keeps the old file.

## Adding a campaign

Create `content/campaigns/<id>/` with a `campaign.json`, one JSON file per scenario and, if needed, `scripts/<scenario>.ts`. Use Night of the Zealot as the template. The menu picks it up automatically.

ArkhamDB has no location connection data, so each scenario file lists its `connections` as code pairs (and any one-way ones as `oneWay: [from, to]` pairs) and its `layout` as grid positions.

## Playing

- **The map:** drag empty table (or any card) to pan, scroll or pinch to zoom. The camera starts on the deciding investigator's location and follows the decision; **Focus** brings it back, **Whole map** zooms out to every location. On your turn, drag your portrait onto a highlighted location to move.
- **Cards:** hover any card to see it twice as large with a details column beside it (enemies list their fight, health, evade, attack and the damage on them); click it to use it (several options open a menu). Your assets, threat area and engaged enemies are in the strip above your hand, where each card's actions sit on it as buttons: **Fight** and **Evade** on an engaged enemy, an asset's ability on the asset. The act and agenda (top left) open both sides when clicked; the chaos bag (top right) lists its tokens.
- **Hand:** move the pointer along the fan and it magnifies like the macOS Dock: the card under the pointer rises most, its neighbours a little. A column beside the raised card lists its class, type, level, cost, traits, slots, skill icons and text.
- **Card animations:** every card travels to where it lands. A card you draw rises from your deck, turns over, is shown for a moment above your hand and then slides into the fan (the opening hand flies straight in). Played cards fly from the fan to your play area, cards from the encounter deck glide onto the map from the middle of the screen, and new locations from the act panel. Other investigators' draws fly face down to their token. With the system's reduced-motion setting, cards just appear.
- **Locations:** clues lie on them as a pile of clue tokens with the total. Hover one to see its shroud, clues, victory points, connections, who is there and its text beside it.
- **Feed:** what everyone (and the game) does appears under the chaos bag, newest on top, and fades out after a while; each action also rises from whoever did it and stays a few seconds, longer for long sentences. A new phase shows as a chapter title across the middle of the screen, like a film's, with the round under it. **Journal** (top bar) shows the whole history there, scrollable; click a card thumbnail to open the card, Escape closes it.
- **Skill tests:** the panel at the top shows the value part by part (skill + committed icons + other bonuses) against the difficulty. Changed your mind about a committed card? Click it in the panel to take it back into your hand, until you press Done. When the bag appears, the card being tested (the enemy, location or treachery) is shown beside it with the numbers; the bag waits until every card on screen has landed. Click a white circle above the bag to draw a chaos token, then read the calculation and press Continue. The token is decided by the game's seeded draw, so the circle you pick doesn't change it. Turn this off in the menu with "Draw chaos tokens by hand".

## Debugging

The **Debug** panel shows the seed and state, and has these buttons:

- **Bot** answers choices automatically.
- **Download** saves the action log.
- **Load** replays a saved log; games are deterministic, so a log reproduces a game exactly, which makes it useful for bug reports.

In dev builds, the store is also available as `window.__arkham`.
