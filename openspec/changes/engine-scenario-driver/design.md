## Context

`src/engine/` has 35 test files in `__tests__/` (6,976 lines; `index.test.ts` alone 1,019) and only `tokens.test.ts` in `rules/__tests__/`, though the rules are where the behaviour lives. Two kits serve them: `kits/testkit.ts` (117 lines: `setup`, `start`, `pick`, `skipMulligans`, `mutate`, `giveCard`, `putEnemy`, `locId`, `options`, `commitDone`) and `kits/natkit.ts` (99 lines: `neutral`, `toTurn`, `natGame`, `hand`, `inPlay`, `enemyHere`, `addLocation`, the nat constants), which only the nat tests use. Outside the engine, 39 test files in `src/ui`, `src/content`, `src/net` and `scripts/` import the testkit.

What the tests rewrite for themselves (counted in `src/engine/**/__tests__`):

| Pattern                                         | Count                         |
| ----------------------------------------------- | ----------------------------- |
| `chaosBag: [...] as never`                      | 39 in 15 files (+1 in natkit) |
| lines looping on `pending.kind !== "turn"`      | 29                            |
| local `toTurn` / `finish` / `until`             | 7 files                       |
| local `fresh` / `gameOf` / `offered`            | 12 files                      |
| `pending.step` read (to find a reaction window) | 12 lines in 4 files           |
| `queue` or `skillTest` read or written          | 46 lines in 16 files          |

The `as never` is there because `GameSetup.chaosBag` is `ChaosToken[]` (a zod enum) and a bag built outside the call is a `string[]`. The reaction-window lookups exist because a pending prompt carries its trigger only on `pending.step` (`{ t: "Window", trigger }`). `testSetters.test.ts` reads `game.s.skillTest` where `currentTest(game)` would do; `scriptGuards.test.ts` builds `Script` steps by hand and reads `queue.at(-1)` because it calls script functions without a game loop.

Constraints: ADR-0025 puts tests in each folder's `__tests__`, holding only tests, under the engine's import rule, and puts test helpers in `kits/` (the top layer, which may import anything). ADR-0021..0026 stand.

## Goals / Non-Goals

**Goals:**

- One driver that gets a test to the moment it cares about and takes actions by intent, so a test is setup, a few driver calls and assertions on prompts, events and views.
- No engine test outside the stack's own pins the step stack's shape.
- A migration that can stop after any file: each wave leaves the suite green.

**Non-Goals:**

- Rewriting all 35 files now; the 25 not in the first waves move when next edited.
- UI, content and net tests (they use `start`/`pick`, which stay).
- Changing the engine or adding engine accessors for tests' sake; the driver may read internals, tests may not.
- Gherkin or a test DSL.

## Decisions

### 1. Where the driver sits

```
  Before                                         After
  +-------------------------------------+        +---------------------------------------------+
  | engine tests (__tests__/*.test.ts)  |        | engine tests                                 |
  |  local toTurn/finish/until/offered  |        |  setup -> driver calls -> assert prompt,     |
  |  pending.step.t === "Window"        |        |  events, views (cardOf, invOf, currentTest)  |
  |  game.s.queue.at(-1), skillTest = {}|        +----------------------+----------------------+
  +------+------------------+-----------+                               |
         | start/pick/mutate| state.queue,                              v
         v                  | pending.step     +---------------------------------------------+
  +-----------------+       |                  | kits/driver.ts   game, rigBag, toTurn,      |
  | kits/testkit.ts |       |                  |  until, untilWindow, windowOf, offered,     |
  | kits/natkit.ts  |       |                  |  lastTest, investigate, fight, evade, move, |
  +--------+--------+       |                  |  play, use                                  |
           |                |                  +----------------------+----------------------+
           v                v                                         | start/pick/mutate
  +-------------------------------------+        +--------------------v------------------------+
  | engine: createGame, dispatch,       |        | kits/testkit.ts (setup)  kits/natkit.ts     |
  | state (queue, pending, skillTest)   |        |                          (nat constants)    |
  +-------------------------------------+        +--------------------+------------------------+
                                                                      | the only readers of
                                                 +--------------------v------------------------+
                                                 | engine: createGame, dispatch, state         |
                                                 +---------------------------------------------+
```

Component level, inside the one container (the engine's test run). Assumption: nothing outside `src/engine` adopts the driver in this change.

- The driver is `kits/driver.ts`, beside the testkit, importing it. Rejected: growing `testkit.ts` (it would pass 300 lines and mix setup with flow); a helper file in `__tests__` (the boundary test refuses non-tests there).
- `natkit.ts`'s `neutral`, `toTurn`, `natGame`, `hand`, `inPlay`, `enemyHere`, `addLocation` move into the driver (`natGame` becomes `game`); `natkit.ts` keeps `NATHANIEL`, `MINION`, `STUDY`... and `nathaniel()`.

### 2. Its interface

Free functions over `Result`, like `pick`:

- `game({ scenario = "the-gathering", investigators, seed = 1, bag, prep })`: past mulligans to the first turn, `prep` applied through `mutate`. `bag` is `ChaosToken[]`; `rigBag(r, tokens)` replaces the bag mid-game.
- `toTurn(r, who?)`, `until(r, stop)`, `untilWindow(r, trigger)`: answer with `neutral` (pass, close a commit window, else the first option) until the turn prompt (of `who`), `stop(r)`, or a reaction window on `trigger`; each throws after a cap with the prompts it saw, instead of spinning.
- `windowOf(r)`: the trigger of the open reaction window, or null. It and `untilWindow` are the only readers of `pending.step`.
- `offered(r, label)`, `options(r)` (moved), `lastTest(r)`: the last `testResult` event's data (skill, base, total, difficulty, success, tokens).
- `investigate(r)`, `fight(r, enemy)`, `evade(r, enemy)`, `move(r, to)`, `play(r, code)`, `use(r, code, index?)`: choose that action from the turn prompt, matching the option's value (`TurnAction`'s `kind` and card or enemy), not its label, so a renamed label or a Russian locale doesn't break them; then `commitDone`.

Rejected: a driver object holding the current result (`s.fight(...)`); it reads well but the 35 files thread `Result`s already, and AGENTS.md asks for existing patterns. Kept as an open question.

### 3. What a test may read

Prompts (`state.pending`: kind, inv, option labels and values), `state.log`, and the core's lookups (`cardOf`, `invOf`, `cardsOf`, `currentTest`). Not `queue`, not `pending.step`, not an assignment to `skillTest`. Allowed to read them: `kits/`, `mutate` (re-asks the pending step), and `steps/__tests__/` (the stack is its subject). `testSetters.test.ts` switches to `currentTest(game)`; where a test assigns a partial skill test to call a script function, it gets a real test from `investigate` instead.

### 4. The ratchet

`boundary.test.ts` gets a `describe("what engine tests read")`: it walks `src/engine/**/__tests__/*.test.ts` except `steps/__tests__/`, finds files naming `.queue`, `pending.step`/`pending?.step`, or `skillTest =`, and compares with a `STILL_READ_THE_STACK` list in the test. A new file fails; a cleaned file not taken off the list fails too, so the list only shrinks. Rejected: an oxlint rule (no rule matches property names per path without a plugin, and adding one is a new dependency); convention alone (it is what produced today's count).

### 5. Migration order

1. The driver, with its own tests in `src/engine/__tests__/driver.test.ts` (one per function, on The Gathering).
2. Wave 1, the files that redefine the driver: `natAssets`, `natEvents`, `natPack` (windows, `finish`, `offered`), `core2026`, `rulesAlign` (`offered`), `testSetters` (`skillTest`), `tapDecks` (`until`), `fleshWard`, `prevent`, `brethren` (`finish`, `until`). The ratchet lands with the remaining list.
3. Wave 2: `index.test.ts` split by its `describe` blocks into `rules/__tests__/round.test.ts`, `skillTest.test.ts`, `enemies.test.ts`, `investigators.test.ts`, `scenario.test.ts`, `cards.test.ts`, each on the driver; the 39 bag casts go with the files they're in.
4. `scriptGuards.test.ts` and `searchCrashes.test.ts` after `engine-script-run-adapter` lands: they call script functions directly, and that change gives them a run object to call with.

Each step: the moved tests pass, the count of tests (`vitest --reporter=json`) is not lower.

## Risks / Trade-offs

- [`neutral` answers differently from a file's hand-written loop, so a migrated test reaches another state] -> migrate one file per commit; a test that changes meaning is kept on its own loop through `until(r, stop)` and noted.
- [Matching actions by option value couples the driver to `TurnAction`'s shape] -> one place to fix, against 35 files of label regexes today.
- [A test lost in a split] -> count tests per file before and after each wave.
- [The ratchet's text match has false positives, e.g. a comment naming `queue`] -> it matches `.queue`, `pending.step` and `skillTest =` only; a false positive can be reworded.
- [Overlap with `engine-script-run-adapter` on `scriptGuards.test.ts`] -> left on the list until that change lands; whichever lands second migrates it.

## Migration Plan

As decision 5. Tests only; no engine code, no corpus, no version change. Rollback is reverting a wave.

## Open Questions

- Driver object or free functions (decision 2)?
- Should the ratchet cover `src/ui/game` tests too?
- Split `index.test.ts` here or as touched?
- In-force ADRs reviewed: ADR-0021..0026 (and earlier); none needs revisiting. ADR-0025's test placement is kept.
