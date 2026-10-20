## Context

A card works through `cards.json` abilities (`src/content/schema.ts` vocabulary, run by `src/engine/effects.ts` and the step handlers under `src/engine/rules/`) or a script under the pack's `scripts/`. The `nat` pack has one written card (Flesh Ward, from `uses-cards-heal-and-ward`); the other 27 have none, so `canPlay` (`cards.ts:277`) refuses the events ("events that are only playable in response to a trigger") and the assets sit in play doing nothing.

What the engine has that these cards lean on: `fight`/`evade`/`investigate` ops starting a `SkillTestState` with `skillBonus`, `damageBonus`, `onSuccess`, `autoSucceed` (set only by scripts so far); windows (`win(trigger, data)`) whose handler resolves forced abilities, then offers reactions, from play and from hand (`fromHand`), and asks nothing when none can answer; `g.s.flags["attackBonus:<key>"]` / `["prevented:<key>"]` as the way an effect in a window changes the step that follows it; `restrictedActions` by trait (Daisy's Tome action); `cost.damageOnSelf` (increments the asset's damage, no defeat check); `searchDeck`, `takeFromDiscard`, `chooseOne` with per-option conditions; constant modifiers with `when: "fighting"`; `prey: "bearer"`.

What it lacks, found by reading each card against the vocabulary: a played event's action designator (`designatorOf` returns `"play"`, so Backstab provokes attacks of opportunity); fast cards playable outside the player's own turn (the grimoire's player windows, p.27–29); a moment at which damage dealt to an enemy can be changed or reacted to (`DamageEnemy` applies at once); excess damage; a cost paid from the card's uses or the pool; uses that replenish; and the targets/conditions listed in the proposal.

In-force ADRs: 0001–0013 (none superseded). 0013 (a card works when every printed line is accounted for) decides when the pack counts as complete; 0012 commits the coverage; 0006 keeps the generated card data read-only and the behaviour in `cards.json`; 0004 keeps decisions in game state (the windows and flags here are game state; the prompt words are view text by key).

## Goals / Non-Goals

**Goals:** every `nat` card works, in data where the vocabulary fits, so the pack is the first complete starter deck; Fight/Evade events are their action; the grimoire's player windows exist so "any [fast] window" cards play where the rules say; the damage-to-enemy window, since four cards of this one pack need it (Nathaniel, Tommy Malloy, Self-Destructive, Relentless) and every later Guardian pack will.

**Non-Goals:** fast *abilities* on cards in play during player windows (only from-hand plays this change; the trigger is there for a later change to widen); fast windows inside a skill test; multi-select prompts (Taunt engages one enemy at a time, as Healing Words heals a point at a time); bot strategy for the new cards beyond not playing them blindly; the `tom` pack and the rest of the program.

## Diagram (C4-inspired, component level, ASCII; the engine is pure, the browser app the only container)

```
 content/packs/investigator/cards.json (27 cards)        content/packs/investigator/scripts/60129.ts
 content/packs/core/cards.json (designators on 4 events)   (re-exports core 01024 blast, anyWindow)
            |  abilities: onPlay{designator, anyWindow, aoo}, reaction{dealDamage|excessDamage|...}
            v
 +---------------------------------------------------------------------------------------------+
 | src/engine                                                                                  |
 |                                                                                             |
 |  rules/flow.ts                               rules/enemies.ts                               |
 |  +---------------------------------+         +-----------------------------------------+    |
 |  | designatorOf(play) -> onPlay's  |         | DamageEnemy {by, source, key}:          |    |
 |  |   designator; NO_AOO + aoo:false|         |  not windowed: win("dealDamage",        |    |
 |  | playerWindow pushes: mythos     |         |    {inv, enemy, card: source, amount,   |    |
 |  |   after draws, investigation    |         |     key}) then itself windowed          |    |
 |  |   begins, turn begins, after    |         |  windowed: amount += flags[damageBonus] |    |
 |  |   hunters, per investigator's   |         |    cap 1 if enemy has damageCapOne      |    |
 |  |   attacks, upkeep begins        |         |    excess>0: win("excessDamage",{x})    |    |
 |  | actionsTaken (firstAction),     |         |    then DefeatEnemy (adds printed health|    |
 |  |   restrictedActions{designator} |         |    to defeatedHealthThisTurn)           |    |
 |  | StartRound: replenish uses      |         | ResolveAttack cancelled -> still        |    |
 |  +---------------------------------+         |    win("enemyAttacked")                 |    |
 |                                              +-----------------------------------------+    |
 |  rules/cards.ts                              effects.ts                                     |
 |  +---------------------------------+         +-----------------------------------------+    |
 |  | triggered(): playerWindow also  |         | fight {target, auto}; addDamage;        |    |
 |  |   offers hand cards onPlay+     |         | pullEnemy{range,nonElite,then};         |    |
 |  |   anyWindow (canPlay checks)    |         | engageAny{each}; readyCard{filter};     |    |
 |  | canPay/payCost resourcesOrUses  |         | gainActions{onlyFor}; searchAndPlay;    |    |
 |  | UseAbility: damageOnSelf ->     |         | moveTo eventLocation; discoverClues     |    |
 |  |   asset defeat check            |         |   yourOrConnecting; targets             |    |
 |  +---------------------------------+         |   chooseOtherAtLocation, chooseEngaged  |    |
 |                                              | Amount {onSelf}                         |    |
 |  core.ts: conditions firstAction,            +-----------------------------------------+    |
 |    eventSource, eventFromYourLocation,                                                      |
 |    defeatedHealthThisTurn; flag damageCapOne; CardFilter.faction                            |
 +---------------------------------------------------------------------------------------------+
            |  PendingChoice {promptKey "prompt.playerWindow", ability labels ability.<code>.<n>}
            v
 src/ui (unchanged components; strings in content/i18n/{en,ru}/ui.json)
```

## Decisions

1. **A played event's designator comes from its `onPlay` ability.** `Ability.designator` already exists for `action` abilities; `designatorOf({kind: "play"})` reads `playAbility(card)?.designator ?? "play"`, and `actionsThisRound`/`NO_AOO` see it. `Ability.aoo: false` adds the card to `NO_AOO` by itself (Mano a Mano: "does not provoke attacks of opportunity" on a non-fight action). Core's Backstab, Blinding Light, Cunning Distraction, "Get over here!" get `designator` in `core/cards.json`. *Alternative:* infer from `<b>Fight.</b>` in the text — rejected: behaviour lives in `cards.json`, text is the snapshot's (ADR-0006).

2. **Player windows are engine windows.** A trigger `playerWindow` pushed at the grimoire's red boxes: `mythosHandler` after the `MythosDraw` steps; `investigationHandler` after `phaseBegins`; `nextTurnHandler` after `turnBegins`; `enemyPhaseHandler` after `HunterMoves`; `enemyAttacksHandler` after each investigator's last attack (the chart's window between investigators, which for the last one is the window before the phase ends); `upkeepHandler` after `phaseBegins`. `triggered()` for this trigger considers, besides reactions, each investigator's hand cards whose `onPlay` ability has `anyWindow: true` (fast cards only), with `canPlay`'s checks (cost, `cannotPlayAssetsOrEvents`, the ability's condition); `windowHandler` plays the pick as `PlayCard { viaTrigger }`, and `playCardHandler` resolves the `anyWindow` ability when no `fromHand` one exists. A window no one can answer resolves silently (the existing behaviour). *Why:* the window machinery already does the offer/pass/record loop and the bot/replay semantics; the grimoire names exactly where the boxes are, so the list is a specification, not a guess. *Alternative:* a generic "fast step" prompt after every framework event — rejected: more prompts, no rules basis for the extra points. The bot passes on `playerWindow` prompts (one line in `bot.ts`), so a bot playthrough doesn't Dynamite its own location.

3. **A window before an enemy takes damage.** `DamageEnemy` gains `source?: InstId` (the fight's `t.source`, `dealDamage`'s `ctx.source`) and `key`; when `by` is an investigator and not yet `windowed`, it pushes `win("dealDamage", { inv: by, enemy, card: source, amount, key })` then itself `windowed`; the windowed pass adds `flags["damageBonus:<key>"]` (a new effect `addDamage { amount }` writes it, as `preventDamage` writes `prevented:`), caps at 1 when the enemy has flag `damageCapOne` (Tommy Malloy, a constant modifier `scope: "self"`), places the damage, and when `damage > health` pushes `win("excessDamage", { inv: by, enemy, amount: excess })` before `DefeatEnemy`. Self-Destructive is a `forced` on `dealDamage` (its bearer's); Nathaniel a `reaction` on it with `condition: { eventSource: { type: "event" } }` (new condition on `ctx.card`), limit once per phase. *Why:* "when you deal damage … deal 1 additional damage" and "when X would take damage: reduce to 1" are the moment between dealing and placing, the same shape as `attackDealsDamage` (uses-cards-heal-and-ward decision 1). *Alternative:* a modifier `attackDamage` read by `kindResultStage` — rejected: it covers attacks only and can't tell an event's damage from a weapon's; and Self-Destructive needs a trigger, not a number.

4. **Two new state counters per investigator, reset when their turn begins:** `actionsTaken` (incremented in `performActionHandler` when `cost > 0`; condition `firstAction` ⇔ your turn and 0) and `defeatedHealthThisTurn` (`defeatEnemyHandler` adds `def.enemy.health` when `by` is set; condition `defeatedHealthThisTurn: { min }`). Both are game state, serialized, so replays and saves agree. *Alternative:* derive from the event log — rejected: the engine doesn't read its own log for rules.

5. **Restricted actions by designator.** `restrictedActions` entries become `{ trait?: string; designator?: string; left: number }`; `actionsFor` and `performActionHandler` match an entry by the card's trait (Daisy, unchanged) or by the action's designator (Galvanize: `gainActions { amount: 1, onlyFor: "fight" }`). The restricted action is spent first, as today.

6. **New effect ops**, each in `effects.ts` with the existing helpers:
   - `fight` gains `target?: EnemyTarget` (default `chooseAtLocation`) and `auto?: boolean` (→ `autoSucceed`, the field scripts already set); a follow-up attack is `onSuccess: [chooseOne [{fight target eventEnemy …}, {stop}]]`, the `onSuccess` ctx already carrying the enemy.
   - `pullEnemy { range: 1 | 2; nonElite?: true; then: Effect[] }`: enemies within `range` locations (breadth-first over `connections`) minus Elite; choose (auto when one); set its location to yours and engage it (`emit("engage")`, `enemyEngages` window); push `Effects(then)` with `ctx.enemy` set. Both "Get over here!" levels.
   - `engageAny { each: Effect[] }`: a step re-pushed with a `done` list, asking "Engage <enemy>" / "Done" among the enemies at your location not yet chosen; each pick engages (moving it off another investigator) and pushes `Effects(each)` with `ctx.enemy`. Taunt.
   - `readyCard { filter: CardFilter }`: exhausted controlled cards matching the filter; choose (auto when one); ready. `CardFilter` gains `faction`.
   - `searchAndPlay { filter: CardFilter; from: "deckAndDiscard" }`: matching cards of the deck and discard the investigator can afford; choose or "Take nothing"; `PlayCard` (paying its cost) then shuffle the deck. Randall Cho.
   - `moveTo` gains `where: "eventLocation"` (`ctx.location`); `discoverClues` gains `at: "yourOrConnecting"` (choose among those with clues, auto when one).
   - `InvTarget` gains `chooseOtherAtLocation`; `EnemyTarget` gains `chooseEngaged`.
   - `Amount` gains `{ onSelf: "damage" | "horror" | "clues" | "resources" | "doom" }` (tokens on the source card, read even after it was discarded as a cost: Relentless); `placeTokens.damage` accepts an `Amount` (`"X"` = the window's amount).
   - `addDamage { amount }` (decision 3).
   - Found while writing the cards: conditions `enemyNearby { range, nonElite }` ("Get over here!" is only offered with a target; its window prompt would otherwise appear every round) and `eventEnemyInPlay` (One-Two Punch's "fight again" is only offered while the enemy lives); prey `{ only: <investigator code> }` (Tommy Malloy's "Prey - Nathaniel Cho only"); `Ability.aoo` and `Ability.anyWindow` as decisions 1 and 2 say.

7. **Costs and uses.** `Cost.resourcesOrUses: n`: payable when the card's uses or the pool has `n`; paid from the card's uses first (`// ponytail: card first; a prompt if a card ever wants the pool spent first`). `CardDef.replenish: "round"`: `startRoundHandler` sets `uses` back to the printed count for such cards in play; Physical Training (4) carries `discardWhenEmpty: false` so the uses-leave-play rule skips it (as Flesh Ward). After an ability whose cost has `damageOnSelf`/`horrorOnSelf`, `UseAbility` pushes the asset-defeat check (`investigators.ts:134`'s logic, lifted into a function) so Grete Wagner leaves at her third point. `enterLocation` data gains `from` and `ctxFor` passes it as `ctx.from`; condition `eventFromYourLocation` compares it with your location (Safeguard, `usableBy: "anyone"`, `not eventInvestigatorIsYou`). `damageTaken` data gains `enemy` when the `AssignDamage` came from one (Lesson Learned: `eventEnemy: {}`). `resolveAttackHandler` pushes `win("enemyAttacked", …)` in its cancelled branch too (Counterpunch 0).

8. **The cards, in data** (`content/packs/investigator/cards.json`; labels `ability.<code>.<n>` in `ui.json` en/ru):

   | Card | Abilities |
   | --- | --- |
   | 60101 Nathaniel Cho | reaction `dealDamage`, `eventSource {type: event}`, limit 1/phase: `addDamage 1`; elderSign `tokenValue 1`, effects `chooseOne [{condition testKind fight: takeFromDiscard {type: event}}]` |
   | 60102 Randall Cho | reaction `enterPlay` (self): `chooseOne [heal damage 3 | searchAndPlay {asset, Weapon}]` |
   | 60103 Tommy Malloy | `prey: "bearer"`; constant `[{flag: damageCapOne, scope: self}]` |
   | 60104 Self-Destructive | revelation `putInThreatArea`; forced `dealDamage`: `takeDamage 1`; action ×2 `discardSelf` |
   | 60105 / 60127 Boxing Gloves | constant combat +1 / +2 `when: fighting`; reaction `enemyDefeated`, exhaust: `searchDeck top 6 / 9 {event, Spirit}` |
   | 60107 / 60128 Grete Wagner | constant combat +1 (+ intellect +1); reaction `enemyDefeated`, `{exhaust, damageOnSelf 1}`: `discoverClues 1` (`at: yourOrConnecting` at level 3) |
   | 60109 Relentless | reaction `excessDamage`, exhaust: `placeTokens self damage "X"`; fast, `discardSelf`: `gainResources {onSelf: damage}` |
   | 60110 Safeguard | reaction `enterLocation`, `usableBy anyone`, `all [not eventInvestigatorIsYou, eventFromYourLocation]`, exhaust: `moveTo eventLocation` |
   | 60111 Clean Them Out | onPlay `designator fight`, `enemyAtYourLocation`: `gainResources 2`, `fight` |
   | 60112 Counterpunch | reaction `fromHand` `enemyAttacked`: `fight {target: eventEnemy}` |
   | 60122 Counterpunch (2) | reaction `fromHand` `enemyAttacks`: `fight {target: eventEnemy, bonus 2, damageBonus 1}` |
   | 60114 / 60123 "Get over here!" | onPlay `designator fight` (level 2: `anyWindow`): `pullEnemy {range 1 / 2, nonElite, then: [fight target eventEnemy]}` |
   | 60115 Glory | reaction `fromHand` `enemyDefeated`: `drawCards 2` |
   | 60116 Monster Slayer | onPlay `designator fight`, `enemyAtYourLocation`: `fight {damageBonus 1}` |
   | 60117 One-Two Punch | onPlay `designator fight`: `fight {bonus 1, onSuccess: [chooseOne [fight {target eventEnemy, bonus 2, damageBonus 1} | stop]]}` |
   | 60132 One-Two Punch (5) | onPlay `designator fight`: `fight {auto, damageBonus 1, onSuccess: [chooseOne [fight {target eventEnemy, bonus 3, damageBonus 2} | stop]]}` |
   | 60118 Stand Together | onPlay: `gainResources 2 you`, `gainResources 2 chooseOtherAtLocation` |
   | 60120 Evidence! (1) | reaction `fromHand` `enemyDefeated`, `cluesOnYourLocation some`: `chooseOne [{defeatedHealthThisTurn ≥ 4: discoverClues 2}, {else: discoverClues 1}]` |
   | 60121 Galvanize | onPlay `yourTurn`: `readyCard {asset, faction guardian}`, `gainActions {1, onlyFor fight}` |
   | 60124 Lesson Learned | reaction `fromHand` `damageTaken`, `eventEnemy {}`: `discoverClues 2` |
   | 60125 Mano a Mano | onPlay `aoo false`, `all [firstAction, engaged]`: `dealDamage 2 chooseEngaged` |
   | 60126 Overpower (2) | `maxCommitted 1`; onPlay `succeededBy ≥ 0`: draw 1; onPlay `succeededBy ≥ 2`: draw 1 |
   | 60129 Dynamite Blast (3) | `script: true`; `scripts/60129.ts` = core `01024`'s `blast`, ability `{onPlay, anyWindow, run: blast}` |
   | 60130 Taunt (3) | onPlay `anyWindow`: `engageAny {each: [dealDamage 1 eventEnemy, drawCards 1]}` |
   | 60131 Physical Training (4) | `replenish round`, `discardWhenEmpty false`; fast ×2 `yourSkillTest`, `resourcesOrUses 1`: `modify willpower/combat +1 until test` |

   Nathaniel's elder sign uses `chooseOne`'s per-option condition as the "if during an attack" test: with the condition false the option list is empty and nothing happens. Stand Together with no other investigator at the location gains only Nathaniel his 2 (the target finds nobody); the card is rarely playable alone and a condition for it is not worth a vocabulary entry.

9. **`ENGINE_VERSION` 4.** New windows and prompts; a version-3 save restarts its scenario with its campaign kept, as the store already does.

## Risks / Trade-offs

- [Six player windows per round could mean six new prompts] → a window asks only when some hand holds an `anyWindow` card its owner can pay for; a test asserts a round with none asks nothing new; the bot passes them.
- [The `dealDamage` window runs on every point of enemy damage] → it opens only for damage `by` an investigator and resolves silently without a reaction or forced ability (like `attackDealsDamage`); a test asserts a plain Machete attack asks nothing new.
- [Nathaniel's "by an event or a fight ability on an event" read as "the source card is an event"] → `eventSource {type: event}` is exactly that: Clean Them Out's and Counterpunch's attacks count, Boxing Gloves' doesn't; a skill card's icons don't make the source an event.
- [Taunt as one-at-a-time engagement] → same pattern as the heal-point-by-point prompt; the UI shows "Engage X / Done".
- [Dynamite Blast (3) shares code with (0)] → the script imports the core script's function; no second copy.
- [Fast abilities in play still can't be used in player windows] → out of scope and stated; the trigger is the hook for that later change.
- [`anyWindow` cards during the mythos phase can't see "your turn"] → their conditions don't use `yourTurn`; `canPlay`'s own-turn check is skipped for them in windows.

## Migration Plan

Engine, schema and content in one change; `ENGINE_VERSION` 4 (version-3 saves restart their scenario, campaign kept). Rollback: revert.

## Open Questions

None. No in-force ADR needs revisiting; decision 2 is a new durable commitment the adr step records.
