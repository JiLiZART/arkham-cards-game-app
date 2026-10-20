## 0. Before starting

- [x] 0.1 `nat-pack-cards` is archived (its game-engine requirements are the base of this delta); `ENGINE_VERSION` reads 4.

## 1. Attacks and evasion

- [x] 1.1 A failed attack on an enemy engaged with one other investigator deals its damage to them (not massive, no attack window); tests: the spec's two scenarios.
- [x] 1.2 `attackable` predicate: no Fight option and no fight-effect target for an unengaged aloof enemy; Engage still offered; test.
- [x] 1.3 Trigger `successfulEvade` pushed only by a successful evade test; automatic evade keeps `enemyEvaded` only; tests: Cunning Distraction with Pickpocketing draws, a stand-in `successfulEvade` reaction is not offered; a tested evasion offers both.

## 2. Skill tests

- [x] 2.1 A helper's commit window closes after one card; update the existing test that commits two helper cards; test the spec scenario.
- [x] 2.2 Auto-fail counts the value as 0, auto-success the difficulty as 0; reveal skipped when the result is known; tests: Rotting Remains on the auto-fail token (3 horror), One-Two Punch (5) with Overpower (2) reveals nothing and draws 2.

## 3. Defeat and elimination

- [x] 3.1 Drawing with an empty deck and an empty discard pile defeats at once (1 mental trauma, no horror first); test.
- [x] 3.2 Eliminated investigator's weaknesses resolve `gameEnd` before leaving; test: Cover Up with clues gives 1 mental trauma at defeat.

## 4. Cards in play

- [x] 4.1 Unique: `canPlay`, `searchAndPlay`, `putSetAsideIntoPlay` refuse a title already in play; a unique encounter card entering play discards the player card with its title; tests: Grete Wagner 0 in play, level 3 not offered; Randall's search skips a unique already in play.
- [x] 4.2 A card leaving play clears its usage counters; test: a once-per-round ability usable again after the card returns.
- [x] 4.3 A resolved treachery with victory goes to the victory display; test with a stand-in victory value on a core treachery.

## 5. Timing

- [x] 5.1 Each non-massive enemy exhausts after its own attack; massive after its last; test: the spec scenario, and a massive enemy still attacks two investigators.
- [x] 5.2 Upkeep: the player window before readying; test.
- [x] 5.3 Round end: "round" modifiers expire before the `roundEnds` window; test: On the Lam expired when Dissonant Voices discards.
- [x] 5.4 "Advance act" in player windows (lead, once per window, when the group can pay); en/ru label; bot takes it; tests: offered in the enemy phase window, not offered without the clues.

## 6. Version and verification

- [x] 6.1 `ENGINE_VERSION` 5; test that a version-4 save restarts its scenario with its campaign kept.
- [x] 6.2 `npm test`, lint, typecheck, build, `check:content`, a bot playthrough of each Night of the Zealot scenario reaching a resolution; `openspec validate rules-alignment --type change --strict`.
