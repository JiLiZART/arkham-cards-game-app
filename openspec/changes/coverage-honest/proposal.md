## Why

The coverage report (ADR-0012) misreports both ways. Night of the Zealot shows "partly implemented" over five cards whose behaviour is already in data (`prey`, `investigateSkill`). Meanwhile no scenario's chaos token effects are measured: the 144 generated scenarios hold placeholder modifiers with no effects, and Night of the Zealot has no Hard or Expert tokens at all, so on Hard a revealed skull does nothing. A campaign box (220 to 270 encounter cards) also sits in the program as one row, four times the size the program allows. The measure has to tell the truth before the first pack change is judged by it.

## What Changes

- **A card works when every printed line is accounted for.** `implemented()` keeps its per-line pass and learns more line kinds, each struck only when the field that runs it is set: `Prey - …` needs `prey`, "investigated using [x] instead" needs `investigateSkill`, `Uses (n …)` needs `uses`, "Max n committed per skill test" needs `maxCommitted`, and so on for the CardDef fields the engine acts on. A line with no field behind it keeps the card not working.
- **A scenario reference card works when its token lines are real.** Each symbol token line on the front (Easy/Standard) and back (Hard/Expert) is covered when that difficulty's token entry exists and carries what the line asks for: the modifier, `x` for "-X", `onFail` for "If you fail", `onReveal` or a condition for an effect on reveal, `revealAnother` for "reveal another token". Reference cards count again in pack and campaign coverage (the campaign-coverage design left them out), so the real-token-effects step of a pack change gets its acceptance test.
- **Per-scenario coverage.** `content/coverage.json` gains a top-level `scenarios` map: per scenario its campaign, the cards it uses (with its reference card) and how many work, whether its tokens are real, whether it has a scenario script, and `complete`. A campaign is complete when all its scenarios are.
- **Night of the Zealot is complete, honestly.** Its three scenarios get their Hard and Expert token effects from the backs of their reference cards. Two token effects the effect language can't express are added to the engine: searching the encounter deck and discard pile for an enemy with a trait and drawing it (the testing investigator draws, the deck is shuffled), and revealing another token when a condition holds ("if there are no Cultist enemies in play"), with a condition for an enemy being in play. Placing doom on the nearest enemy already exists.
- **The program is worked one scenario at a time where a pack is large.** `docs/campaign-program.md` gets its counts from the new report, and the campaign boxes (Edge of the Earth, The Scarlet Keys, The Feast of Hemlock Vale, The Drowned City) list one row per scenario. Its test covers those rows.
- No UI change: the tile badge, the rules filter and the sidebar's "n of m cards work" already read coverage, and their numbers follow it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-coverage`: what "works" means (every printed line accounted for, reference cards by their token lines), the per-scenario report, a campaign complete when its scenarios are, the program listing campaign boxes per scenario. (This spec arrives with `campaign-coverage`, which is archived first.)
- `game-engine`: Chaos bag: every scenario defines its token effects for all four difficulties; a token effect can search the encounter deck and discard pile for an enemy and have the testing investigator draw it.

## Impact

- `src/content/implemented.ts`: the line-to-field table, reference-card token lines.
- `src/content/coverage.ts`, schema `ContentCoverage` (`scenarios`), `content/coverage.json` regenerated; `check:content` unchanged in shape.
- `src/content/schema.ts`, `src/engine/effects` and `src/engine/rules/skillTest.ts`: the search-and-draw effect op, a conditional reveal-another, an enemy-in-play condition.
- `content/campaigns/night-of-the-zealot/scenarios/*.json`: Hard and Expert tokens.
- `docs/campaign-program.md` and its test.
- New ADR-0013 (a card works when every printed line is accounted for), amending ADR-0012.
- No save change; the numbers on the new-game screen move.
