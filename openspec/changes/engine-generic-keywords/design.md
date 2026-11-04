## Context

Keywords the engine acts on are a closed list in two places: `CardDef.keywords` (`src/content/schema.ts`, the enum at `keywords:`) and the `KEYWORD` regex in `src/content/implemented.ts:5`, which also accepts a numeric argument (`Alert (2)`); `hasKeyword` (`src/engine/queries.ts:65`) reads them, `hunterMovesHandler` (`src/engine/rules/enemies.ts:387`) is the only keyword with a phase step, `enemyPhaseHandler` (`rules/round.ts:513`) pushes `HunterMoves` then `EnemyAttacks`, `elusive`/`alert` live in `rules/skillTest.ts` and `rules/enemies.ts:216`. The glossary (`src/ui/game/glossary.ts`, `kw.*` in `content/i18n/{en,ru}/ui.json`) already names patrol, swarming, bonded, concealed, myriad and seal with no engine behind them. The campaign deck lives in `CampaignInvestigator.deck: string[]` (`src/engine/campaign/types.ts:76`), validated by `validateDeck` (`campaign/decks.ts:154`) and priced by `deckChangeCost`/`upgradeDeck` (`campaign/upgrade.ts:16,75`); `whyNotReplace` (`decks.ts:322`) already knows "a higher-level version of the same title". `handLimit` (`rules/investigators.ts:626`) counts the hand; a treachery's revelation (`rules/scenario.ts:66`) never puts a card in a hand. The Grimoire (`inspired/arkham_grimoire-web.md`) defines Patrol (l.1285), Hidden (l.911), Exile (l.751) and Researched (l.1415); Relentless, Swarming, Bonded, Veiled and Predator are in the cycle inserts (The Dream-Eaters A pp.10–11 and B p.86; The Drowned City; Children of Blood, not in `inspired/`), quoted in the inspection reports (`tde.md` §2, `tdc.md` §2, `boxes.md` #4).

`engine-scenario-structure` lands first and gives this change the spawn expression (`queries.ts spawnTargets`), the beneath piles (`PILE beneath:<InstId>`), `flip` and `resolveStory`. `player-cards-dwl`, `player-cards-ptc` and `player-cards-tfa` use Exile and Researched and write nothing of them; `campaign-the-path-to-carcosa` uses Hidden; `campaign-the-dream-quest` Swarming and Veiled; `campaign-children-of-blood` Patrol and Predator; `campaign-fortune-and-folly` Patrol with a ring; `campaign-the-drowned-city` Patrol and Relentless.

## Goals / Non-Goals

**Goals:** the nine keywords as engine rules and data, each with a driver test and a glossary string in both locales; the deck validator and the upgrade step knowing Exile, Researched and Bonded; the importer writing keyword arguments as data; `ENGINE_VERSION` 9.

**Non-Goals:** Concealed, Myriad, Customizable (`engine-tsk-keys-concealed`, `player-cards-tsk`), Haunted (`engine-tcu-haunted-spectral-breaches`), Mirage (`engine-eoe-partners-frost`), Warring (`campaign-side-war-of-the-outer-gods`), Seal (`engine-bless-curse`); the `blood` token and the rest of Children of Blood; secrecy of Hidden cards from other seats online (`online-play` says hidden information is not protected); the FoF hub ring's layout data (`campaign-fortune-and-folly` writes it as one-way instance links through `engine-location-instances-grid`).

## Diagram (C4-inspired, component level, ASCII; the engine is pure, the browser app the only container)

```
 scripts/import-cards.ts  "Patrol (X)" -> {patrol: expr}; "Swarming X" -> {swarming: amount}; "Bonded (Name)" -> {bonded: code}
 content/packs/<pack>/cards.json  keywords: ["hidden" | "relentless" | "veiled" | "exile" | {predator: trait} | {researched: {log}} | ...]
            |
            v  src/content/schema.ts Keyword union; implemented.ts KEYWORD over entries
 +---------------------------------------------------------------------------------------------------+
 | src/engine                                                                                        |
 |  rules/round.ts   EnemyPhase: PatrolMoves -> HunterMoves -> EnemyAttacks(+Relentless) -> Predator  |
 |  rules/enemies.ts patrolMovesHandler (spawnTargets | hooks.patrolTarget; stepsToward; lead picks) |
 |                   enemyAttackHandler: relentless readies and re-attacks once; swarm: one attack   |
 |                   per swarm card; damageEnemyHandler: swarm first, carry over, host undefeatable  |
 |                   predatorAttacksHandler: DamageEnemy {by: enemy} + EVENT.PredatorDefeat          |
 |  rules/scenario.ts  revelation of a hidden card -> hand (CardInst.hidden); Veiled action -> flip  |
 |  rules/investigators.ts  handLimit counts hidden (+ location multiplier); discard ops skip hidden |
 |  rules/cards.ts   actions/forced of hidden cards offered from hand as if in threat area           |
 |  effects/placement.ts  exile, addSwarm, searchBonded, putBondedIntoPlay                           |
 |  index.ts         setup: bonded cards of deck cards -> ZONE.SetAside owned by the investigator    |
 |  campaign/decks.ts   validateDeck: researched gate (log + lower version), bonded rejected/ignored |
 |  campaign/upgrade.ts deckChangeCost: exiled list, level 0 free below size                        |
 |  campaign/campaign.ts ScenarioFacts.exiled -> CampaignInvestigator.exiled                         |
 |  world/types.ts   CardInst.hidden, swarmOf; ScriptHooks.patrolTarget; api.ts verbs/reads         |
 +---------------------------------------------------------------------------------------------------+
            v
 src/ui: Hand (hidden card facedown for other seats), enemy frame (swarm count), deck builder (bonded area,
         exiled list, researched gate reason), glossary kw.* strings
```

## Decisions

1. **A keyword with an argument is an object in `keywords`.** `Keyword = "hunter" | … | "hidden" | "relentless" | "veiled" | "exile" | "vehicle" | { patrol: Spawn } | { swarming: Amount } | { bonded: string } | { predator: string } | { researched: { log: string } }`. `hasKeyword(game, id, "patrol")` matches the object's key; `keywordArg(game, id, "patrol")` returns it. `implemented.ts` counts a printed keyword line as working when its name is in the set and, for the argued ones, the card's data holds the object. The importer (`scripts/import-cards.ts`) parses `Patrol (…)` through the same words `spawnTargets` knows ("nearest", "with the most", "with no", a trait, a name), `Swarming X` into a number or `{ x: "alarmLevel" }`-style amounts, `Bonded (Name)` into the code by name within the pack; a line it cannot parse is left to `cards.json`. _Alternative:_ a regex at runtime over `text` — rejected: the engine never reads card text (ADR-0013 counts it; the engine resolves data).

2. **Patrol is a typed step before hunters.** `STEP.PatrolMoves` (handler in `rules/enemies.ts`, shaped like `hunterMovesHandler` with `done` and `stepped`) is pushed by `enemyPhaseHandler` before `HunterMoves` (Grimoire l.1285: at the start of the enemy phase). Targets: `spawnTargets(game, arg, enemy.location)` resolved against `locations(game)`; when the hook `patrolTarget(game, enemy)` exists it returns the target locations instead (FoF's clockwise ring reads the one-way instance links of `engine-location-instances-grid`). Several targets at the same distance → `ask` the lead (`CHOICE.Target`, key `patrolToward`, `auto: true`); several first steps → the same prompt as hunters (`enemyMoveWhere`); `canEnemyEnter` false on every step → no move; distance 0 → no move. `grantKeyword { keyword: "patrol", arg }` is a temp modifier on `allMods` so agenda 09636 and the Hotel's "gains patrol" are data. _Alternative:_ fold into `HunterMoves` — rejected: patrol enemies move before hunters, and toward a place, not a person.

3. **Relentless is a flag on the attack loop.** `enemyAttackHandler` after `ResolveAttack` of a relentless enemy that has not re-attacked this phase (`flags.relentlessDone` per enemy per phase) pushes `ReadyEnemy` and a second `EnemyAttack`; it exhausts after the second. The rule text (TDC insert) is read as "readies and attacks again after its attack" per `tdc.md:56`.

4. **Swarm cards are the beneath pile with a flag, not enemies of their own.** `CardInst.swarmOf?: InstId` on the cards in `beneath:<host>`; `enemyAttackHandler` for a host with N swarm cards pushes N+1 `EnemyAttack` steps (each a separate attack, each opening the attacked windows); `damageEnemyHandler` on a host with swarm cards assigns to the top swarm card first (`EVENT.SwarmDefeated` moves it to the bottom of `deck:<owner>`), carrying excess over; `defeatEnemyHandler` is refused while swarm cards remain; evade exhausts the host and the swarm; moving the host moves the pile (it is beneath). `addSwarm { amount, target }` takes the top cards of the drawer's deck (`you`), or the lead's when no investigator drew the host. `Swarming X` where X is an amount (`06228`: alarm level) uses `Amount`. _Alternative:_ one enemy instance per swarm card (tde.md "a separate enemy instance") — rejected: the host's values, engagement and movement are shared; a pile with per-card attack and damage is what the rules describe and the UI stacks it in one frame.

5. **Predator is the last enemy-phase step.** `STEP.PredatorAttacks` after `EnemyAttacks`: each ready unengaged predator at a location with a non-Elite enemy of the named trait attacks it: `DamageEnemy { enemy: prey, amount: predator.damage, by: predator }` (the `by` field already names a source); the prey's defeat emits `EVENT.EnemyDefeated` with `via: "predator"` so Under a Blood Moon (13072) reads it. The CoB insert's exact text is an open question; the step follows `boxes.md` #4 ("predators attack Civilian/Cultist enemies") and the Grimoire's enemy-phase order.

6. **Hidden is a hand card with a flag.** `revelationHandler` on a `hidden` card moves it to `hand:<inv>` with `CardInst.hidden = true` and emits `EVENT.HiddenDrawn` with the card visible only to that seat (the UI draws it facedown for other seats in hot-seat; online it is in the state, as the spec says). `handLimit` counts it (and `flags.hiddenCountsAs` on a location multiplies it: Backstage 03052); `discardFromHand` ops, `HandSize` discards and "choose a card from hand" targets skip `hidden` unless the op is the card's own (`ctx.source === card`); its abilities are read by `abilitiesOf` from the hand as if in `ZONE.Threat` (`rules/cards.ts triggered()` gains the hand with `hidden`); discarding it goes to `ZONE.EncounterDiscard` (`movement.ts discard` by card type). _Alternative:_ keep it in the threat area and only show it as a hand card — rejected: "counts toward hand size" and "cannot be discarded from hand" are hand rules.

7. **Exile is an effect and a campaign list.** `exile { target }` moves the card to `ZONE.Removed` and adds its code to `game.s.exiled[owner]`; `campaign.ts` copies it into `ScenarioFacts.exiled` and `CampaignInvestigator.exiled: string[]`, removing one copy from `deck`; `deckChangeCost` prices an exiled card at its level (min 1) like a new card, and a level 0 card at 0 while `deck.length < deckSize`; the upgrade screen lists `exiled`. Déjà Vu (60531) is a later discount on `deckChangeCost` by the ste change.

8. **Researched is a deck option on the card.** `CardDef.keywords` holds `{ researched: { log: "dwl:identified_solution" } }` (the key the lower-level card's `record` writes; `player-cards-*` write both); `validateDeck` gains the campaign log as an optional input (`validateDeck(db, deck, log?)`): a researched card passes only when `logEntry` holds and the deck contains no lower-level same-title card (it was replaced); `whyNotReplace` reports `upgrade.researched` with the entry's label. The deck builder already passes the campaign (ADR for upgrades); a standalone game passes no log.

9. **Bonded cards are created at setup, never in a deck.** `CardDef.keywords` holds `{ bonded: code }` on the bonded card; `index.ts createGame` creates, for each deck card, `quantity` copies of each card bonded to it in `ZONE.SetAside` with `owner`; `searchBonded { filter, then }` and `putBondedIntoPlay`/`putBondedInHand` ops read `cardsIn(SetAside)` with `owner === you` and `bonded`; `validateDeck` rejects a bonded entry (`deck.bonded`) and the ArkhamDB importer (`fromArkhamDb`) drops them. The catalog shows a bonded card under its host.

10. **Veiled is a turn action.** `legalTurnActions` offers "Flip <location>" when the investigator's location has `veiled`, no clues and a `b` face; it pushes `Flip` then `ResolveStory` (the verbs of `engine-scenario-structure`).

11. **Enemy phase order** after this change: `PatrolMoves`, `HunterMoves`, the player window, `EnemyAttacks` (with Relentless re-attacks), `PredatorAttacks`. `rulesAlign.test.ts` gets the order as a test.

## Risks / Trade-offs

- [Patrol targets the importer cannot parse] → the card is not working until `cards.json` gives the expression or the scenario's `patrolTarget` hook does; the inspection reports' lists (TSK 6, FHV 14, CoB 2, TDC 5, sides 9) are the acceptance list.
- [Swarm attacks multiply the enemy phase's prompts] → each attack is one `EnemyAttack` step with `auto` assignment where only one target exists; the fuzz test caps steps.
- [Hidden cards in a hot-seat game are on the same screen] → the hand draws them facedown for a seat that is not the holder's, as the spec promises; nothing stronger.
- [Exile below deck size] → `validateDeck` allows the short deck through the upgrade step and the builder says what is missing (Grimoire l.751).
- [The CoB insert's Predator text is not in `inspired/`] → decision 5 follows the report; the wording is the open question.

## Migration Plan

`ENGINE_VERSION` 9; `CampaignState.version` bumps for `exiled`. The importer is re-run for every pack (`pnpm import:cards`) so `cards.generated.json` gains the keyword objects; `pnpm coverage` after. No scenario files change.

## Open Questions

- The Predator keyword's rules text (Children of Blood rules insert) is not in `inspired/`; decision 5 follows the inspection report's reading. User: confirm the insert's wording (whether a predator attacks only when unengaged, and which traits).
