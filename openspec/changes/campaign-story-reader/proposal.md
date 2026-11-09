## Why

The campaign guide is read in two places that look nothing alike: the paper campaign screen (`CampaignScreen`, the `flow.shown` story steps and `FlowPrompt`) and the scenario introduction on the table (`IntroOverlay`'s `story` step, after the last mulligan), which carries a rule (`flow.shown.some("story")`) so the prologue isn't read twice. Which one a campaign uses depends on how its flow happens to start: Night of the Zealot's prologue appears only in the overlay, The Forgotten Age's only on paper. Starting a scenario should feel like opening a chapter of the guide, not like switching between a ledger and a dialog box, and the campaign guides' own paintings (the fan CYOA editions in `inspired/AHC_CYOA-main/`) show what that chapter can look like.

## What Changes

- A fullscreen **story reader** opens at the start of each scenario: after the new-game screen for the first one, and from the paper campaign screen's "next scenario" door for the later ones. It fades in from black, shows a painting full-bleed on the left and the text in a column on the right, reveals the text paragraph by paragraph (a tap or key shows the next; "show the whole page" reveals the rest), and closes on Begin with a fade to the table.
- The reader shows what the guide reads before a scenario: on the first scenario, the campaign's opening page (its name and prologue), then the flow's setup steps; on every scenario, the scenario's own setup steps (`flow.before`) and finally a scenario page ("SCENARIO I / THE GATHERING" with the scenario's intro text) ending in Begin.
- Prompts in those steps are answered in the reader: a `chooseOne` as numbered dialog lines (keys 1–4); every other prompt (`investigatorChoice`, `checklist`, `cardChoice`, `counter`, `buySupplies`, `unsupported`) through the existing `FlowPrompt` pieces inside the text column. A prompt the reader can't host (`upgradeDecks`, `sideScenario`) hands over to the paper screen and returns after.
- "Skip to the table" is visible from the first page; it jumps to the next page that asks something, never past it. A scenario restarted after it began (the menu's restart, a save restarted for a new engine version, a rejoined room) does not replay the reader.
- Paragraph pace is local to each screen. Online, a choice or Begin made on another screen is shown as made by that player when the reader reaches it; no new net moves.
- Sound: the `tome` effect on each new page and the `tension` music under the reader, following the sound settings.
- Art in three tiers: a painting from the CYOA editions where the scenario is mapped (Night of the Zealot in this change, through an extraction script and a manifest), else the scenario's first agenda's painting, else the campaign's first scenario's.
- The campaign flow stops at "continue" before a scenario's own setup steps whenever anything was shown since the last answer, so a resolution that only records log entries or experience still ends on the paper screen before the reader opens.
- **BREAKING** (presentation): the scenario introduction on the table loses its story step; it keeps the agenda, the act and the location dealing. The paper campaign screen no longer shows the steps before a scenario; it keeps resolutions, interludes, epilogues, the log, decks and upgrades.

## Capabilities

### New Capabilities

- `story-reader`: the fullscreen reader at the start of each scenario: when it opens and closes, its pages, the paragraph reveal, prompts in it, skipping, restarts, online pacing, sound, the art tiers and the art manifest, layout at desktop and phone sizes, reduced motion.

### Modified Capabilities

- `game-table-ui`: Scenario introduction: the intro text leaves the introduction (it is read in the story reader); the agenda, act and dealing steps stay.
- `campaign-flow`: The next scenario comes from the flow: the flow stops at "continue" before a scenario's own setup steps when anything was shown since the last answer.
- `campaign-play`: Start a campaign: a new campaign opens the story reader before its first scenario is set up.

## Impact

- `src/ui/`: a new `menu/StoryReader/` (or a screen of its own) with its CSS Module; `state/store.ts` (a `reader` screen or a view flag between `log` and `game`; `runNew` and `runStart` route through it); `hud/IntroOverlay/` (story step removed; `game/intro.ts` `INTRO_STEPS`); `menu/CampaignScreen/` (stops before a scenario's setup steps, the "next scenario" door); `menu/FlowPrompt/` (its pieces reused inside the reader); `assets/images.ts` (story art and the agenda-painting crop).
- `src/engine/campaign/flow.ts`: the "continue" boundary before `flow.before`.
- `scripts/import-story-art.ts` / `scripts/importStoryArt.ts` (a sibling of the rulebook extraction: `pdfimages` and ImageMagick to WebP, the white fog keyed to alpha) and its test; `content/art/story.json` (PDF page → scenario, provenance); `public/art/story/night-of-the-zealot/*.webp`.
- `content/i18n/{en,ru}/ui.json`: reader strings (Begin, skip, show page, "chose", "began").
- `.agents/context/DESIGN.md`: the reader as a third material (black, the film gap; the guide's painting is content, an exemption from The Warm Cards Rule).
- No content rule or card changes; no new dependencies (`pdfimages` is already used by `scripts/` asset extraction).
