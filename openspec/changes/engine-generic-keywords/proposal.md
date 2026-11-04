## Why

Nine keywords the engine does not know recur across the cycles, so no single campaign change should own them: `KEYWORD` in `src/content/implemented.ts` lists hunter, retaliate, aloof, alert, massive, surge, peril, fast, exceptional, doomed and elusive, and `CardDef.keywords` in `src/content/schema.ts` the same set. Patrol moves enemies in Children of Blood (13024–13026, 13063), Fortune and Folly (88034a–88037c, 88046a–88047b), The Scarlet Keys (09571b, 09627, 09655a, 09657, 09720, 09758, agenda 09636), The Feast of Hemlock Vale (14 cards), The Drowned City (11537b, 11551, 11670, 11701, 11721), the Excelsior Hotel, Machinations Through Time, The Midwinter Gala, Film Fatale, Bad Blood (90023) and Laid to Rest (90057a, 90058). Hidden puts treacheries in hands in The Path to Carcosa (03084a–d, 03186, 03187, 03340–03342, 52011–52013, 52057, 52058, 52065, 52071–52074, 90093) and The Dream-Eaters (06087–06089, 06306–06310, 06314–06317, 06319–06321, 06017). Exile (02114, 02115, 02271, 03156, 03157, 05196, 05236, 05237, 08076, 08113, 09034, 09110, 09122, 11027, 60520, 60521) and Researched (02262–02264, 51004, 03192, 03193, 52004, 06236–06238, 08041–08044, 04230, 04231, 53004, 60229, 60230, 60279–60281) are campaign-deck rules every player-card change needs. Bonded cards (TCU 05313/05314, 05316/05317, 54002, 54004; TDE 06015a/b, 06019, 06022, 06025, 06028, 06031–06033, 06113, 06277, 06283, 06331; FHV 10006, 10007, 10036, 10039, 10045, 10063, 10086–10090, 10106, 10107, 10134) are not deck cards at all. Swarming (TDE 06102, 06106–06108, 06145, 06147, 06148, 06151, 06152, 06228; 01159 through 06170/06171; WotOG 86048–86050) stacks enemies. Veiled flips 23 Dream-Eaters locations (06127, 06129–06133, 06135–06143, 06254, 06257, 06258, 06261–06265). Relentless (TDC 11573, 11671, 11674b, 11686, 11724–11727, 11744, 11747) and Predator (CoB 13024–13026, 13058–13060, 13062, 13084–13086, 13089, 13097) are enemy-phase rules. `player-cards-dwl`, `player-cards-ptc`, `player-cards-tfa`, `campaign-the-path-to-carcosa` and its Return are written against this change.

## What Changes

- **Keywords with an argument are data.** `CardDef.keywords` entries are a string or an object (`{ patrol: Spawn }`, `{ swarming: Amount }`, `{ bonded: code }`); the importer and `cards.json` write them; `implemented.ts` counts a line as working when its keyword is in the engine's set and its argument parses.
- **Patrol.** At the start of the enemy phase, before hunters move, each ready unengaged Patrol enemy moves one step along the shortest path toward its target (the spawn expression of `engine-scenario-structure`, resolved against locations in play); the lead chooses among tied targets and paths; a blocked path cancels the move; an enemy already at the target stays. A scenario hook `patrolTarget` resolves a target the expression cannot say (Fortune and Folly's clockwise ring).
- **Relentless.** After an enemy with Relentless attacks in the enemy phase, it readies and attacks again once that phase.
- **Hidden.** A Hidden card's revelation adds it to the drawing investigator's hand; there it counts for hand size, its constant abilities are active, its forced abilities trigger and its actions can be taken as if it were in the threat area; it cannot be discarded from hand except by its own text; discarded, it goes to the encounter discard. The UI shows it only to the holder's seat (online hidden information is not protected: `online-play`).
- **Exile.** An `exile` effect removes the card from the game and from its owner's campaign deck; the next upgrade step offers it again at its cost (level 0 for free up to a legal deck size), with a `exiled` list in the campaign investigator.
- **Researched.** A card with `researched: { log }` can enter a deck only as an upgrade from its lower-level version and only when the campaign log holds the entry; a standalone game treats the entry as absent.
- **Bonded.** A bonded card is not a deck entry; at setup each bonded card of a card in the deck is created set aside for its owner; `searchBonded`/`putBondedIntoPlay` ops reach them; the deck validator rejects a bonded card listed in a deck and ignores bonded cards for the size.
- **Swarming X.** When a Swarming enemy enters play, the top X cards of the drawing investigator's deck go facedown beneath it as swarm cards; each swarm card attacks and is attacked as an enemy with the host's values; the host cannot be defeated while swarm cards remain; excess damage carries over; swarm cards leave to the bottom of their owner's deck; host and swarm move, engage, exhaust and are evaded together. Effects add swarm cards.
- **Predator.** After enemies attack, each ready unengaged Predator enemy at a location with a non-Elite enemy of the trait it names attacks that enemy (enemy-to-enemy damage, defeat "via the predator keyword").
- **Veiled.** At a veiled location with no clues an investigator may take an action to flip it and resolve its story side (`flip` and `resolveStory` from `engine-scenario-structure`).
- **Glossary.** `kw.relentless`, `kw.hidden`, `kw.exile`, `kw.researched`, `kw.predator`, `kw.veiled` in `content/i18n/{en,ru}/ui.json` beside the existing `kw.patrol`, `kw.swarming`, `kw.bonded`.
- **BREAKING**: `ENGINE_VERSION` 9; `CampaignState` gains `exiled` per investigator (saves from 8 are refused).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: enemies (Patrol, Relentless, Predator, Swarming), encounter deck and treacheries (Hidden), locations (Veiled), player cards in play (Exile, bonded cards in play).
- `investigator-decks`: deck validation (Researched gate, bonded cards not in decks).
- `campaign-play`: deck upgrades between scenarios (exiled cards bought back, Researched offered only with the log entry).
- `card-content`: card record format (keyword arguments as data).

## Impact

- `src/content/schema.ts` (`Keyword` union, `researched`, `bonded`, `swarming`, `patrol`), `src/content/implemented.ts` (`KEYWORD` over structured entries), `scripts/import-cards.ts` (parse "Patrol (…)", "Swarming X", "Bonded (…)" lines into data), `src/ui/game/glossary.ts` and `ui.json`.
- `src/engine/rules/enemies.ts` (`PatrolMoves`, `Relentless`, `PredatorAttacks` steps; swarm attacks and damage), `rules/round.ts` (enemy phase order: patrol, hunters, attacks, predators), `rules/investigators.ts` (hand size with hidden cards; discard-from-hand ops skip hidden), `rules/scenario.ts` (hidden revelation; Veiled action), `rules/cards.ts` (actions of hidden cards offered from hand), `effects/placement.ts` (`exile`, `addSwarm`, `searchBonded`, `putBondedIntoPlay`), `campaign/decks.ts` (Researched, bonded), `campaign/upgrade.ts` (exiled cards), `campaign/types.ts` (`exiled`), `index.ts` (bonded cards at setup; `ENGINE_VERSION`), `world/types.ts` (`CardInst.hidden`, `swarm`; `ScriptHooks.patrolTarget`), `api.ts` (verbs `exile`, `addSwarm`, `patrol`; reads `swarmOf`, `isHidden`).
- `src/ui`: hidden cards drawn facedown for other seats (`Hand`), swarm count on an enemy frame, bonded area in the deck builder and the card catalog filter.
- Tests through `kits/driver.ts`, one file per keyword; `campaign/__tests__` for Exile, Researched, Bonded.
- Depends on `engine-scenario-structure` (spawn expressions, beneath piles, `flip`, `resolveStory`); Patrol's ring routes depend on `engine-location-instances-grid` for one-way instance links. Followed by `player-cards-dwl`, `player-cards-ptc`, `player-cards-tfa`, `player-cards-tcu`, `player-cards-tde`, `player-cards-fhv`, `campaign-the-path-to-carcosa`, `campaign-the-dream-quest`, `campaign-children-of-blood`, `campaign-fortune-and-folly`, `campaign-the-drowned-city`.
