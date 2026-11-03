## Context

The 10 rtnotz player cards are in `content/packs/return/cards.generated.json`; `content/packs/return/cards.json` holds one card of another box (51008) and the pack has no `scripts/` folder. Their core counterparts work: the stat trainers and Hot Streak in data (`content/packs/core/cards.json` 01017, 01034, 01049, 01062, 01077, 01057), Dynamite Blast and Mind Wipe by scripts (`core/scripts/01024.ts` with `fns.blast`, `01068.ts` with `fns.wipe`), Barricade in data (01038: `attachToLocation`, `nonEliteCannotMoveInto` scoped to the attached location, forced discard on `leaveLocation`). `content/packs/nat/scripts/60129.ts` already shows a higher-level card importing a core script and reusing its `fns`. The engine has `enemyDamage`/`enemyHorror` modifiers, `searchDeck { top: number }`, the `skillTestFailed` window, and the `spawnRedirect` scenario hook in `rules/enemies.ts` (a hook, not a card flag).

In-force ADRs: 0001–0036 (0027–0036 proposed). 0006 (behaviour in `cards.json`, generated data untouched), 0013 (every printed line accounted for), 0028/0034 (scripts through the registry and the explicit API).

## Goals / Non-Goals

**Goals:** the 10 cards work, 8 in data and 2 by scripts that reuse the core functions; the pack's player row ticks.

**Non-Goals:** the box's encounter cards; parallel Roland and the Directives; bot strategy for the new cards.

## Diagram (C4-inspired, component level, ASCII)

```
 content/packs/core/scripts/01024.ts (fns.blast)  01068.ts (fns.wipe)   content/packs/core/cards.json (01017… 01038)
            |  import default                     |  import default               |  copied abilities
            v                                     v                               v
 content/packs/return/scripts/50002.ts   scripts/50008.ts         content/packs/return/cards.json
   abilities [{onPlay, aoo: false,         abilities [{reaction     50001 50003 50005 50007 50009 50006 (as core)
     run: "blast"}], fns: blast.fns          fromHand phaseBegins,  50004 Barricade 3: 01038 + constant
                                             run: "wipe"}]          [{flag: cannotSpawnAt, scope: attachedLocation}]
                                           fns.wipe = core wipe +   50010 Rabbit's Foot 3: reaction skillTestFailed,
                                             enemyDamage/Horror -1    exhaust: searchDeck {top: "X", draw 1, shuffle}
            |                                                                   |
            v                                                                   v
 +---------------------------------------------------------------------------------------------+
 | src/engine                                                                                  |
 |  rules/enemies.ts  spawn: location has cannotSpawnAt and enemy non-Elite -> choose a        |
 |                    connecting location (auto when one; none: spawn there after all)         |
 |  effects/search.ts searchDeck.top as Amount ("X" = the window's amount: the margin failed by)|
 |  rules/round.ts    aoo: false already honoured for play abilities (nat-pack-cards)          |
 +---------------------------------------------------------------------------------------------+
```

## Decisions

1. **Copy, don't re-express.** The five trainers and Hot Streak get the core entries' `abilities` verbatim in `return/cards.json`; the only difference is the printed cost and level, which the generated data carries. _Alternative:_ a "same as <code>" reference in the schema — rejected: six copied lines are cheaper than a new indirection the loader and coverage would have to follow.

2. **Scripts import the core scripts.** `50002.ts` is `{ abilities: [{ kind: "onPlay", aoo: false, run: "blast" }], fns: blast.fns }` with `blast` imported from `01024.ts`, as `60129.ts` does; `50008.ts` imports `01068.ts`, keeps its `fromHand` reaction on `phaseBegins` with the non-Elite-at-your-location condition, and its `wipe` calls the core `fns.wipe` then adds `enemyDamage -1` and `enemyHorror -1` on the chosen enemy until the phase ends. _Alternative:_ a `script: "01024"` alias field — rejected: an import is one line and keeps the registry's one lookup rule (ADR-0028).

3. **Barricade (3) is a flag, not a hook.** `ModFlag cannotSpawnAt` with scope `attachedLocation` (as `nonEliteCannotMoveInto` is scoped on 01038); the spawn step in `rules/enemies.ts` checks the flag on the resolved location for a non-Elite enemy and, when it holds, asks for a connecting location (auto when one, the card's own location when none: "if able"). The existing `spawnRedirect` scenario hook stays for scripts. _Alternative:_ a card script with a `spawnRedirect` hook — rejected: card scripts have no scenario hooks, and later Barricades and spawn-proof locations want the same flag.

4. **`searchDeck.top` becomes an `Amount`.** `top: 3` stays valid; `top: "X"` reads the window's amount, which the `skillTestFailed` window sets to the margin failed by (it carries the margin already for `perPointFailed`). The reaction's condition requires a margin of at least 1, so the card is never offered for a search of nothing.

5. **`ENGINE_VERSION` bump.**

## Risks / Trade-offs

- [`fns.wipe` in `01068.ts` sets its modifiers through a step a wrapper cannot append to] → the wrapper pushes its two modifiers before delegating; the core card's test still covers `wipe` unchanged.
- [`skillTestFailed`'s X differs from `perPointFailed`'s margin] → one test asserts both read the same number for a test failed by 2.
- [Barricade's flag read on every spawn] → one flag lookup on the resolved location, as `nonEliteCannotMoveInto` is read on every move.

## Migration Plan

Content and engine in one change; `ENGINE_VERSION` bump. Rollback: revert.

## Open Questions

- None. No in-force ADR needs revisiting.
