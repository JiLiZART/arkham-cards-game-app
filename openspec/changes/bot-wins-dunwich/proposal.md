## Why

`campaign-the-dunwich-legacy` task 11.3 asks the bot (`src/engine/bot.ts`) to play each of the 8 Dunwich scenarios to a printed resolution. The bot now reads the act's objective and wins 6 of them, but no seed of 1–250, Easy included, wins Undimensioned and Unseen or Where Doom Awaits: the first needs every Brood of Yog-Sothoth defeated by the one card that can hurt them (Esoteric Formula, 02254), the second needs 4 clues to enter Sentinel Peak and then clues spent there with Seth Bishop present. The user split this out of 11.3 into its own change, so the campaign can close with the six wins. `campaign-return-to-the-dunwich-legacy` (task 12.2) found the same for its box: the bot ends all 8 Return scenarios with no error but wins only 4; Return to The Essex County Express and Return to Lost in Time and Space were not won on any seed of 1–700 (Standard) or 1–250 (Easy), and the user added them here.

## What Changes

- The bot learns, from card data rather than from the scenario, three things it misses today:
  - **An enemy only one card can hurt** (`onlyAttackableBy`): it gets that card into play (draws or searches for it, plays it, takes it from a teammate's set-aside if the act hands it out) and fights that enemy with it, and it doesn't fight such an enemy without it.
  - **A place that costs clues to enter** (`moveInClues`, Sentinel Peak, The Edge of the Universe): it holds the clues the move needs instead of spending them elsewhere, and counts them when choosing where to investigate.
  - **An objective with a condition beyond clues** (an enemy present, an act action at a location): it waits for the condition instead of spending early.
- Where the data cannot say it, a scenario may carry a small, data-like strategy hint in its scenario file; each hint is named in the design and tested.
- `src/engine/__tests__/dunwichPlaythrough.test.ts` pins a winning seed for Undimensioned and Unseen and for Where Doom Awaits on Standard with an empty campaign log, each with whichever core starter team suits it; `src/engine/__tests__/returnToDunwichPlaythrough.test.ts` does the same for Return to The Essex County Express, Return to Lost in Time and Space, Return to Undimensioned and Unseen and Return to Where Doom Awaits.
- If either still cannot be won on any searched seed, the change closes with what was won and an explanation of what blocks the rest.
- The replay corpus is re-searched and re-recorded if the bot's choices change; Night of the Zealot's bot games keep at least their current resolutions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: the bot plays toward the printed objectives, including enemies only one card can damage and places that cost clues to enter.

## Impact

- `src/engine/bot.ts`; possibly a hint field in `src/content/schema.ts` (scenario) and the two scenario files under `content/campaigns/the-dunwich-legacy/scenarios/`.
- `src/engine/__tests__/dunwichPlaythrough.test.ts`, `src/engine/__tests__/returnToDunwichPlaythrough.test.ts`, `src/engine/replays/corpus/`, `src/engine/replays/coverage.json`.
- `openspec/changes/campaign-the-dunwich-legacy/tasks.md`: 11.3 narrowed to the six wins and the browser run, pointing here.
- No rules change, so no `ENGINE_VERSION` bump.

## Decided (user)

- General strategy read from card data first; a per-scenario hint only where the data cannot express it.
- Any core starter team, on Standard.
- An empty campaign log (Undimensioned and Unseen: 2 Brood in play and 3 set aside; Where Doom Awaits: its default act version).
- If a scenario still cannot be won, report and close.
