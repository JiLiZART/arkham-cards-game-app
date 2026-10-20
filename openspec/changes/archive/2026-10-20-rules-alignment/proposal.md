## Why

The engine was built from the rulebook and from the cards it had to run; it has never been checked line by line against the Arkham Grimoire (`inspired/arkham_grimoire-web.md`), the game's complete rules reference. An audit of the glossary, the framework-event chart and the skill-test timing against the engine's handlers found the structure right (round, phases, player windows, the eight skill-test steps, damage assignment, spawn, hunter, massive, retaliate/alert, peril, surge, mulligan, hand size, elimination) and a set of rules that the engine gets wrong or leaves out. Several of them change who takes damage, how much experience is earned, or how many cards a helper can commit, so a player who knows the rules sees the game cheat. Each pack change from now on writes cards against these rules, so they should be right first.

## What Changes

- **A failed attack on an enemy engaged with one other investigator deals the enemy's attack damage to that investigator** (Fight Action).
- **An unengaged aloof enemy cannot be attacked** (Aloof); the Fight option and fight effects skip it.
- **Another investigator at the location commits at most one card** to a skill test; the tester commits any number (ST.2).
- **Automatic failure counts the skill value as 0, automatic success counts the difficulty as 0**, so "for each point you fail/succeed by" reads the right margin; **a result known before the reveal skips the chaos token** (Automatic Failure/Success). **Automatically evading is not a successful evasion**: "after an enemy is evaded" abilities (Pickpocketing, Ruth Turner) still trigger, "after you successfully evade" ones do not.
- **Drawing from an empty deck with an empty discard pile defeats the investigator at once** with 1 mental trauma (Drawing Cards).
- **Unique**: a unique card cannot be played or put into play while a copy with its title is in play; a unique encounter card entering play discards the player card with its title.
- **A resolved treachery with Victory X goes to the victory display** instead of the discard pile.
- **Timing brought to the chart**: each enemy exhausts after its own attack (3.3); the upkeep phase's player window comes before cards ready (4.1–4.3); "until the end of the round" lasting effects expire before "at the end of the round" abilities; the act can be advanced with clues in any player window, not only during a turn; a card that leaves play and re-enters has its "limit X per period" reset.
- **An eliminated investigator's weaknesses with "when the game ends" abilities resolve at elimination**, then leave the game (Elimination).
- Out of scope, with the `core_2026` pack: the keywords doomed, elusive, patrol, starting and hidden.
- `ENGINE_VERSION` 4 → 5 (saves restart their scenario, campaign kept).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: Basic actions (failed attack on another's enemy, aloof), Skill tests (one card per helper, auto results, skipped token, automatic evasion), Round structure (upkeep window before readying, lasting effects before "at the end of the round"), Act and agenda decks (act advance in any player window), Enemies (exhaust after each attack), Damage, horror and defeat (empty deck and discard; weaknesses at elimination), Player cards in play (unique; limits reset on re-entry), Encounter deck and treacheries (victory display).

## Impact

- `src/engine/rules/skillTest.ts` (commit window, result margin, reveal skip, failed-fight damage), `src/engine/rules/flow.ts` (Fight options, upkeep order, round-end expiry, act advance in player windows), `src/engine/rules/enemies.ts` (exhaust per attack), `src/engine/rules/investigators.ts` (empty-deck defeat, elimination weaknesses), `src/engine/rules/cards.ts` (unique, limit keys by entry into play), `src/engine/rules/scenario.ts` (treachery victory), `src/engine/effects.ts` (aloof targets, automatic evade window).
- Existing tests that encode today's behaviour (a helper committing two cards, auto-fail margins) change with the spec.
- Depends on `nat-pack-cards` being archived first: its player windows and its versions of Basic actions, Round structure, Enemies and Player cards in play are the base this delta modifies.
