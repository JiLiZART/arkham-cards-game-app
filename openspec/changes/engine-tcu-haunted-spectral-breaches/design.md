## Context

The engine (ADR-0021 to 0036) keeps cards in component tables with one pile map, resolves a stack of typed steps, lets scripts in through `api.ts` verbs and finds them in one registry. What The Circle Undone needs sits in six places today: `AbilityKind` (`src/content/schema.ts:940`) has no haunted kind and no circle designator (`:960`); `skillTest.skill` as an array means "choose one", never a sum; one encounter deck and discard (`ZONE.EncounterDeck`, `PILE.EncounterDiscard` in `world/constants.ts`), with `sideDecks` (`index.ts:245`) as plain piles nobody draws from as an encounter deck; `connections()` (`queries.ts:123`) by card code, which `engine-location-instances-grid` makes per instance with grid positions; `spawnResolves` (`src/content/implemented.ts:9`) knowing two keywords and a location name; `setCode` (`context.ts:270`) as the only way a card becomes another, used by Elokoss. `wouldPlaceDoom` (`world/types.ts:501`) is the hook Brethren of Ash uses to replace doom, the model for breaches. Joe Diamond's hunch deck (`world/flags.ts:99`) shows a per-investigator side pile as a flag family. `mulliganHandler` (`rules/investigators.ts:551`) is the last setup step before the first round, where "opening hand" cards must act.

In force: ADR-0013 (a card works when every printed line is accounted for) decides when the cycle's cards count; ADR-0015 (the Grimoire is the rules reference: the Grimoire has no haunted entry, so the campaign guide's rules insert is the source for haunted, breaches, the Cosmos and circle actions, cited in the handlers); ADR-0026 (closed sets of strings as constants: the new step kinds, zones and designators join `STEP`, `ZONE`, the designator enum); ADR-0033 (deferred rules are typed step kinds: `ResolveHaunted`, `Incursion`, `SwapLocation`, `FlipStory` are kinds, not scripts); ADR-0034 (scripts get verbs for them); ADR-0006 (card data from the snapshot: the tarot deck is not in the snapshot, which is the one exception this change records).

## Goals / Non-Goals

**Goals:** every mechanic the cycle's 326 encounter cards and 130 player cards print exists once, as data vocabulary where two or more cards share it and as a step kind where the rules insert describes a procedure; the default scenario (one deck, no breaches, no grid) behaves exactly as before, checked by the replay corpus; the campaign changes write scenario files and scripts without touching the engine.

**Non-Goals:** the scenarios, token tables and card scripts (campaign changes); `flip` of double-sided act/agenda/location cards, story cards as a type, cards beneath cards, random setup picks (`engine-scenario-structure`); per-instance connections and the grid itself (`engine-location-instances-grid`); Hidden, Patrol, Bonded, Exile (`engine-generic-keywords`); bless and curse (`engine-bless-curse`); flow conditions the compiler lacks (`campaign-flow-compiler-fixes`); TIC's and TSK's key kinds (they extend the holder table added here); UI redesign beyond showing the new state.

## Diagram (C4 component level, ASCII; the engine is pure, the browser app the only container)

```
 content/packs/<pack>/cards.json             content/tarot.json + i18n/<l>/tarot.json
 content/investigators/0504x.json (fixedSetup)   campaign flow.json (tarotReading step)
      | haunted, circle, sum tests, ops, spawn/prey values, cannotBeDefeated
      v
 +----------------------------------------------------------------------------------------+
 | src/engine                                                                             |
 |                                                                                        |
 |  rules/skillTest.ts                       rules/scenario.ts                            |
 |  +------------------------------------+   +-----------------------------------------+ |
 |  | value(): sum of t.skills when      |   | placeDoomHandler: breachesInsteadOfDoom |  |
 |  |   t.sum (commits add any of them)  |   |   flag -> PlaceBreaches random N+1     |  |
 |  | designator "circle" -> circleTest  |   | PlaceBreaches / RemoveBreaches steps    |  |
 |  | failed investigate -> push         |   | Incursion {loc}: clear, doom 1, breach  |  |
 |  |   ResolveHaunted {loc, inv}        |   |   each connecting, re-check (chains)   |  |
 |  +------------------------------------+   +-----------------------------------------+ |
 |  rules/enemies.ts                         effects/encounter.ts, search.ts, movement.ts |
 |  +------------------------------------+   +-----------------------------------------+ |
 |  | spawn: trait / connectedToYours /  |   | deckFor(game, inv|loc) -> "standard" |  |
 |  |   farthestEmptySpace / fewest|most |   |   "spectral"; piles encounterDeck:<n>  |  |
 |  |   breaches / "A or B"              |   |   encounterDiscard:<n>; discard() by   |  |
 |  | prey: mostKeys, mostClues          |   |   the card's deck filter                |  |
 |  | DefeatEnemy: cannotBeDefeated ->   |   | swapLocation(game, inPlay, aside)      |  |
 |  |   heal, disengage, exhaust, noReady|   | placeInFront, placeCosmos, emptySpace  |  |
 |  | FlipStory / FlipEnemy / Banish     |   +-----------------------------------------+ |
 |  | keys: takeKey on defeat / parley   |   world/flags.ts: breaches, brazier, keys,   |
 |  +------------------------------------+     inFront, noFlipTo, emptySpace, noReady,  |
 |  queries.ts: hauntedAbilities(loc),         ignoreDraws, removeOnDiscard             |
 |    isHaunted, keysOf, breachesOn,         world/constants.ts: STEP +ResolveHaunted,  |
 |    connections() + inFront + cosmos         Incursion, SwapLocation, FlipStory,      |
 |  rules/cards.ts: tarotSlots, gameBegins     PlaceBreaches…; ZONE + named decks       |
 |  index.ts: fixedSetup, splitEncounterDeck, buildCosmos, setAsideKeys; ENGINE_VERSION |
 |  campaign/flow.ts: tarotReading -> log "tarot"; rules/scenario.ts applies at setup   |
 |  api.ts: verbs resolveHaunted, swapLocation, placeBreaches, incursion, flipStory …   |
 +----------------------------------------------------------------------------------------+
      | pending choices (prompt keys), events (EVENT.Breach, EVENT.Incursion, EVENT.Flip, EVENT.Key)
      v
 src/ui: second deck + discard in the table and panel, breach/brazier counters on locations,
   keys on cards and in the investigator bar, empty space cells, tarot reading screen
```

## Decisions

1. **Haunted is an ability kind, resolved by a step.** `AbilityKind` gains `"haunted"`; `hauntedAbilities(game, loc)` in `queries.ts` collects the location's own, those of cards attached to it, and those a script's `hauntedGrants(game, cardId)` returns (Nether Mist, Whispers in the Dark, The Wraith; the hook on `ScriptDef` beside `blanks`). `skillTestFailed` in `rules/skillTest.ts` (`:668`) pushes `ResolveHaunted { location, inv }` when the test's designator is `investigate`; the handler offers the unresolved abilities as a choice (auto when one), runs the pick's effects with the investigator as `ctx.inv`, and re-pushes itself with the resolved ids until none are left. The op `resolveHaunted { at: "yours" }` and the condition `locationHaunted` read the same query. _Alternative:_ a `forced` ability with a trigger `failedInvestigate` per card: rejected, the tokens and the "resolve each haunted ability" effects need the set, not a trigger, and the order is the investigator's choice (rules insert).

2. **Named encounter decks, one by default.** `PILE.EncounterDeck`/`EncounterDiscard` become `encounterDeck:standard` and `encounterDiscard:standard`; `deckFor(game, invOrLoc)` returns the name the scenario's `encounterDecks` map assigns to the location (`{ spectral: { trait: "Spectral" } }`, else "standard"). Every draw, search, run-out reshuffle (`reshuffleDiscard(game, "encounter")` gains the name) and `discard()` (`movement.ts:198`, routes by the card's filter match) go through it; `shuffleIntoEncounter` and `searchEncounter` accept `deck`. The setup op `splitEncounterDeck` moves matching cards from the standard pile after the sets are gathered. _Alternative:_ a `ZONE.SpectralDeck`: rejected, zones are where a card is, and a third deck (Laid to Rest's spirit deck is per investigator, a flag family like the hunch deck) would need a fourth zone. The pile map (ADR-0023) already keys piles by name. ADR-0055 records this.

3. **Swap keeps the instance.** `swapLocation(game, inPlay, aside)` in `movement.ts`: `setCode(inPlay, card(aside).code)`, the set-aside instance moves to `ZONE.Removed`, `revealed` stays; no window opens. Grid position, clues, attachments and occupants are facts about the instance id, so they stay without being touched. Flip bans are a flag family `noFlipTo<side>` the act or agenda's constant modifier sets; `flipLocation` (over `engine-scenario-structure`'s `flip`) checks it, and `canUse` hides a flip ability whose target side is banned.

4. **Story flips are two step kinds and a zone move.** `FlipStory { card, to: threat | victory }` (`setCode` to the back; `moveCard` to the investigator's threat area or the victory display; the enemy's damage cleared; no `enemyDefeated` window) and `FlipEnemy { card, attack: boolean }` (`setCode` to the front, `moveCard` to `ZONE.Enemy` at the investigator's location, engage, optional `EnemyAttack`). Heretics declare `onDefeat: { flipToStory: "threat" }` in data; `defeatEnemyHandler` (`enemies.ts:352`) checks it before discarding. `banish` is `moveCard(.., ZONE.Victory)`. _Alternative:_ scripts per card doing `setCode` by hand: rejected, 12 Heretics, 4 fates, Josef and Nathan share the procedure.

5. **Keys are a holder table.** `flags.keys: family<Holder, KeyToken>` where `Holder = { card: InstId } | { inv: InvId }`; `setAsideKeys` creates the four entries unheld; `placeKey`, `takeKey` ops; `defeatEnemyHandler` and the location's "take the key" action move it; `investigatorDefeated` drops them on the location. Conditions `controlsKey { token }`, `keyOn { token, card }`; prey `mostKeys`; `Amount.keysControlled`. TIC's and TSK's keys are other `KeyToken` values in the same family (their changes add them). _Alternative:_ keys as card instances: rejected, they are tokens with no face and nothing targets them as cards.

6. **Breaches are counters; incursion is a step.** `flags.breaches: counts<InstId>` (locations and the act card). `placeDoomHandler` (`scenario.ts:127`) checks a scenario flag `breachesInsteadOfDoom` (set by agenda 05285's constant modifier) before the script hook: it pushes `PlaceBreaches { at: "random", n: investigators + 1, amount: 1 }` instead, choosing distinct locations with the scenario's RNG. `PlaceBreaches` after each placement pushes `CheckIncursion { location }`; `Incursion { location }` clears, pushes `PlaceDoom { card: agenda, n: 1, direct: true }` (skips the replacement) and `PlaceBreaches` on each connecting location, so chains resolve depth-first on the stack. Random locations use `randInt` over `locations(game)` sorted by instance id, so replays agree.

7. **Cosmos on the grid.** `engine-location-instances-grid` gives `position(game, loc)` and adjacency; this change adds `flags.emptySpace: family<InvId, InstId>` (a card instance from the owner's deck in `ZONE.Location`, facedown, flagged; `enterLocation` refuses it; `connections()` skips it but distance counts it), `placeCosmos { card, rule: above|below|left|right|any }` (free cells next to the investigator's location by the rule; an empty-space card there returns to its deck's bottom), `moveLocation { to }`, `shuffleIntoCosmos`, and the scenario flag `adjacentConnected` the agenda sets. Spawn `farthestEmptySpace` and `moveToEmptySpace` set the enemy's `location` to the empty-space instance. The Cosmos deck is a side deck (`sideDecks.cosmos`).

8. **In front of is ownership.** `flags.inFront: family<InvId, InstId>`; `connections()` adds the other locations of the same owner and `canMove` refuses a location owned by another investigator; `putInFrontOfEach { from, count }` deals in player order. Union and Disillusion's Unvisited Isles use the same table.

9. **Summed tests and circles.** `SkillTestState` gains `sum?: Skill[]`; `value()` adds the investigator's named skills and counts any of those icons on commits; `Ability.designator` gains `"circle"`; `circleTest` is a condition on the current test's designator. `flags.brazier: family<"lit" | "unlit", InstId>`; `lightBrazier`/`brazierLit`.

10. **Cannot be defeated.** `CardDef.cannotBeDefeated: true`; in `defeatEnemyHandler`, heal all, disengage from every investigator, exhaust, set `flags.noReady` for the next upkeep (`readyAll` in `round.ts:527` skips it and clears the flag). Azathoth's "immune" is a `blanks`-style modifier on its own data, not this rule.

11. **Fixed setups and the prologue's rules.** `InvestigatorDef.fixedSetup { start, play, hand, resources }`; `createGame` (`index.ts`) puts the listed cards into play and hand, skips deck validation, the opening draw and the `Mulligan` step for them. Scenario flags `ignoreDraws` and `removeOnDiscard`, set by the scenario's setup, are read by `drawCards` and `discard()` (`ZONE.Removed`). The investigators are chosen on the scenario's own setup screen because the campaign's investigators are not in it.

12. **Tarot.** `ModStat` gains `tarotSlots` (`rules/cards.ts:680` reads the count). `TRIGGERS` gains `gameBegins`, a window pushed after the last `Mulligan` step (`index.ts:280`); tarot cards declare `forced` on it with `fromHand: true` and `putIntoPlay: self`. The deck is `content/tarot.json` (22 entries with an `upright` and `reversed` effect: a setup effect in the vocabulary, or a `rule` name a scenario setup handler knows); the flow step `tarotReading { mode }` draws with the campaign's RNG, prompts, writes the `tarot` log section; `createGame` reads it for the scenario and `endScenario` clears it. Observed (54013) and Damned (54014) read the same section. ADR-0056 records the content exception to ADR-0006.

13. **Spawn and prey grammar.** `CardDef.spawn` becomes a string the parser in `rules/enemies.ts` reads: a location name, `"A or B"`, `any [[Trait]] location`, `connectedToYours`, `emptyLocation`, `farthestEmptyLocation`, `farthestEmptySpace`, `fewestBreaches`, `mostBreaches`, `Engaged with Prey`; `spawnResolves` mirrors it. Prey adds `mostKeys` and `mostClues`.

14. **`ENGINE_VERSION` bump.** Pile names and new flags change saved state; saved scenarios restart, campaign logs are kept, as every rules change.

## Risks / Trade-offs

- [Renaming the encounter piles touches every encounter effect] → one `deckFor` function and a test over the replay corpus (`src/engine/replays/`) that every recorded game replays unchanged with one deck.
- [`ResolveHaunted` after every failed investigation] → it pushes only when the location has haunted abilities; a test asserts a failed investigation at a plain location adds no step.
- [Incursion chains could loop] → each incursion clears its location first, so a location re-enters a chain only with the breaches its neighbours place; the step count is bounded by locations × 4; a test runs the two-location ring.
- [Random locations must replay] → ordered by instance id and drawn with the scenario RNG; a replay test for the breach placement.
- [Keys and in-front-of are flag families, not tables of their own] → consistent with hunch and aside; if the UI needs a listing, `queries.ts` exposes it.
- [Tarot effects are 44 small rules] → most are one setup effect in the vocabulary; the few named rules (The Hanged Man, Judgement) are flags scripts read; the whole table is one test file.
- [The Grimoire has no haunted or breach entry] → handlers cite the rules insert in `inspired/` (ADR-0015's fallback is the printed rules).

## Migration Plan

Engine, schema and content in one change; `ENGINE_VERSION` bump. `check:content` and `pnpm coverage` after. Rollback: revert.

## Open Questions

- Whether the key holder table should land in `engine-tic-keys-flooding` instead (TCU comes first in play order, so this change builds it; the parent may move it).
- The tarot deck's Russian text has no source: hand translation, or English only until one exists (the brief forbids machine translation).
