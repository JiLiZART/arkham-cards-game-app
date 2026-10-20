## 1. Engine: actions and windows

- [x] 1.1 A played event's designator: `designatorOf` reads the `onPlay` ability's `designator`; `Ability.aoo: false` joins `NO_AOO`; `actionsTaken` per investigator (reset at turn begin) and condition `firstAction`; core's Backstab, Blinding Light, Cunning Distraction, "Get over here!" get designators; tests: Backstab engaged with a ready Ghoul provokes no attack; Draw still does; `firstAction` true before and false after an action.
- [x] 1.2 Player windows: trigger `playerWindow` pushed at the six chart points (mythos after draws, investigation begins, turn begins, after hunter moves, before each investigator's attacks and after the last, upkeep begins); `triggered()` offers hand cards with `onPlay` + `anyWindow` (fast, affordable, condition holds); `playCardHandler` resolves the `anyWindow` ability via trigger; prompt key `prompt.playerWindow` en/ru; the bot passes; tests: a round with no such card asks nothing new; a Taunt in hand is offered after hunter moves and not during another investigator's turn.
- [x] 1.3 The damage window: `DamageEnemy { source, key, windowed }` opens `dealDamage` (by an investigator only), applies `damageBonus:<key>`, caps at 1 under flag `damageCapOne`, opens `excessDamage` with the excess before `DefeatEnemy`; `defeatedHealthThisTurn` per investigator and its condition; effect `addDamage`; condition `eventSource`; `fight` passes `t.source`, `dealDamage` passes `ctx.source`; `enemyAttacked` also after a cancelled attack; tests: a Machete attack asks nothing new; `addDamage` in the window adds; the cap applies after the bonus; excess of 2 reported; the attacked window after Dodge.

## 2. Engine: effects, costs, uses

- [x] 2.1 `fight { target, auto }`; `pullEnemy`; `engageAny`; `readyCard` (+ `CardFilter.faction`); `gainActions { onlyFor }` with `restrictedActions` by designator; `searchAndPlay`; `moveTo eventLocation` (+ `from` on `enterLocation`, condition `eventFromYourLocation`); `discoverClues at yourOrConnecting`; targets `chooseOtherAtLocation`, `chooseEngaged`; `Amount { onSelf }`; `placeTokens.damage` as `Amount`; `damageTaken` carries the enemy; schema, `EFFECT_OPS`, validation; a unit test per op.
- [x] 2.2 `Cost.resourcesOrUses` (card first); `CardDef.replenish: "round"` restored at `StartRound`; asset-defeat check after a cost with `damageOnSelf`/`horrorOnSelf`; tests: Physical Training 4 pays from the card then the pool and is refilled next round, never discarded; Grete leaves at her third point.
- [x] 2.3 `ENGINE_VERSION` 4; test that a version-3 save restarts its scenario with its campaign kept.

## 3. The cards

- [x] 3.1 Events: Clean Them Out, Monster Slayer, Glory, Counterpunch (0, 2), "Get over here!" (0, 2), One-Two Punch (0, 5), Stand Together, Evidence! (1), Galvanize, Lesson Learned, Mano a Mano, Taunt (3), Dynamite Blast (3, `scripts/60129.ts` reusing core 01024); labels en/ru; a test per card following the spec's scenarios (Clean Them Out's resources before the test; One-Two Punch's second attack and stop; "Get over here!" pulls and engages, Elite not offered; Counterpunch 0 after a cancelled attack; Evidence! 1 vs 2 clues; Galvanize's action usable only to fight; Mano a Mano only first, no attack of opportunity).
- [x] 3.2 Assets and skill: Boxing Gloves (0, 3), Grete Wagner (0, 3), Relentless, Safeguard, Physical Training (4), Randall Cho, Overpower (2); labels en/ru; tests (Boxing Gloves' search finds a Spirit event in the top 6; Grete's clue and her defeat; Relentless stores excess and cashes it; Safeguard offered only for a move from your location; Randall heal or search-and-play; Overpower draws 1 or 2).
- [x] 3.3 Nathaniel Cho, Tommy Malloy, Self-Destructive; tests (Nathaniel's +1 by Monster Slayer, not by Boxing Gloves, once per phase; elder sign returns an event only during an attack; Tommy takes 1 of 3; Self-Destructive deals its bearer 1 when he damages an enemy, and its two-action discard).
- [x] 3.4 `npm run coverage`: `nat` 28 of 28, `investigators["60101"]` true; `docs/campaign-program.md`: `nat` row ticked, `core` counts unchanged.

## 4. Verification

- [ ] 4.1 Browser: Nathaniel Cho in The Gathering: Clean Them Out playable from the hand, gains 2 resources then fights with no attack of opportunity; Boxing Gloves' search after a defeat; Taunt offered after the hunter move in the enemy phase and resolved before the attacks; in English and Russian; 0 console errors.
- [x] 4.2 `npm test`, lint, typecheck, build, `check:content` by exit code; `openspec validate nat-pack-cards --type change --strict`.
