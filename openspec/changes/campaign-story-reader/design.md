## Context

A scenario's opening is read in two places today (proposal). The campaign flow (ADR-0011) is the source of every page: `CampaignState.flow` holds the queue, the steps `shown` since the last answer, the prompt it `waiting`s at, `next` while a scenario's own setup steps (`CampaignFlow.before`) run, and `item` while an interlude or epilogue is read. `run()` in `src/engine/campaign/flow.ts` stops at "continue" when the queue empties and a story was shown, at a prompt, or at "play". The store (`src/ui/state/store.ts`) moves between screens `log` and `game`: `runNew` starts a campaign and calls `runStart` itself when the flow is already at "play" with nothing shown (Night of the Zealot); `runStart` answers "play" and creates the game. `IntroOverlay` reads the campaign prologue (`campaignBlurb`) and the scenario's `intro` in its `story` step, after the last mulligan.

Art: `scripts/import-art.ts` (with `scripts/importArt.ts` and its test) already extracts rulebook paintings with `pdfimages` into `public/art/` with a manifest in `content/art/art.json`. The CYOA editions in `inspired/AHC_CYOA-main/` (54 PDFs, untracked) carry one 300 dpi painting per scenario page, JPEG with its fog edge bleeding to white page; Night of the Zealot has six.

In-force ADRs this touches: 0002 and 0032 (presentation and the middle of the screen follow the event clock and its stage claims), 0004 (viewing is view state), 0005 (one layout mode), 0011 and 0037 (the flow), 0016 (CSS Modules), 0017 (phone sheets), 0018 and 0020 (online moves), 0030 (one input gate), 0036 (the UI reads the engine through one entry point), 0001 and 0009 (audio). None is superseded by this design.

## Goals / Non-Goals

**Goals:** one place where the guide's text before a scenario is read, at every scenario start, in both languages, on desktop and phone landscape, online and hot-seat; a painting on every page from day one; the paper campaign screen and the table introduction each do one job.

**Non-Goals:** interludes, resolutions and epilogues in the reader (a later change); re-reading pages from the Journal; mapped paintings for campaigns other than Night of the Zealot, and campaign covers (content work, one campaign per change); an "everyone ready" handshake online; any change to what the flow asks or records.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
 +---------------------------------------------------------------------------------------------+
 | src/ui (browser)                                                                            |
 |                                                                                             |
 |  menu/NewGame, Lobby        menu/CampaignScreen (paper)          hud/IntroOverlay            |
 |  +-----------------+        +---------------------------+        +-----------------------+  |
 |  | start campaign  |        | resolution, interlude,    |        | agenda -> act -> deal |  |
 |  +--------+--------+        | log, decks, upgrades      |        | (story step removed)  |  |
 |           |                 | [next scenario] door      |        +-----------^-----------+  |
 |           |                 +-------------+-------------+                    |              |
 |           v                               v                                  |              |
 |  state/store.ts: screen "title".."log" | "reader" | "game"  ---- Begin ------+              |
 |           |                                                                                 |
 |           v                                                                                 |
 |  menu/StoryReader (new)                                                                     |
 |  +---------------------------------------------------------------------------------------+  |
 |  | readerPages(campaign, locale) : pure, campaign state -> pages  (game/readerPages.ts)   |  |
 |  | view state: page index, paragraphs shown, pages kept across answers (useView)          |  |
 |  | Page: painting (storyArt) | title + paragraphs + prompt (FlowPrompt pieces) + Begin    |  |
 |  +---------------------------------------------------------------------------------------+  |
 |           | answerFlow / startScenario (existing store calls, existing net moves)           |
 +-----------|---------------------------------------------------------------------------------+
             v
 src/engine/campaign/flow.ts : run() stops at "continue" before flow.before when anything was shown
 assets/images.ts storyArt(): manifest painting | agenda painting crop | first scenario's
 scripts/import-story-art.ts: CYOA page -> public/art/story/<campaign>/<scenario>.webp (+ content/art/story.json)
```

## Decisions

1. **The reader is a screen, not an overlay.** `screen` gains `"reader"` between `log` and `game`. `runNew` ends on `reader` instead of `log` (or the immediate `runStart`); the campaign screen's door sets `reader`; Begin calls the existing `runStart`. A screen keeps the table unmounted while reading (no event clock, no stage claims to arbitrate, ADR-0032), and the online session already syncs screens through moves, not through screen state. _Alternative:_ an overlay over the paper screen, rejected: two screens' controls under one another, and the overlay would need its own input gating (ADR-0030).

2. **Pages are a pure function of campaign state, kept in view state.** `readerPages(db, campaign, locale)` (in `src/ui/game/`, beside `campaignView.ts`) returns the pages the flow has shown since the reader opened plus the prompt it waits at plus, at "play", the scenario page. Because `flow.shown` resets on every answer, the reader keeps the pages it has already turned in view state (`useView`, ADR-0004), so a choice answered on another screen never removes text from under a reader that hasn't reached it. The opening page is `campaignBlurb(...).prologue` when `history` is empty, as `IntroOverlay` reads it today. The scenario's number is its position among the playable items of `flowOf(...).order`. _Alternative:_ a reader cursor in `CampaignState`, rejected: reading pace is viewing, not deciding, and online it would be a move per paragraph.

3. **Which steps the reader covers, decided from flow state.** The reader handles the flow from the door (or the campaign's start) until "play". The engine change that makes this a clean boundary: `run()` stops at "continue" before queueing `flow.before[id]` (and before offering "play") whenever `shown` is not empty, not only when a story is in it. So a resolution that only recorded entries still ends on paper, and the next scenario's setup steps never appear there. A `waiting` step of kind `upgradeDecks` or `sideScenario` met inside the reader's range sends the screen to `log` for that answer and back to `reader` after. _Alternative:_ a new flow step kind marking reader ranges in `flow.json`, rejected: 37 generated flows to recompile for a boundary the state already shows.

4. **Prompts reuse `FlowPrompt`.** `FlowPrompt` is split so its per-kind bodies (`chooseOne` aside) render inside any container; the reader draws `chooseOne` itself as numbered dialog lines (keys 1–9) and places the others in its text column under a `.reader` scope that switches the paper tokens to the night ones (the same mechanism as the Paper Note Rule, in reverse). One implementation of each prompt's rules. _Alternative:_ redraw each prompt in the reader, rejected: two copies of supply-point and card-choice validation.

5. **Paragraph reveal.** A page's text is split on blank lines after `guideHtml` (blocks such as `<center>` stay whole). Paragraphs enter with opacity and a 12 px rise over 420 ms, exponential ease-out; the painting drifts (scale 1.0 to 1.04 over 20 s); page turns cross-fade through black over 500 ms. Tap, click, Space and Enter reveal; "show the whole page" reveals all; reduced motion shows all at once with no drift or fade (`reducedMotion` from `game/arrivals`). Skip walks the pages to the first that asks something (or the scenario page) and reveals it whole.

6. **Restarts skip the reader.** `runStart` is reached directly (no reader) when the flow is already `playing` (a restart for a new engine version, the menu's restart of a begun scenario, a rejoin), as today. The reader opens only when the flow sits before "play" and the scenario has not begun.

7. **Online.** No new moves: choices are `flow` moves and Begin is `start` (`src/net/moves.ts`). The reader compares the pages it has kept with the campaign state it receives: a prompt it has not reached that the flow has since answered shows, when reached, as answered by the mover (the session records who made each move), read-only. A `start` received while reading shows "began the scenario" on the current page and leaves the reader open until this player turns the page or skips; then the table, already set up, appears.

8. **Art tiers.** `storyArt(db, campaign, scenarioId)` in `assets/images.ts` returns, in order: `art/story/<campaign>/<scenario>.webp` when the manifest maps it; the painting of the scenario's first agenda, cropped from its scan with a CSS crop (agenda and act fronts share a layout; the painting is the upper half); the campaign's first scenario's choice of the same two. A sibling script, `import-story-art.ts`, takes a hand-written list (`{ pdf, page, crop?, erase?, fade?, campaign, scenario }` per painting): a guide page's picture is several JPEG slices that carry the page's own number and heading, so it stacks them, crops to the painting, paints out a page number in the fog, keys the white connected to the border to alpha (9 % tolerance, from every corner, so a highlight inside the painting stays), fades a cut bottom edge into the black, and writes WebP at 1400 px. `content/art/story.json` (not `art.json`, which the rulebook script rewrites whole) records the PDF and page as provenance. The agenda's painting is the left 38.5 % of its scan (checked on one agenda from each of nine cycles), read from the CDN for the sets the game does not host.

9. **Sound.** On opening the reader the `tension` music fades in over 1.5 s; each page plays `tome`; Begin fades the music out over 1 s. Through the existing sound layer and settings (ADR-0001, ADR-0009); no new files.

10. **Material.** The reader is black (`--abyss` deepened to near black at the edges), the painting full-bleed with its fog on black, the title in Prata capitals over one ironwork rule with curls (the Ironwork Rule), the text in EB Garamond 20 px bone ink, names in Teutonic. Begin is the screen's one teal enamel plate. `.agents/context/DESIGN.md` gains the reader as a third material and records that the guide's painting is content, exempt from The Warm Cards Rule like card scans.

## Risks / Trade-offs

- [Agenda crops vary across cycles] -> one crop rule tested on an agenda from each cycle; a scenario with a bad crop is the first to get a mapped painting.
- [White keying eats light areas inside a painting] -> only white connected to the border is keyed; each mapped painting is looked at once when added.
- [Online readers drift apart] -> accepted, as agreed: no waiting for others; the "began" line tells the slow reader why the table exists.
- [Long generated prologues] -> paragraph reveal plus "show the whole page" plus skip; the column scrolls on phones.
- [A flow that asks `upgradeDecks` inside the reader's range] -> handed to the paper screen and back (Decision 3). Two generated flows do (The Innsmouth Conspiracy's "The Vanishing of Elina Harper" and The Scarlet Keys' "Marrakesh", both a deck upgrade at the scenario's start); a test pins the list so a new one is noticed.
- [The extra "continue" stop] -> one more tap after a resolution that showed only records; it is the door the player asked for.

## Migration Plan

UI and one flow-interpreter change in one change. A campaign saved on the paper screen before the next scenario opens the reader through the door after the update; a campaign saved mid-scenario is unaffected. The new "continue" stop changes no saved state shape; `CampaignState.version` is unchanged. Rollback: revert; no content depends on the reader (the manifest's `story` entries are ignored by older code).

## Open Questions

- Where exactly the agenda painting sits on fronts from the newest cycles (The Drowned City) is measured during implementation.
- Whether the first scenario's opening page should also show the campaign's epigraph from the CYOA cover pages when the guide has none (later content change).
