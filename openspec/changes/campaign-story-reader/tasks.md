## 1. The flow's door before a scenario

- [x] 1.1 Failing test first (`src/engine/campaign/__tests__/flow.test.ts`): a resolution that only records an entry and experience stops at "continue" before the next scenario's `flow.before` steps run; a resolution that showed nothing goes on as today; then the stop in `run()` (`src/engine/campaign/flow.ts`).
- [x] 1.2 `scripts/flowCensus.test.ts` and `src/engine/campaign/__tests__/flowWalk.test.ts` pass over every generated flow; a test walks every flow and lists any `upgradeDecks` or `sideScenario` step reachable between the door and "play" (expected: only The Innsmouth Conspiracy's Elina Harper and The Scarlet Keys' Marrakesh, which the reader hands to the paper screen).

## 2. Pages from campaign state

- [x] 2.1 Failing test first (`src/ui/game/readerPages.test.ts`): `readerPages(db, campaign, locale)` for a new Night of the Zealot campaign gives the opening page (prologue) and The Gathering's page ("Scenario I", its intro, Begin); for The Forgotten Age it gives the prologue story, the supply-point prompt and The Untamed Wilds' page; for The Midnight Masks after the door, its own pages only; Russian texts in `ru`.
- [x] 2.2 Paragraph split after `guideHtml`, keeping blocks such as `<center>` whole; test with the markup scenario of the story-reader spec.
- [x] 2.3 Kept pages in view state (`src/ui/state/view.ts`): pages turned survive an answer that resets `flow.shown`; a prompt answered elsewhere is marked answered with its mover; tests.

## 3. The reader screen

- [x] 3.1 `screen: "reader"` in `src/ui/state/store.ts`: `runNew` ends on it (never straight into `runStart`), the campaign screen's next-scenario door opens it, Begin calls `runStart`; a flow already `playing` (restart, rejoin, engine-version restart) goes to the table without it; store tests.
- [x] 3.2 `src/ui/menu/StoryReader/` (component, CSS Module, `index.ts`): black ground, painting left with drift, title in Prata over an ironwork rule, paragraphs revealed by tap/click/Space/Enter, "show the whole page", "Skip to the table" (to the next page that asks, else Begin), cross-fade through black between pages, reduced motion.
- [x] 3.3 Prompts: `chooseOne` as numbered dialog lines (keys 1–9); `FlowPrompt` split so its other bodies render in the reader's column under a `.reader` token scope; `upgradeDecks` / `sideScenario` hand over to the campaign screen and return.
- [x] 3.4 Online: answered-by and "began the scenario" lines from the move log's mover (`src/ui/state/online.ts`); session test with two players reading at different pages.
- [x] 3.5 Sound: `tension` fades in with the reader and out on Begin, `tome` per page, through the sound layer; muted test.
- [x] 3.6 Strings in `content/i18n/{en,ru}/ui.json`: Begin, skip, show page, "Scenario {n}", "{name} chose", "{name} began the scenario".

## 4. The table introduction and the paper screen

- [x] 4.1 `IntroOverlay` loses its `story` step (`src/ui/game/intro.ts` `INTRO_STEPS`, the prologue rule); tests for agenda, act, deal unchanged.
- [x] 4.2 `CampaignScreen` no longer shows a scenario's own setup steps; it ends at the door; `campaignView` tests.

## 5. Paintings

- [x] 5.1 `scripts/importStoryArt.ts` and `scripts/import-story-art.ts`: a source list (pdf, page, crop, campaign, scenario) and white-margin keying (border-connected near-white to alpha), WebP at 1400 px; unit tests, one on a synthetic image.
- [x] 5.2 Map Night of the Zealot's paintings (The Gathering, The Midnight Masks, The Devourer Below; the opening page shows The Gathering's) and run the script; output under `public/art/story/night-of-the-zealot/`, provenance in `content/art/story.json`; look at each painting on black.
- [x] 5.3 `storyArt()` in `src/ui/assets/images.ts`: manifest painting, else the first agenda's painting crop, else the first scenario's; tests; the agenda crop checked on one agenda per cycle in the browser.

## 6. Design system and verification

- [x] 6.1 `.agents/context/DESIGN.md`: the reader as a third material; the guide's painting exempt from The Warm Cards Rule.
- [x] 6.2 Browser check (Playwright, own dev server): new Night of the Zealot and The Forgotten Age campaigns at 1600×900 and 852×393 in English and Russian; a scenario restart; screenshots under `.playwright-mcp/`.
- [x] 6.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm check:content`; `openspec validate campaign-story-reader --type change --strict`.
