## Why

The Circle Undone is the fourth cycle in play order and none of its 326 encounter cards works: the cycle's mechanics do not exist in the engine. The program table says "tarot, hidden cards", but no card of the cycle has the Hidden keyword; what 52 locations print is `Haunted –`, and around it sit the Spectral realm (locations flipped to their other side, a second encounter deck, locations swapped for set-aside copies), enemies that flip into story cards, chaos-token keys, breaches and incursions, the Cosmos grid of Before the Black Throne, locations "in front of" an investigator, circle actions with summed-skill tests and braziers, four prologue investigators with no deck, and the 22-card tarot deck that only ArkhamCards carries. Every scenario of `campaign-the-circle-undone`, `campaign-return-to-the-circle-undone` and `campaign-side-laid-to-rest` needs some of these, and `player-cards-tcu` needs the tarot slot and opening-hand rules, so the mechanics land once, here, before the content.

## What Changes

- **Haunted.** A `haunted` ability kind on locations (and on cards attached to them, and granted to a location by another card). After an investigator fails an investigation at a location, every haunted ability there resolves, in the order the investigator chooses. An effect op resolves them on demand (chaos tokens: "resolve each haunted ability on your location"), and a condition asks whether a location is haunted (skull −3 "if your location is haunted").
- **The Spectral realm.** Locations flip between their two sides with the `flip` op `engine-scenario-structure` adds; this change adds what TCU needs around it: an act or agenda can forbid flipping to a side; a location swap puts a set-aside location in the place of one in play, keeping its tokens, attachments, investigators and enemies (nothing counts as moving); a second, named encounter deck ("spectral") with its own discard, used for draws, searches and run-outs by an investigator at a Spectral location, and to which Spectral cards are discarded; a setup op splits the gathered sets into the standard and spectral decks by trait.
- **Enemy and story flips.** An enemy whose back is a story card flips to it and stays in the threat area ("Unfinished Business"), flips back and attacks, or is banished to the victory display; a story card can flip to its enemy side (Nathan Wick's two enemy sides, the four fates of Union and Disillusion).
- **Chaos-token keys.** Four tokens from the collection, not the bag, sit on a location, enemy or asset or are held by an investigator; a key is taken by a location with no clues, a defeated enemy or a parley; conditions and prey read who holds which key. The holder table is the one `engine-tic-keys-flooding` and `engine-tsk-keys-concealed` extend with their own key kinds.
- **Breaches and incursions.** Breach counters on locations and on the act; an agenda that replaces doom with breaches on random locations; a fourth breach starts an incursion (breaches cleared, 1 doom on the agenda, 1 breach on each connecting location, chaining); ops to place and remove breaches, amounts and spawn rules that read them.
- **The Cosmos.** On top of `engine-location-instances-grid` (per-instance connections, grid positions): empty space as facedown player cards from the active investigator's deck, counted for distance but not enterable; a Cosmos card placed by its printed instruction (connect above, below, left, right, anywhere); the agenda rule that adjacent locations are connected; a location moved to another position or shuffled back into the Cosmos deck; enemies that enter empty space.
- **Locations in front of an investigator.** A location can be put in front of an investigator; the locations in front of one investigator connect to one another; an investigator cannot enter a location in front of another; a setup op deals N random locations in front of each investigator in player order.
- **Circle actions.** A `circle` action designator; a skill test against the sum of two to four skills; a brazier that is lit or unlit per location; a condition for "during a circle action".
- **Prologue investigators.** An investigator entry can carry a fixed setup instead of a deck: start location, cards in play, hand, resources, and the scenario rules "ignore draws" and "a player card that would be discarded is removed".
- **Tarot.** A `tarotSlots` stat (Anna Kaslow's +2); a `gameBegins` trigger so "if this is in your opening hand: put it into play" works for the 14 tarot cards; the tarot deck as hand-written content (22 Major Arcana, upright and reversed, text from ArkhamCards), a campaign-flow step that performs a reading and records it on the log, and the reading's effect applied at the next scenario's setup.
- Spawn and prey vocabulary the cycle needs: "any [[Sanctum]] location", "any location connected to yours", "farthest empty space", "fewest/most breaches", two named locations; prey "most keys", "location with the most clues".
- A reusable "cannot be defeated" rule for unique bosses (The Spectral Watcher, Nahab): damage past health heals, disengages, exhausts, and the enemy does not ready next upkeep.
- `ENGINE_VERSION` bump: a saved scenario in progress restarts, campaign logs kept.

Not here: Hidden, Patrol, Bonded, Exile (`engine-generic-keywords`); bless and curse (`engine-bless-curse`, needed by Laid to Rest); the flow-compiler conditions the campaign needs (`campaign-flow-compiler-fixes`); the scenario files, scripts and token tables (the campaign changes).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: Skill tests (summed skills, circle designator, the haunted resolution after a failed investigation); Encounter deck and treacheries (named encounter decks chosen by the investigator's location); Locations (flip bans, swap, in-front-of ownership, breaches, Cosmos placement and empty space, keys on cards); Enemies (story flips, keys, breach-aware spawn, cannot-be-defeated bosses); Act and agenda decks (breaches on the act, doom replaced by breaches, incursions).
- `card-content`: Data-driven card effects (the `haunted` ability kind, the new ops, conditions, amounts, spawn and prey values, `tarotSlots`, the `gameBegins` trigger); Content lives in data files (the tarot deck as `content/tarot.json` with text per locale).
- `investigator-decks`: Investigator definition (a fixed-setup investigator with no deck).
- `campaign-flow`: Campaign flow as data (a tarot reading step and its record on the log).

## Impact

- `src/content/schema.ts` (ability kind, designator, ops, conditions, `Amount`, `ModStat`, `TRIGGERS`, `SetupStep`, `InvestigatorDef.fixedSetup`, `TarotCard`, flow step `tarotReading`), `src/content/implemented.ts` (`spawnResolves` and the haunted line rule), `src/content/loader.ts` (the tarot deck).
- `src/engine/world/constants.ts` (`STEP` kinds, `ZONE` piles for named decks), `world/flags.ts` (breaches, braziers, keys, in-front-of, flip bans, empty space), `world/types.ts` (`ScriptDef.hauntedGrants`), `rules/skillTest.ts` (sum mode, haunted after failure), `rules/enemies.ts` (spawn, prey, story flips, cannot be defeated, keys), `rules/scenario.ts` (incursions, breaches on the act), `rules/cards.ts` (tarot slots, opening-hand plays), `effects/encounter.ts` and `effects/search.ts` (deck routing), `effects/placement.ts` (swap, Cosmos, in front of), `movement.ts` (`swapLocation`, discard routing, removal on discard), `queries.ts` (haunted abilities, keys, breaches, empty-space distance), `campaign/flow.ts` and `campaign/log.ts` (the reading), `index.ts` (fixed setups, split decks, `ENGINE_VERSION`), `api.ts` (the verbs scripts need, ADR-0034).
- `src/ui`: the second encounter deck and its discard in the table and the panel, breach and brazier counters, key tokens on cards and in the investigator bar, empty space on the grid, the tarot reading prompt; strings in `content/i18n/{en,ru}/ui.json`.
- `content/tarot.json`, `content/i18n/en/tarot.json`, `content/i18n/ru/tarot.json`; `content/investigators/05046.json`–`05049.json`.
- `docs/campaign-program.md`: the TCU row reads "haunted, Spectral, breaches, Cosmos, tarot" instead of "tarot, hidden cards".
