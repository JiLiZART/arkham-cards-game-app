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

Card images are loaded from `https://cdn.arkham.build/optimized/<code>.webp`. That CDN sends no CORS headers, so the dev and preview servers proxy `/cards/*` to it (see `vite.config.ts`). In production, set up the same rewrite on your host, or set `VITE_CARD_IMAGE_BASE` to a CORS-enabled mirror. When an image cannot load, the card is drawn from its data instead.

Icons, token art, the chaos bag, connector plaques and the framed table background come from `inspired/icons`. The icon fonts (`arkhamicons`, `tokens`) and card fonts (Teutonic, Teutonic RU, Alegreya) come from the ArkhamCards app in `inspired/ArkhamCards`. `scripts/extract-assets.sh` copies them into `public/icons`, `public/table` and `public/fonts`, and writes the glyph map `src/ui/glyphs.generated.json` from the fonts' IcoMoon configs; it needs ImageMagick and node. The copies are committed, so builds never read `inspired/`. Like the card scans, the art, fonts and imported text are for personal use.

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

## Debugging

The **Debug** panel shows the seed and state, and has these buttons:

- **Bot** answers choices automatically.
- **Download** saves the action log.
- **Load** replays a saved log; games are deterministic, so a log reproduces a game exactly, which makes it useful for bug reports.

In dev builds, the store is also available as `window.__arkham`.
