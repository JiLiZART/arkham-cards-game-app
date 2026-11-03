## Why

War of the Outer Gods (pack `wog`, 58 encounter cards, reference card 86001) is generated but unplayable as printed: its three faction agenda decks collapse into one, the setup starts everyone at Chateau Ramezay instead of Arkham with no faction enemies on the board, its chaos bag is Night of the Zealot's, and none of its 58 cards has behaviour (0 work). It is the side scenario with the largest engine debt (three agendas, Warring, Swarming, wards and mutations), so doing it after the structural engine changes land turns a feature list into one scenario script.

## What Changes

- `side-war-of-the-outer-gods` becomes a hand-written campaign under `content/campaigns/` with one scenario, `war-of-the-outer-gods`, played **Single Group** (ADR-0082): the printed setup (everyone at Arkham 86014; one Cultist of Paradise 86025, one Hierophant of the Swarm 86027 and one Priest of Dying Stars 86029 spawned at their spawn locations; the `children_of_paradise`, `swarm_of_assimilation` and `death_of_stars` sets set aside; Pocket Portal 86052 set aside; Hub Dimension 86024 set aside until act 1b; the encounter deck of the remaining 19 cards), the printed chaos bag on all four difficulties, and the city connections read off the card scans.
- **Three agenda decks at once**: green 86005–86007 → Bringer of Paradise 86040, blue 86002–86004 → Vile Broodmaster 86034, red 86008–86010 → Horrific Shoggoth 86046, each advancing on its own doom, carrying excess doom over, shuffling its faction's set-aside enemies in, adding its symbol token to the bag in standalone play, and the third flipping Hub Dimension. The several-agenda-decks hook comes from `engine-scenario-structure`; the faction rules live in the scenario script.
- **Warring** and faction colour (blue/green/red by encounter set) as scenario-script rules: enemies of warring factions attack each other in the enemy phase; "in the lead" computed from the agendas' doom; the no-resolution ending reads the leading faction instead of asking.
- Every `wog` card works: 3 acts, 12 agendas, 5 assets, 17 enemies, 11 locations, 9 treacheries and the reference card; wards (86016, 86020, 86022) and mutations (86042–86044) as named tokens, swarm cards beneath Insect enemies (Swarming from `engine-generic-keywords`), the Ancient Ones' global health pools (86035, 86041, 86047: `healthPerInvestigator`), Pocket Portal's "not at any location".
- The token table of 86001 real on Easy/Standard (skull −1 per clue; cultist −3 and a mutation on the nearest Mutated enemy on failure; tablet −3 and the top Hex of the encounter discard on failure; elder thing −4 and a committed card beneath an Insect on failure) and Hard/Expert (skull −2 per clue; cultist −4 and a mutation on each Mutated enemy; tablet −4, the Hex always; elder thing −5, every committed card beneath an Insect).
- Resolutions R1–R4 earn their assets (86051–86055, +2 bonus XP on R1); R5–R7 kill every investigator; `none` resolves by the leading faction. Side-story cost 3 XP when a host campaign offers it, nothing standalone.
- Coverage reports `wog` and the scenario complete; the program table ticks the row.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: War of the Outer Gods sets up, plays and resolves as printed, with its own chaos bag and real token effects per difficulty.
- `card-content`: the `wog` pack's cards declared (data where the vocabulary fits, the scenario script otherwise); the Epic Multiplayer reading of "per group" dropped.
- `content-coverage`: the scenario and the pack reported complete; `docs/campaign-program.md` updated.

## Impact

- New `content/campaigns/side-war-of-the-outer-gods/` (campaign.json, flow.json, scenarios/war-of-the-outer-gods.json, scripts/war-of-the-outer-gods.ts); `content/packs/side/cards.json` entries for 86001–86055 and `content/packs/side/scripts/<code>.ts` for the cards that need one; `content/i18n/{en,ru}/ui.json` ability labels and prompts.
- Depends on `engine-scenario-structure` (several agenda decks, flip, cards beneath, named tokens, story cards, "not at any location"), `engine-generic-keywords` (Swarming), `scenario-import-fixes` (side chaos bags, single-group sets), `campaign-flow-compiler-fixes` (the leaked Fortune and Folly checkpoint). No engine change of its own.
- `content/coverage.json` regenerated; `docs/campaign-program.md` `wog` row ticked.
