## Context

The engine is a queue of steps run by handlers (`src/engine/rules/*.ts`), with windows (`win(trigger, data)`) for "when/after" timing, temporary modifiers with a duration, and per-ability usage counters in `g.s.usage`. An audit against the Arkham Grimoire (proposal) found fourteen places where a handler does something the grimoire doesn't, each local to one handler. This change depends on `nat-pack-cards` (player windows, the `dealDamage` window, `ENGINE_VERSION` 4) being archived first.

In-force ADRs: 0001–0014. ADR-0014 (player windows are engine windows) is where act advancement in any window goes. ADR-0013 (a card works when every printed line is accounted for) is unaffected: no card's data changes. ADR-0004 (deciding is game state) holds: every new choice is a recorded pending choice.

## Goals / Non-Goals

**Goals:** each requirement of the delta spec, with a test per scenario; existing tests that encode the old behaviour updated, not deleted.

**Non-Goals:** the keywords doomed, elusive, patrol, starting and hidden (with `core_2026`); fast abilities of cards in play in player windows (ADR-0014 follow-up); the lead choosing among several spawn locations (the grimoire gives that choice to the spawning investigator; the engine asks the lead: same player in solo, a follow-up for multiplayer).

## Diagram (C4-inspired, component level, ASCII; one container, the browser app, the engine pure inside it)

```
                         +-------------------------- src/engine ---------------------------+
                         |                                                                  |
 turn / window prompts   |  rules/flow.ts              rules/skillTest.ts                   |
 ------------------------>  - Fight options: no        - commit: helper's window closes     |
                         |    unengaged aloof            after one card                      |
                         |  - upkeep: playerWindow     - reveal: skipped when auto result   |
                         |    before ReadyAll step       is already known                   |
                         |  - round end: expire        - result: autoFail value 0,          |
                         |    "round" mods, then         autoSucceed difficulty 0           |
                         |    roundEnds window         - kindResult fail: damage to the     |
                         |                               one other engaged investigator     |
                         |  rules/cards.ts                                                  |
                         |  - windowHandler(playerWindow): "Advance act" option            |
                         |  - canPlay / searchAndPlay: unique title not in play             |
                         |                                                                  |
                         |  rules/enemies.ts           rules/investigators.ts               |
                         |  - EnemyAttacks: exhaust    - Draw: empty deck + empty discard    |
                         |    after each attack          -> Defeated (horror)               |
                         |    (massive after its last) - Defeated: weaknesses' gameEnd hook |
                         |  - Spawn: unique encounter     then removed                       |
                         |    card discards player twin                                     |
                         |                                                                  |
                         |  rules/scenario.ts          effects.ts          core.ts           |
                         |  - finishRevelation:        - fight: skip       - moveCard leaving|
                         |    victory -> display         unengaged aloof     play clears its |
                         |                             - evade auto: no      usage counters  |
                         |                               successfulEvade                     |
                         +------------------------------------------------------------------+
```

## Decisions

1. **Failed attack on another's enemy** (`kindResultStage`, failure branch): when `t.kind === "fight"`, the target is in play, not massive, and `engagedWith` is an investigator other than `t.inv`, push `AssignDamage { inv: other, damage: enemyStat(damage), horror: 0, direct: false, source: enemy, enemy }`, before the retaliate check. _Why:_ the grimoire deals "the damage of the attack"; horror is not part of a missed blow. No attack window opens: it is not an enemy attack, and Flesh Ward must not answer it.

2. **Aloof**: one predicate `attackable(g, enemy) = !aloof || engagedWith` used by `legalTurnActions`' Fight option and by the `fight` effect's target list (`chooseAtLocation`). Engage stays offered.

3. **Commit window**: once an investigator other than the tester has a card committed, `commitStage` offers them no further cards, only Done and take-back (the existing feature stays). The tester's flow is unchanged.

4. **Automatic results**: in `resultStage`, `value = t.autoFail ? 0 : value` and `diff = t.autoSucceed ? 0 : diff` before `margin`. `revealStage` skips straight to `result` when `t.autoSucceed || t.autoFail` is already set (both are only set before the reveal by effects such as `fight { auto }`; the auto-fail token sets it during the reveal, which is unaffected).

5. **Evasion**: a new trigger `successfulEvade`, pushed only by `kindResultStage` on a successful evade test, next to the existing `enemyEvaded`. The automatic path in `effects.ts` keeps `enemyEvaded` only. No current card uses the new trigger; it exists so "after you successfully evade" cards have a moment that automatic evasion does not reach.

6. **Empty deck, empty discard**: `drawHandler` pushes `Defeated { by: "horror" }` instead of reshuffling-and-taking-horror when both piles are empty. One mental trauma follows from `defeatedHandler` as today.

7. **Elimination weaknesses**: `defeatedHandler`, before cards leave play, calls `hooks.gameEnd` (the hook `resolutionHandler` already uses for Cover Up and Hospital Debts) for each weakness the investigator owns in play, in the threat area or in hand; the cards are then removed with the rest.

8. **Unique**: `uniqueInPlay(g, title)` (cards in `play`, `threat`, `enemy`, `attached` with that name and `unique`). `canPlay`, the `searchAndPlay` pool and `putSetAsideIntoPlay` refuse a unique card whose title is there. `spawnHandler` / encounter `EnterPlay`: a unique encounter card discards the player card with the same title.

9. **Treachery victory**: `finishRevelation` moves a still-resolving treachery with `victory` to `victory` instead of the discard.

10. **Exhaust per attack**: `enemyAttacksHandler` pushes, after each `EnemyAttack` of a non-massive enemy, an engine script that exhausts that enemy (if still in play); massive enemies keep exhausting after the loop, so they attack every investigator first.

11. **Upkeep order**: the readying moves out of `upkeepHandler` into a step pushed after the phase's `playerWindow`.

12. **Round end**: `endRoundHandler` runs `roundCleanup` (expire "round" modifiers) before the `roundEnds` window instead of after.

13. **Act advance in any player window**: `windowHandler`, for `playerWindow`, adds an "Advance act" option (once per window, offered to the lead) when the act advances by clues and the group can pay; choosing it pushes `AdvanceAct { spend: true }`. The window then asks even when no card answers it; the bot takes the option (it already advances acts on its turn).

14. **Limits reset on re-entry**: `moveCard`, when a card leaves play, deletes its `usage` entries (`<cardId>:*`). Keys stay by instance id; group limits (by code) are untouched.

15. **`ENGINE_VERSION` 5**: new windows and prompts; a version-4 save restarts its scenario with its campaign kept.

## Risks / Trade-offs

- [The act option makes player windows ask more often] → only while the group holds the clues and the act takes them; passing marks it offered for that window.
- [Tests that encoded the old rules] → updated with the reason in the test name (a helper committing two cards; auto-fail margins); none removed.
- [Exhausting before the next attack changes "after an enemy attacks" reactions that look at exhaustion] → no current card reads an attacker's exhaustion; the chart is explicit.
- [Spawn-location choice still asked of the lead] → recorded as a non-goal; same player in solo play.

## Migration Plan

Engine only; `ENGINE_VERSION` 5 (version-4 saves restart their scenario, campaign kept). Archive after `nat-pack-cards`. Rollback: revert.

## Open Questions

None. ADR-0015 records the durable decision this change makes: the Grimoire is the engine's rules reference, and every deliberate deviation is stated in the game-engine spec.
