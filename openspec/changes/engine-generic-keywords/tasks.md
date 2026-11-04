## 1. Keywords as data

- [x] 1.1 Failing test in `src/content/implemented.test.ts`: a card with `{ patrol: { nearest: true, noElite: true } }` counts its "Patrol (…)" line as working; the same card with `["patrol"]` alone does not; `{ bonded: "05313" }`, `{ swarming: 2 }`, `hidden`, `relentless`, `veiled`, `exile`, `{ predator: "Civilian" }`, `{ researched: { log: "…" } }` are accepted by the schema.
- [x] 1.2 `src/content/schema.ts`: `Keyword` union; `keywords: z.array(Keyword)`; `src/content/implemented.ts KEYWORD` over entries; `src/engine/queries.ts hasKeyword` matches an object's key, `keywordArg` returns it; UI code that lists keywords reads the key (`src/ui/game/glossary.ts keywordsOf`).
- [x] 1.3 `scripts/import-cards.ts`: parse "Patrol (…)" through the spawn-expression words, "Swarming X", "Bonded (Name)", "Predator (Trait)" and the bare keywords; `pnpm import:cards` for every pack; `pnpm coverage`.
- [x] 1.4 `content/i18n/{en,ru}/ui.json`: `kw.relentless`, `kw.hidden`, `kw.exile`, `kw.researched`, `kw.predator`, `kw.veiled` (name and text after the Grimoire and the inserts); `glossary.test.ts`.

## 2. Patrol

- [x] 2.1 Failing driver test `src/engine/__tests__/patrol.test.ts`: a Patrol enemy two steps from its target moves one step before hunters; a tie asks the lead; a blocked path cancels; at the target it stays; agenda `grantKeyword` gives Patrol to every enemy; a `patrolTarget` hook overrides the expression.
- [x] 2.2 `STEP.PatrolMoves` in `steps/step.ts` and `world/types.ts`; `patrolMovesHandler` in `rules/enemies.ts` using `spawnTargets`, `distances`, `stepsToward`, `canEnemyEnter`; `enemyPhaseHandler` pushes it first; `ScriptHooks.patrolTarget`; effect op `grantKeyword`; `EVENT.EnemyMove` reused; `rulesAlign.test.ts` enemy-phase order.

## 3. Relentless and Predator

- [x] 3.1 Failing test `relentless.test.ts`: a Relentless enemy attacks, readies, attacks again, then is exhausted; once per phase.
- [x] 3.2 `enemyAttackHandler`: relentless re-attack through `flags.relentlessDone`; `implemented.ts` gains `relentless`.
- [x] 3.3 Failing test `predator.test.ts`: a ready unengaged Predator (Civilian) attacks the Civilian at its location after the attacks; the prey's defeat carries `via: "predator"`; an engaged predator does not.
- [x] 3.4 `STEP.PredatorAttacks` and handler in `rules/enemies.ts`; `DamageEnemy { by: enemy }`; `EVENT.EnemyDefeated` data `via`; `enemyPhaseHandler` pushes it last.

## 4. Swarming

- [x] 4.1 Failing test `swarming.test.ts`: Swarming 2 drawn by Daisy puts her top 2 cards beneath; three attacks in the enemy phase; damage goes to a swarm card first and carries over; the host is not defeated while swarm remains; a swarm card returns to the bottom of her deck; evade exhausts all; `addSwarm { amount: 1 }` adds one; the lead's deck is used when no investigator drew the host.
- [x] 4.2 `CardInst.swarmOf`; `spawnHandler`/`EnterPlay` for a swarming enemy calls `addSwarm`; `enemyAttackHandler` one `EnemyAttack` per swarm card; `damageEnemyHandler` and `defeatEnemyHandler` swarm rules; evade and exhaust across the pile; op and verb `addSwarm`; `EVENT.SwarmDefeated`; the enemy frame shows the swarm count.

## 5. Hidden and Veiled

- [x] 5.1 Failing test `hidden.test.ts`: Whispers in Your Head goes to the drawer's hand with `hidden`; hand size counts it (and ×3 at Backstage); a discard-from-hand effect skips it; its own action discards it to the encounter discard; its forced ability triggers from the hand.
- [x] 5.2 `revelationHandler` hidden path; `CardInst.hidden`; `handLimit` and `flags.hiddenCountsAs`; discard ops and hand targets skip hidden; `rules/cards.ts triggered()` reads hidden hand cards as threat-area cards; `discard()` of a hidden card to the encounter discard; `EVENT.HiddenDrawn`; the hand draws it facedown for other seats (`src/ui/hud/Hand`).
- [x] 5.3 Failing test `veiled.test.ts`: at a Veiled location with no clues the flip action is offered; with clues it is not; taking it flips and resolves the story.
- [x] 5.4 `legalTurnActions` offers the Veiled flip (`rules/round.ts`), pushing `Flip` and `ResolveStory`; `implemented.ts` gains `veiled`.

## 6. Exile, Researched, Bonded

- [x] 6.1 Failing test `src/engine/campaign/__tests__/exile.test.ts`: `exile` removes the card and lists it in `ScenarioFacts.exiled`; the campaign's deck loses one copy; `deckChangeCost` prices buying it back at its level and a level 0 card at 0 while the deck is short; the upgrade screen lists it.
- [x] 6.2 Effect op and verb `exile`; `GameState.exiled`; `campaign.ts` facts; `CampaignInvestigator.exiled`; `upgrade.ts deckChangeCost`; `CampaignState.version` bump; the deck builder's exiled list and strings.
- [x] 6.3 Failing test `researched.test.ts`: Acidic Ichor is refused without the log entry, refused with the entry but without replacing Strange Solution, accepted as the replacement with the entry; a standalone deck is refused.
- [x] 6.4 `validateDeck(db, deck, log?)` and `whyNotReplace` with the researched gate (`upgrade.researched` reason); the deck builder passes the campaign log.
- [x] 6.5 Failing test `bonded.test.ts`: Hallowed Mirror in a deck creates three Soothing Melody set aside for its owner; `searchBonded` finds them; `putBondedInHand` moves one; a deck listing 05314 is refused; `fromArkhamDb` drops bonded cards; the deck size ignores them.
- [x] 6.6 `index.ts createGame` bonded setup; ops `searchBonded`, `putBondedIntoPlay`, `putBondedInHand`; `validateDeck` bonded rule; `fromArkhamDb`; the catalog and deck builder show bonded cards under their host.

## 7. Verification

- [x] 7.1 `ENGINE_VERSION` 9; `scriptApi.test.ts` pinned to the new exports; the replay corpus replays unchanged.
- [x] 7.2 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm coverage`, `pnpm check:content`; `openspec validate engine-generic-keywords --type change --strict`.
