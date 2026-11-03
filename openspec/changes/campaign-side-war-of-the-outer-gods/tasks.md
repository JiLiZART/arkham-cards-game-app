## 1. War of the Outer Gods (86001)

- [ ] 1.1 Failing test first (`src/engine/__tests__/` with `testkit.start("war-of-the-outer-gods", …)`): setup asserts every investigator at Arkham 86014, 86025/86027/86029 at their spawn locations, three face-up agendas 86005/86002/86008, Hub Dimension 86024 and Pocket Portal 86052 set aside, no faction-set card in the encounter deck (19 cards). Then write `content/campaigns/side-war-of-the-outer-gods/campaign.json` (packs `core`, `side`; the four printed bags from `inspect/sides.md` §3, cultist/tablet/elder thing absent at start), `scenarios/war-of-the-outer-gods.json` (sets `war_of_the_outer_gods`, `children_of_paradise`, `swarm_of_assimilation`, `death_of_stars`; `agendaDecks` green/blue/red; acts 86011–86013; set-asides), delete the generated folder.
- [ ] 1.2 Token table: test each symbol on Easy/Standard and Hard/Expert (skull −1/−2 per clue, cultist mutation nearest/each, tablet Hex on fail/always, elder thing one/all committed beneath an Insect); write `tokens` for the four difficulties; `tokensReal` true.
- [ ] 1.3 Scenario script `scripts/war-of-the-outer-gods.ts`: per-deck advance (carry-over doom, shuffle the faction set in, standalone symbol token, Hub flip on the third), `leadingFaction`, Warring enemy-phase attacks, the no-resolution pick; tests for one advance, the third advance, two warring enemies, and `none` → the leading faction's resolution.
- [ ] 1.4 Agendas and acts: 86002–86010 backs, 86034/86040/86046 Ancient One agendas, 86011 (doom on player cards copied to an agenda), 86012/86013 (clues around Hub Dimension beneath the act); test per card.
- [ ] 1.5 Locations 86014–86024 in `content/packs/side/cards.json`: resource-cost moves, test-for-clue actions, wards on 86016/86020/86022, Hub Dimension 86024 double-sided connected to the Ritual Sites; tests for a ward spend and a Hub flip.
- [ ] 1.6 Enemies 86025–86029, 86037–86038a, 86042–86050: faction tags and Warring, mutations (86042–86044), Swarming hosts 86048–86050, Ancient Ones 86035/86041/86047 with `healthPerInvestigator` and mythos-end effects, Inescapable Maw 86036 ("decide" twice); tests for a mutation placed, a swarm host, an Ancient One's health at 2 players.
- [ ] 1.7 Treacheries 86026, 86028, 86030–86033, 86039: Predator's Call attaches to the nearest green enemy, Ravages of War runs the enemy phase now, While They Sleep counts factions; tests.
- [ ] 1.8 Assets 86051–86055: Cloak's engage reaction, Pocket Portal (investigator not at any location), 86053–86055 (cards beneath Enchanted Skull 86055); tests; mark them earnable in the flow.
- [ ] 1.9 Connections and layout from the card scans (`inspired/`): Hub to 86014/86016/86020/86022; Arkham to the three cities; Streets hubs; `oneWay` where printed; a test asserting the neighbour list; `layout` for the table.
- [ ] 1.10 Resolutions: `flow.json` with R1–R4 (earned assets, R1 +2 XP), R5–R7 (all killed), `none` by the recorded leading faction, the `sideScenario` cost 3 for hosts; i18n texts kept via `i18nId`; a flow test per resolution.
- [ ] 1.11 Bot playthrough: the bot plays the scenario to a resolution on Standard with 0 errors (`src/engine/kits/bot`).
- [ ] 1.12 Coverage check: `pnpm coverage` reports `war-of-the-outer-gods` complete and `wog` 0 left.

## 2. Translations

- [ ] 2.1 Ability labels and prompts (`ability.<code>.<n>`, faction prompts, "in the lead") in `content/i18n/en/ui.json` and `ru/ui.json`; the 3 `wog` cards without RU text fall back to English (noted for `i18n-all-locales`).

## 3. Verification

- [ ] 3.1 `docs/campaign-program.md`: `wog` row ticked, counts updated; note the Single Group reading (ADR-0082).
- [ ] 3.2 `pnpm coverage`, `pnpm check:content`, `pnpm test`, `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`; `openspec validate campaign-side-war-of-the-outer-gods --type change --strict`.
