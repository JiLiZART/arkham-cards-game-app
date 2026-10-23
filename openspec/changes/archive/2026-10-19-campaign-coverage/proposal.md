## Why

Only Night of the Zealot plays by the rules; the other 35 campaigns are generated from the guides with about 3,400 encounter cards and 1,480 player cards whose text has no behaviour yet. Making them complete is a long program of per-pack changes (cards, scenario scripts, token effects, connections, then moving the campaign out of `content/campaigns-generated/`). Today nothing measures that program: the "Partly implemented" label is the `generated` flag, so it can't move when a pack is finished, and nobody can see how much is left in a campaign or a pack. This change makes completeness a computed, committed number, before the first pack is worked on.

## What Changes

- **Coverage is computed from the content.** For every pack: its encounter cards and player cards, and how many work in the game (the existing `implemented()` test: written abilities or a script, or nothing for the engine to run). For every campaign: the cards its scenarios use (encounter sets, side decks, acts, agendas) and how many work, and which scenarios have their scenario script. A campaign is **complete** when every card its scenarios use works and every scenario has a script.
- **`content/coverage.json`** holds that report, written by `npm run coverage` and committed. It is eager and small, so the new-game screen reads it before any pack loads. `check:content` fails when the file is behind the content, as it does for the README credits.
- **The "Partly implemented" label comes from coverage**, not from `generated`. The campaign picker's rules filter (complete / partly implemented) and the tile badge follow it. The investigator picker's partly-implemented note follows its pack's coverage of that investigator.
- **The sidebar says how far a campaign is**: "n of m cards work", and the scenarios still without a script, for a partly implemented campaign.
- **Night of the Zealot carries the same campaign fields as a generated campaign** (`packs`, `card`, `cards` with each chapter's agenda and act), so a campaign moved out of `content/campaigns-generated/` and the hand-written one have one shape. The fallback that builds `cards` at run time goes.
- **The program is written down**: `docs/campaign-program.md` lists every pack in play order with its counts and its campaign. The steps each pack change takes are: engine features the pack needs; its encounter and player cards; its scenario script; real token effects; connections checked against the guide; a bot playthrough to a resolution; and, for a campaign's last pack, the move to `content/campaigns/`. Coverage reaching 100% is that change's acceptance test.

## Capabilities

### New Capabilities

- `content-coverage`: the coverage report per pack and per campaign, its committed file, the check that keeps it current, and what "complete" means.

### Modified Capabilities

- `campaign-play`: Every official campaign can be played (the partly-implemented note comes from coverage and says how far a campaign is); Campaign tiles (the rules filter and badge follow coverage).

## Impact

- New `src/content/coverage.ts` (pure: pack and campaign coverage from a loaded content db), `scripts/coverage.ts` (`npm run coverage`, writes `content/coverage.json`), schema `ContentCoverage`, loader reads it eagerly.
- `scripts/check-content.ts`: fails on a stale coverage file.
- UI: `src/ui/menu/wizard.ts` (`filterCampaigns` rules from coverage, investigator `partlyImplemented` from coverage), `NewGame.tsx` tile badge, `CampaignSheet.tsx` progress line; strings in English and Russian.
- `content/campaigns/night-of-the-zealot/campaign.json`: `packs`, `card`, `cards`.
- `docs/campaign-program.md`: the per-pack plan.
- No engine or rules change; no save change.
