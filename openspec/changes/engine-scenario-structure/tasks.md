## 1. Act and agenda decks, versions, the scenario card

- [ ] 1.1 Failing driver test `src/engine/__tests__/actAgendaDecks.test.ts`: a scenario with agenda decks `a` and `c`; mythos doom asks the lead which agenda; only the deck at its threshold advances; three act decks each advance on their own; `currentAct(game)` on a one-deck scenario is unchanged.
- [ ] 1.2 `world/constants.ts`: `PILE` act and agenda decks by name, `ZONE.Scenario`; `world/types.ts`: `GameState.acts`/`agendas: Record<string, InstId | null>` replacing `act`/`agenda`; `context.ts`: `currentAct(game, deck = "a")`, `currentAgenda`, `currentActs`, `currentAgendas`; the boundary test's `game.s` touch list unchanged.
- [ ] 1.3 `src/content/schema.ts`: `ScenarioDef.acts`/`agendas` as `Entry[]` or `Record<string, Entry[]>`, `Entry = string | { oneOf: string[]; when?: LogCondition }`; `index.ts createGame` builds each deck, picks versions by `when` else at random, creates the scenario reference card in `ZONE.Scenario`.
- [ ] 1.4 `rules/scenario.ts`: `AdvanceAct`/`AdvanceAgenda` with `deck`; `checkDoomHandler` over every agenda deck; `placeDoomHandler` asks `doomOnWhichAgenda` when several; `resetDeck` effect op; `tokenX("actStage")` by deck; `queries.ts canAdvanceAct` per deck; `legalTurnActions` offers each deck's advance.
- [ ] 1.5 UI: the map draws one stack per act and agenda deck (`src/ui/scene/`, the act/agenda viewer); the scenario card is an instance the strip can show; `content/i18n/{en,ru}/ui.json` prompt strings.

## 2. Faces and story cards

- [ ] 2.1 Failing test `faces.test.ts`: flipping 03078 keeps clues and attachments and shows 03078b out of the asset area; flipping a story card into an enemy puts it in `ZONE.Enemy` at the named location; a scenario listing 03076a and 03076b creates one card; `resolveStory` shows the text and applies `after`.
- [ ] 2.2 Loader (`src/content/`): a `Xb` code is `db.cards[X].back`; `createGame` and every setup op refuse to create a `b` code; `check:content` reports a scenario file that lists a `b` code in `setAside`, `putIntoPlay` or a side deck.
- [ ] 2.3 `world/types.ts CardInst.face`; `context.ts flip()`, `swap()`; `STEP.Flip`, `STEP.ResolveStory` handlers in `rules/scenario.ts` with `EVENT.Flip`, `EVENT.StoryShown`; schema `story: { after: "flipBack" | "remove" | "stay" }`; effect ops `flip`, `swap`, `resolveStory`; hook `storyResolved`; verbs `flip`, `resolveStory` in `api.ts` (pin in `scriptApi.test.ts`).
- [ ] 2.4 UI: `CardFace` draws the shown face; `CardDetail` offers the other face; a story page component (own folder) stops the event clock on `StoryShown` (`ui-event-conductor` claim kind).

## 3. Cards beneath cards

- [ ] 3.1 Failing test `beneath.test.ts`: three cards beneath an agenda in order, out of play, counted by a token X; `drawBeneath` from a location empties its pile; a card beneath the scenario card can be spawned from there; the pile is discarded when its holder leaves play; `flags.beneath` and `underAct` no longer exist.
- [ ] 3.2 `PILE beneath:<InstId>`, `ZONE.Beneath`; `movement.ts moveCard` into and out of a beneath pile; holder leaving play moves the pile per `beneathOnLeave`; `store.ts` snapshot lists beneath piles; `flags.ts` drops `beneath`/`underAct`; `rules/tokens.ts elitesInVictoryOrUnderAct` reads the act's pile; the three scripts using them rewritten (Smoke and Mirrors, the core act pile users).
- [ ] 3.3 Effect ops `putBeneath`, `drawBeneath`, `revealBeneath`, `shuffleBeneath`, `moveBeneath`; `Amount.beneathCount`, `Condition.beneath { target, min, max }`, `TokenEffect.x` `beneathCount` and `locationsWithoutCardBeneath`; setup step `putBeneath`; verbs in `api.ts`; reads `cardsBeneath`.
- [ ] 3.4 UI: the card frame shows the beneath count; the detail lists the pile for the holder's controller (facedown to others is not enforced online: online-play spec).

## 4. Location removal, the void, locations in the encounter deck

- [ ] 4.1 Failing test `locationRemoval.test.ts`: removing a car defeats the investigator there, discards its enemies, sends a Victory 1 car with no clues to the display, fires `locationLeavesPlay`; the Hunting Horror in the void keeps Shadow-spawned and its damage and is found by a search over `["deck", "discard", "void"]`; a location drawn from the encounter deck enters play connected to the drawer; `discardEncounterUntil { type: "location" }` stops at one.
- [ ] 4.2 `ZONE.Void`; `movement.ts` keeps attachments and counters on a move to the void; `STEP.RemoveLocation` handler in `rules/scenario.ts`; hook `locationLeavesPlay` in `ScriptHooks`; verbs `removeLocation`, `toVoid`, `fromVoid`; effect ops of the same names; `effects/encounter.ts` search ops gain `zones`.
- [ ] 4.3 `ScenarioDef.encounterLocations`, `sideDecks` with location sets; `index.ts` routes them; `drawEncounterHandler`/`revelationHandler` put a location into play (`putIntoPlay { connectedTo: "you" }` default); `discardEncounterUntil` type location.
- [ ] 4.4 UI: a void shelf beside the map (dimmed card, off the connections), read through the presented table.

## 5. Random setup ops

- [ ] 5.1 Failing test `randomSetup.test.ts`: `chooseRandom` one of two set aside with the other removed; `chooseRandom` an agenda with the other's back set aside; `removeRandom` 3 from a side deck of 8; `shuffleSetAside`; `putRandomIntoPlay` with a filter; the same seed gives the same picks on replay.
- [ ] 5.2 Schema `SetupStep` entries `chooseRandom`, `removeRandom`, `shuffleSetAside`, `putRandomIntoPlay { filter }`; `index.ts applySetupStep` handlers drawing from `randInt(game.s, …)`.

## 6. Reveal trigger, would-be-defeated, scenario facts

- [ ] 6.1 Failing test `revealTrigger.test.ts`: entering an unrevealed location with a `revealed` ability runs it for the revealer after its clues; a forced one needs no choice.
- [ ] 6.2 `revealLocationHandler` emits `LocationRevealed` and opens `afterReveal`; `Ability.trigger: "revealed"`; `implemented.ts` counts "After you reveal this location" lines.
- [ ] 6.3 Failing test `wouldBeDefeated.test.ts`: a scenario hook keeps an investigator at horror ≥ sanity; a card replacement heals instead; an enemy replacement shuffles it into a deck; without a replacement, defeat is unchanged and the fuzz test's step count does not grow.
- [ ] 6.4 `checkDefeatHandler` and `defeatEnemyHandler` open `wouldBeDefeated` when a replacement exists; ability kind `wouldBeDefeated`; hook `wouldBeDefeated` in `ScriptHooks`; cancel through `cancelEvent`.
- [ ] 6.5 `campaign/campaign.ts`: `ScenarioFacts.resigned` and `defeated` lists; `campaign/flow.ts` conditions `anyResigned`, `anyDefeated`, `allResigned`; test in `src/engine/campaign/__tests__/`.

## 7. Conditional token modifiers, spawn expressions, prey

- [ ] 7.1 Failing test in `rules/__tests__/tokens.test.ts`: a skull with `instead: { when: { horror: { min: 3 } }, modifier: -3 }` reads −3 at 3 horror and −1 at 2.
- [ ] 7.2 `TokenEffect.instead` in the schema; `rules/skillTest.ts` reads it where the symbol modifier is computed; `implemented.ts tokensReal` counts it.
- [ ] 7.3 Failing test `spawnExpressions.test.ts`: "any empty Arkham location" offers the two empty ones; "nearest Prison" picks the nearest; "connected to you, unrevealed if able" prefers an unrevealed neighbour; `prey: { nearestTo: { trait: "Cultist" } }` engages the investigator nearest a Cultist.
- [ ] 7.4 Schema `Spawn` expression and `prey.nearestTo`; `queries.ts spawnTargets`; `spawnHandler` and `preyCandidates`; `implemented.ts spawnResolves` over expressions; read `spawnTargets` in `api.ts`.

## 8. Interludes, checkpoints, vehicles, named tokens

- [ ] 8.1 Failing test `interlude.test.ts`: an agenda back's `readInterlude` pauses on a `CHOICE.Generic` with the interlude's options; the answer is recorded as a note; replaying the choices reproduces it.
- [ ] 8.2 `STEP.ReadInterlude`, `ScenarioDef.interludes`, effect op and verb `readInterlude`, `EVENT.Interlude`; story page UI reuses 2.4's component.
- [ ] 8.3 Failing test `checkpoint.test.ts`: a resolution with `checkpoint: true` writes location, clue, token, story-asset and per-investigator notes, awards no XP; a `fromCheckpoint` setup step rebuilds the table from those entries.
- [ ] 8.4 `Resolution.checkpoint`, `campaign.ts` checkpoint notes, `flow.ts applyScenarioEnd` skipping XP and upgrades for a checkpoint, setup step `fromCheckpoint`.
- [ ] 8.5 Failing test `vehicles.test.ts`: enter and leave are fast actions once per round; a moving vehicle carries its occupants and opens their enter windows; `noVehicles` blocks entering.
- [ ] 8.6 `keywords: "vehicle"`, `InvRecord.vehicle`, `STEP.EnterVehicle`/`LeaveVehicle` in `rules/investigators.ts`, `legalTurnActions` offers, `Move` of a vehicle pushes `Arrive` per occupant, flag `noVehicles`; `implemented.ts` KEYWORD gains `vehicle`; `kw.vehicle` strings.
- [ ] 8.7 Failing test `namedTokens.test.ts`: `placeTokens { name: "ward", amount: 2 }` on a location; `Condition.tokens` and `Amount.tokensOn` read it; an investigator holds named tokens too.
- [ ] 8.8 `tokens` table on `CardInst` and `InvRecord`; ops `placeTokens`, `removeTokens`, `moveTokens`; amount, condition and `tokenX` sources; verbs and reads; the card frame shows name and count.

## 9. Verification

- [ ] 9.1 `ENGINE_VERSION` 8 in `src/engine/index.ts`; `scriptApi.test.ts` pinned to the new export list; `boundary.test.ts` passes; the replay corpus replays unchanged (re-recorded by the script only if the `acts`/`agendas` shape changes a snapshot).
- [ ] 9.2 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm coverage`, `pnpm check:content`; `openspec validate engine-scenario-structure --type change --strict`.
