## Why

The Forgotten Age is generated but unplayable: its 10 scenarios (Turn Back Time included) use 286 cards of which 34 work, all core-set reuse; no scenario has real token effects or a script; every generated setup is wrong (no exploration deck anywhere, wrong start locations in Heart of the Elders 1 and The Depths of Yoth, both faces of Mouth of K'n-yan in play, Threads of Fate with one act deck of three, Turn Back Time with Eztli's acts), and 27 flow steps are unsupported, 20 of them supplies (report `tfa.md`, sections 1, 3, 4). With `engine-tfa-supplies-vengeance-exploration` and the foundations in place, the campaign is the first that explores, buys supplies and counts Yig's Fury.

## What Changes

- **The campaign becomes hand-written.** `content/campaigns-generated/the-forgotten-age/` moves to `content/campaigns/the-forgotten-age/` (`generated: false`): `campaign.json`, `flow.json`, 10 scenario files and `scripts/<scenario-id>.ts`, laid out as Night of the Zealot. The importer skips it (program step 7).
- **Every scenario plays as printed**, in play order: The Untamed Wilds, The Doom of Eztli, Threads of Fate, The Boundary Beyond, Heart of the Elders Part 1 and Part 2, The City of Archives, The Depths of Yoth, Shattered Aeons, and Turn Back Time after the epilogue. Per scenario: the setup from the campaign guide (exploration decks, set-asides by copy, random picks, the conditional encounter sets of The Boundary Beyond and Shattered Aeons, the partial Midnight Masks set of Threads of Fate, starts by log and by choice), the chaos token table of all four difficulties from the printed scenario card (04043, 04054, 04113, 04161, 04205, 04237, 04277, 04314, 04344), connections from the guide's placement maps (Threads of Fate p.93, The Boundary Beyond p.120) and the card scans' symbols elsewhere, a scenario script, and resolutions that end where the guide says.
- **Every encounter card the 10 scenarios use works**: the 239 non-core cards of the tfa, tof, tbb, hote, tcoa, tdoy and sha encounter sets (shared sets once: Agents of Yig, Expedition, Guardians of Time, Poison, Rainforest, Serpents, Ruins, Traps, Yig's Venom, Temporal Flux, Pnakotic Brotherhood), in data in `content/packs/tfa/cards.json` where the vocabulary fits and in `content/packs/tfa/scripts/<code>.ts` otherwise. The neutral story assets and relics coverage counts on the player side (04051 Alejandro Vela, 04061, 04191, 04303, 04343 Relic of Ages, 04147 Ichtaca, 04148 Expedition Journal, 04244 Body of a Yithian, 04256 The Custodian) are done here, in their scenario's group, not in `player-cards-tfa`.
- **Vocabulary this campaign needs that no other change owns**, added in the first scenario group that needs it: `eachInvestigator` group effects with a per-investigator choice (04082, 04087, 04092, 04101, 04341); max-hand-size modifiers (04239, 04240, 04243, 04252); `cannotMove`, `cannotDisengage` and "cannot be defeated" flags; a test whose difficulty drops per failure (04089); stat modifiers per vengeance, per doom on self and per clue on a location (04083, 04085, 04095, 04337); keyword gain under a condition (04084, 04187, 04257, 04258); "the enemy attacks each investigator at connecting locations" (04086); the pursuit area and depth level of The Depths of Yoth as a scenario script over set-aside enemies and the named counter; Body of a Yithian (the investigator card replaced, deck and name kept); the Harbinger's damage carried in the log as a count entry; a replay counter for The Doom of Eztli's doom on the Entryway; pillar tokens as resources on Mouth of K'n-yan.
- **The flow is corrected by hand** in the moved `flow.json`: the prologue's expedition leader, the supply point and the resupply as `buySupplies`; Interludes I–V's checks and cross-offs as the engine's supply steps; Yig's Fury from the scenario record; the Harbinger's damage from the record; "the jungle watches" from the victory display; Interlude IV's mishap tokens as a flow chaos draw; the Depths' "all killed" check from the scenario; Eztli's and Heart of the Elders 1's replays; the epilogue into Turn Back Time; the Dark Cult / Agents of Yig token counts read from the campaign bag.
- **Coverage**: `the-forgotten-age` and each of its 10 scenarios reported complete; `docs/campaign-program.md` rows tfa, tof, tbb, hote, tcoa, tdoy, sha at 0 encounter cards left (player columns stay for `player-cards-tfa`).
- `ENGINE_VERSION` bump: a saved scenario in progress restarts, campaign logs kept.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: The Forgotten Age playable to every resolution (setups, token tables, connections, flow) as a hand-written campaign.
- `campaign-flow`: the five interludes and the supply point as engine steps; the campaign bag read for conditional sets.
- `card-content`: the vocabulary above; every card of the 10 scenarios declared.
- `content-coverage`: the campaign and its scenarios complete.

## Impact

- `content/campaigns/the-forgotten-age/` (moved: `campaign.json`, `flow.json`, `scenarios/*.json`, `scripts/*.ts`), `content/campaigns-generated/the-forgotten-age/` (removed), `scripts/import-campaigns.ts` (skips it).
- `content/packs/tfa/cards.json` (239 encounter cards, 9 story assets), `content/packs/tfa/scripts/<code>.ts` (about 110), `content/i18n/{en,ru}/ui.json` (ability labels, prompt keys, the remembered flags of The City of Archives).
- `src/content/schema.ts`, `src/engine/effects/` (new ops), `src/engine/rules/enemies.ts` (connecting-location attacks, keyword gain), `rules/investigators.ts` (hand size modifiers, Body of a Yithian), `world/flags.ts`, `src/engine/campaign/flow.ts` (the chaos draw step, the replay counter).
- `content/coverage.json`, `docs/campaign-program.md`; `ENGINE_VERSION`.
- Depends on: `engine-tfa-supplies-vengeance-exploration`, `engine-scenario-structure` (several act decks, act backs that flip into locations, assets and enemies, story cards, location stacking, locations in the encounter deck, random setup ops, conditional token modifiers), `engine-location-instances-grid`, `engine-bless-curse` (seal, for Pnakotus 04334 and Valusia 04335), `engine-script-registry`, `campaign-flow-compiler-fixes`, `scenario-import-fixes` (set-aside copies, the vengeance field, the Mouth of K'n-yan double face, Wilds' missing act 04049, conditional sets). Followed by `campaign-return-to-the-forgotten-age`, `campaign-side-relics-of-the-past`, `campaign-side-bad-blood`; `player-cards-tfa` runs in parallel after group 1 lands.

## Decided (assumed)

Grill-me run against the report, the guide and the code; the user was not available.

- Hand-written move at the start: every generated scenario file is wrong on setup, and the importer would overwrite fixes.
- Scenario scripts are the campaign's, card scripts the pack's; a card used by several scenarios has one script.
- Connection symbols are transcribed per card into `cards.json` (`symbol`, `connectsTo`, ADR-0052) in the group of the first scenario that uses the card; the guide's two placement maps are checked against them.
- The Depths of Yoth's pursuit area is the set-aside zone with a `pursuit` flag on the enemies, and the depth level the engine's named counter; no new zone.
- The Doom of Eztli's Resolution 4 replay counts its replays in a log count (`eztli_replays`) and places that much doom on the Entryway.
- Turn Back Time is reached only through the epilogue (`nextScenario`), as generated; it is in the campaign's scenario list for coverage but not in `order`.
- The expedition leader (Ursula, Leo or Monterey Jack) is a flow choice recorded as the lead investigator for Scenarios I and II.

## Decided (user)

- **Threads of Fate's placement map (guide p.93) and the cards agree on every link but one to check.** The map draws Curiositie Shoppe–Northside, Northside–Downtown, Downtown–Easttown, Easttown–Velma's Diner, Northside–Miskatonic University, Miskatonic University–Rivertown and Easttown–Rivertown, all two-way, no one-way arrow; the new locations' own text adds Town Hall–Downtown, Arkham Police Station–Easttown and Train Tracks–Northside. The map's Miskatonic–Rivertown link is not on the core cards as Night of the Zealot has them (Miskatonic connects to Southside, which Threads leaves out); the scans of 01129 and 01125 decide, and the printed card wins over the suggested placement.
- **The Boundary Beyond's placement map (guide p.120)** is the six Present-Day locations in a ring with a spine: yellow circle–purple star, yellow circle–green diamond, blue triangle–purple star, purple star–green diamond, green diamond–red square, orange heart–purple star, orange heart–green diamond; all two-way, `oneWay` empty. Which card carries which symbol comes from the scans. Tenochtitlán locations take the place of the Present-Day location with the matching symbol (location stacking from `engine-scenario-structure`).
- **No other scenario has a placement map**: the jungle, Eztli, K'n-yan, Yoth and the Otherworld are explored, so their connections are the printed symbols transcribed from the scans (ADR-0052); The City of Archives has a placement map after all (pp. 177 and 181, image pages the text search missed): one Hall of Pnakotus at the centre linked to each of the three Interview Rooms and to the other two Halls, those two Halls linked to each other, every link two-way. It replaces ArkhamCards' layout (Halls in a row, rooms in a column); the scans decide which Hall is which symbol.
- **The fan-made content of the re-typeset guide is out of scope.**

## Settled from the sources

- Turn Back Time's reference card (04344) prints only skull and elder thing lines, on both sides (checked in `cards.generated.json`). A cultist or tablet token in the bag resolves as a plain 0 modifier.
- The City of Archives: the setup pages (cooperated p. 176, resisted p. 180) match ArkhamCards, and the placement map (pp. 177/181) sets the connections; see the decision above.
