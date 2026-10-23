## Why

Nathaniel Cho's starter deck (pack `nat`, 28 cards) is playable in the deck builder but not in the game: 27 of its cards have no behaviour in `content/packs/investigator/cards.json`, so coverage reports 1 of 28 working. The first thing a player meets is "Clean Them Out" sitting in the hand with nothing to do: an event without an `onPlay` ability is treated by `canPlay` as a trigger-only card and is never offered. The pack is the first row of the campaign program's starter-deck section, and its cards are all the Guardian fight events, so writing them also settles how Fight events, damage bonuses and player windows work for every pack after it.

## What Changes

- **Every `nat` card works**, in data where the vocabulary allows and one script (Dynamite Blast 3 reusing the core Dynamite Blast): Nathaniel Cho (reaction and elder sign), Randall Cho, Tommy Malloy, Self-Destructive, Boxing Gloves (0, 3), Grete Wagner (0, 3), Relentless, Safeguard, Clean Them Out, Counterpunch (0, 2), "Get over here!" (0, 2), Glory, Monster Slayer, One-Two Punch (0, 5), Stand Together, Evidence! (1), Galvanize, Lesson Learned, Mano a Mano, Overpower (2), Dynamite Blast (3), Taunt (3), Physical Training (4). Coverage reports the pack complete and Nathaniel's investigator entry true.
- **A Fight/Evade/Engage event is that action.** An `onPlay` ability carries an action designator; playing it counts as that action, so it provokes no attack of opportunity and counts for "first time you fight each round". Core's Backstab, Blinding Light, Cunning Distraction and "Get over here!" get their designators too (same bug).
- **Player windows.** The grimoire's red _Player Window_ boxes become engine windows (`playerWindow`): after the mythos encounter draws, when the investigation phase begins, when a turn begins, after hunter moves, before each investigator's enemy attacks and after the last, when upkeep begins. A fast event printed "Play during any [fast] window" can be played in them (Dynamite Blast 3, "Get over here!" 2, Taunt 3). A window nobody can answer asks nothing.
- **Damage dealt to an enemy has a window.** Before an enemy takes damage from an investigator, a `dealDamage` window opens naming the source; effects can add to the amount (Nathaniel's +1 by an event), react to it (Self-Destructive), and an enemy can cap what it takes (Tommy Malloy: reduced to 1). Excess damage over an enemy's remaining health opens `excessDamage` (Relentless).
- **Vocabulary additions**, each needed by two or more of the cards or by a card the vocabulary cannot otherwise express: `fight` with a target, auto-success and a follow-up attack; `pullEnemy` (move a non-Elite enemy within range to you, engage, then attack); `engageAny` with per-enemy effects; `readyCard` by filter; `gainActions` restricted to a designator; `searchAndPlay` from deck and discard; `moveTo` the triggering location; `discoverClues` at your location or a connecting one; a `chooseOtherAtLocation` and `chooseEngaged` target; conditions `firstAction`, `eventSource`, `eventFromYourLocation`, `defeatedHealthThisTurn`; cost `resourcesOrUses`; a card's uses that replenish each round; `Amount` of tokens on the card itself; an ability that provokes no attack of opportunity.
- **Two fixes the cards exposed:** the `enemyAttacked` window opens even when the attack was cancelled (Counterpunch 0 says so); a cost that damages the asset itself defeats it at its health (Grete Wagner).
- `ENGINE_VERSION` 3 → 4: a saved scenario in progress restarts (campaign kept), as for every rules change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: Basic actions (an event's action designator; no attack of opportunity for a Fight/Evade/Engage event or an ability that says so); Round structure (player windows at the grimoire's points); Enemies (the window before an enemy takes damage, bonuses, caps, excess; the attacked window after a cancelled attack); Player cards in play (uses replenished each round; a cost paid from uses or the pool; an asset defeated by its own cost).
- `card-content`: Data-driven card effects (the vocabulary additions above; the `nat` pack's cards declared); Every cycle's cards as data (the `nat` pack reported complete).

## Impact

- `src/engine/rules/flow.ts` (designator of a played event, player windows, restricted actions by designator, first-action tracking, uses replenished at round start), `src/engine/rules/enemies.ts` (`DamageEnemy` window, cap, excess; `enemyAttacked` after a cancelled attack), `src/engine/rules/cards.ts` (player-window offers of `anyWindow` cards, `resourcesOrUses`, asset defeat on `damageOnSelf`, `aoo: false`), `src/engine/effects.ts` (new ops and targets), `src/engine/core.ts` (new conditions, flag), `src/content/schema.ts`, `src/content/implemented.ts` (no new line rules needed: every card gets abilities).
- `content/packs/investigator/cards.json` (27 cards), `content/packs/investigator/scripts/60129.ts`, `content/packs/core/cards.json` (designators on four events), `content/i18n/{en,ru}/ui.json` (ability labels, the player-window prompt).
- `content/coverage.json` regenerated; `docs/campaign-program.md`: `nat` ticked, `core` counts unchanged.
- Saves: `ENGINE_VERSION` 4.
