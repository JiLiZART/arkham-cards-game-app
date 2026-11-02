## Context

`src/engine/` today: 16 source files at the top level (`effects.ts` 1,353 lines, `core.ts` 1,064, `flow.ts` 616, `types.ts` 594, `engine.ts` 464, `decks.ts` 360, `records.ts` 343, `campaign.ts`, `flags.ts`, `campaignLog.ts`, `upgrade.ts`, `testkit.ts`, `natkit.ts`, `bot.ts`, `rng.ts`, `api.ts`), 45 tests beside them, `rules/` (7 modules, 3,566 lines) and `replays/`. Measured facts the design rests on:

- **Import graph.** `types.ts` imports `G` from `core.ts`; `core.ts` and `records.ts` import each other. 18 engine modules import `types`, 14 `core`, 12 `flags`. Outside the engine, 84 modules import `types`, 47 `core`, 38 `testkit`, 21 `records`.
- **Two `flow.ts`.** `flow.ts` is the campaign flow interpreter (ADR-0011); `rules/flow.ts` the round's phases and turns.
- **`rules/` modules are feature slices.** Each (`cards`, `enemies`, `investigators`, `scenario`, `skillTest`, `flow`) exports step handlers _and_ helpers other modules call; `engine.ts` merges their `handlers` objects into `HANDLERS: Record<string, (g: G, step: any) => void>` (48 step kinds).
- **The context.** `interface G { s: GameState; db: ContentDb; events: GameEvent[] }`, a parameter `g: G` in about 490 signatures and `g.s` at about 556 sites, in the engine and in 100 card and scenario scripts.
- **Strings.** `Zone` (22 values), the phase, the pending choice's kind, the skill test's stage, `InvStatus` are string unions; event `type` is `string` (77 distinct literals in `emit` calls, 99 `type === "..."` comparisons, plus event types only scripts emit: `codex`, `lita`, `languor`, `coverUp`...). The repo has no TypeScript `enum`; its idiom for closed sets is `as const` (`SKILLS`, `CHAOS_TOKENS` with `z.enum` in `content/schema.ts`).

The engine's behaviour is a resolution stack driven by choices, not a per-tick scheduler (ADR-0021), and its data is an entity component store (ADR-0023, ADR-0024).

## Goals / Non-Goals

**Goals:**

- Folders by game concept, an acyclic import graph with stated directions, enforced by a test.
- No one-letter type or context parameter: `GameContext`, `game`.
- Every closed set of strings written once, as a constant object; event types checked.
- Every recording replays unchanged after every slice.

**Non-Goals:**

- Any behaviour change, state shape change or `ENGINE_VERSION` bump.
- Phase 4 of ADR-0021 (queries by component, cached modifiers).
- Splitting `rules/` modules into handler and helper files (they are slices on purpose, see decision 2).
- Renaming other short locals (`c`, `d`, `i` in small closures) beyond the context; the codemods target the context's type and parameter.

## Decisions

### 1. The tree

```
  src/engine/
    index.ts          createGame, dispatch, replay, ENGINE_VERSION, replaysSave     (engine.ts)
    api.ts            what card and scenario scripts import                         (unchanged role)
    bot.ts            the solo bot's choice (used by the UI store)
    context.ts        emit, queue (push), basic accessors, counters, card/inv setters (core.ts, top half)
    movement.ts       createCard, moveCard, piles, shuffles, discard                (core.ts, card movement)
    queries.ts        zone and location queries, map, modifiers, costs, conditions  (core.ts, bottom half)

    world/            the store: data and its access, no game rules
      types.ts        GameContext, GameState, World, CardInst, InvState, tables     (types.ts, part)
      constants.ts    ZONE, PHASE, CHOICE, INV_STATUS, DURATION... (as const)
      store.ts        tables, card and investigator views, piles                    (records.ts)
      flags.ts        flag families over tables and state.flags                     (flags.ts)
      rng.ts

    steps/            the resolution stack
      step.ts         STEP (as const) and StepKind; the Step union itself stays in world/types.ts, since GameState.queue holds steps
      dispatch.ts     HANDLERS typed per step kind, run(), the internal script functions   (engine.ts, part)

    rules/            game concepts: each module its step handlers and helpers
      round.ts        phases, turns, rounds                                         (rules/flow.ts)
      cards.ts, investigators.ts, enemies.ts, scenario.ts, skillTest.ts, tokens.ts

    effects/          the Eff step's handlers, by family                            (effects.ts)
      index.ts        effHandler: runs the handler for an effect's `op`; Effects, ArrangeTop; EFFECT_HANDLERS
      types.ts        EffectRun, EffectOf, EffectHandlers (one handler per effect the schema allows)
      targets.ts      investigator and enemy targets, amounts, the options they offer
      resources.ts    change resources, draw, gain actions, pay a cost
      damage.ts       take, deal, prevent and heal damage and horror
      tokens.ts       clues, doom, tokens, uses
      placement.ts    threat area, attach, move, discard, remove, take control, ready
      encounter.ts    encounter draws, surge, spawn, shuffle in, engage, pull, disengage
      search.ts       search a deck, look at the top, search and play
      tests.ts        skill test, fight, investigate, evade, modify
      choices.ts      choose one, cancel, resolution, resign, at turn end, script

    events/
      event.ts        EVENT (as const) and EventType, a leaf with no imports; GameEvent stays in world/types.ts (the log is state)

    campaign/         between scenarios
      flow.ts         the campaign flow interpreter                                 (flow.ts)
      campaign.ts, log.ts (campaignLog.ts), decks.ts, upgrade.ts

    kits/             testkit.ts, natkit.ts (test helpers; tests and the corpus tools import them)
    replays/          as is
```

Tests move with the module they test, into the `__tests__` folder of the module's folder (`git mv`; a test new in this change is moved as a file). Cross-cutting tests (`fuzz`, `rulesAlign`, `rulesHigh`, `scenarios`, `searchCrashes`, `scriptGuards`, `boundary`, card-pack tests such as `natPack`, `coreCards`) go to the folder of what they exercise most, or stay in `src/engine/__tests__/` when they span the engine. The boundary test checks that every engine test is in a `__tests__` folder and that those folders hold only tests.

### 2. Allowed import directions

```
  +------------------------------------------------------------------------------+
  | kits/, replays/, campaign/          may import anything below               |
  +------------------------------------------------------------------------------+
        |
        v
  +----------------+     +--------------------------+     +-------------------+
  | index.ts       |---->| steps/dispatch.ts         |---->| effects/          |
  | (createGame,   |     | (collects every handlers  |     | (may use rules/   |
  |  dispatch)     |     |  object, typed by STEP)   |     |  helpers)         |
  +----------------+     +--------------------------+     +-------------------+
        |                        |                                 |
        |                        v                                 v
        |                +---------------------------------------------------+
        |                | rules/  round -> skillTest, enemies, investigators |
        |                |         investigators -> enemies -> cards          |
        |                |         scenario -> cards; skillTest -> tokens     |
        |                +---------------------------------------------------+
        |                                    |
        v                                    v
  +----------------------+   +--------------------------------------------+
  | api.ts (re-exports   |-->| movement.ts, queries.ts                    |
  | for scripts)         |   +--------------------------------------------+
  +----------------------+                   |
                                             v
                              +--------------------------------------------+
                              | context.ts (emit, push, accessors)         |
                              +--------------------------------------------+
                                             |
                                             v
                  +---------------------------------------------------------------+
                  | world/ (types, constants, store, flags, rng)   events/  steps/step.ts |
                  | depend only on content/schema types and on each other's types |
                  +---------------------------------------------------------------+
```

- `GameContext` is declared in `world/types.ts` (it is three fields), so `world/store.ts` and `context.ts` both import it from below; the `types -> core` and `core <-> records` cycles go.
- `rules/` keeps its slices (handlers beside the helpers they share), the arrangement of the Haskell Arkham engine and of ECS "plugins", not Bevy's `systems/`: a step handler runs when the stack reaches it, not every tick.
- Steps never import effects: a rule queues an `Eff` step by its tag (`STEP.Eff`); `steps/dispatch.ts` imports both.
- The boundary test gains a layer check: for each folder, the folders it may import; a new upward import fails it. Its existing checks (only the core imports the store; scripts import only `api.ts`) take the new paths.

### 3. Names: `GameContext` and `game`

`G` becomes `GameContext`; every binding of that type named `g` (parameters, `const g: G = ...`) becomes `game`, in the engine, its tests and the 100 scripts. Applied by a TypeScript compiler-API codemod: the type checker finds each binding whose type is `GameContext` and renames it with the language service's rename locations, so shadowing and closures are handled; `natkit.ts`'s helper function `game()` becomes `natGame()` first. The UI's React context `GameContext` (`src/ui/state/context.ts`) becomes `GameStoreContext`. `EffCtx` and its `ctx` parameters keep their names (a different object: the effect's source, `you`, the event).

### 4. Constant objects

```ts
export const ZONE = { Deck: "deck", Hand: "hand", Play: "play", Enemy: "enemy", EncounterDeck: "encounterDeck", ... } as const;
export type Zone = (typeof ZONE)[keyof typeof ZONE];
card.zone === ZONE.Enemy;          // was card.zone === "enemy"
```

- Keys PascalCase, values unchanged, so the state's JSON, saves, the corpus and the UI's translations keep their strings.
- One object per closed set, beside the type it defines: `ZONE`, `PHASE`, `CHOICE` (pending choice kinds), `TEST_STAGE`, `INV_STATUS`, `PILE` (fixed pile names) in `world/constants.ts`; `STEP` in `steps/step.ts`; `EVENT` in `events/event.ts`. Sets already defined by the content schema (`Skill`, `Duration`, `ChaosToken`) stay there and gain a constant object only where engine code compares against them.
- `GameEvent.type` becomes `EventType`; `emit` takes an `EventType`. The catalogue is built from every type emitted in the engine and the scripts (77 in the engine plus the scripts'), so the event log's strings are unchanged.
- `HANDLERS` becomes `{ [K in StepKind]: (game: GameContext, step: Extract<Step, { t: K }>) => void }`: a missing or misspelt handler fails the typecheck, and `any` leaves it.
- `isOneOf(value, ...options)` in `world/constants.ts` answers "is it one of these" (`isOneOf(card.zone, ZONE.Play, ZONE.Threat)`): an array of `ZONE.X` has the narrow type of its members, so `.includes(card.zone)` on it wouldn't type-check.
- Applied by codemod: each string literal whose contextual type is one of these unions is replaced by its constant, with the import added; a literal in a position the checker can't type (a free string) is reported and done by hand.

### 5. Slices, each ending with the replay oracle green

1. `GameContext` into `world/types.ts`; `context.ts`, `movement.ts`, `queries.ts` out of `core.ts`; cycles gone.
2. `world/` (types, store, flags, rng).
3. `steps/dispatch.ts` (typed dispatch) and `rules/flow.ts` to `rules/round.ts`; `index.ts` from `engine.ts`. The `Step` union stays with the state in `world/types.ts` (the queue is part of the state; moving the union to `steps/` would make `world/` and `steps/` import each other).
4. `campaign/`.
5. `effects/` split by family.
6. `events/`: `EVENT`, `EventType`, typed `emit`.
7. The other constant objects, codemodded.
8. `G -> GameContext`, `g -> game` codemod (engine, tests, scripts); the UI's React context renamed.
9. `kits/`; boundary test layers; `.oxlintrc.json` paths; AGENTS.md's engine section.

Each slice: typecheck, lint, full tests, replay oracle, corpus checksum unchanged, one commit.

## Risks / Trade-offs

- [A huge diff that's hard to review] -> slices of one kind of change each (moves, then splits, then renames, then constants); moves by `git mv` so history follows; codemods are run, not hand-typed; the replay oracle proves behaviour after each.
- [Merge conflicts with work in progress] -> the user's open UI files don't import the moved engine paths except `ActionRail.tsx` (types and core); the work is done on the current branch between the user's commits, one slice per commit.
- [Import paths outside the engine break] -> the typecheck finds every one; the codemod that moves files rewrites importers (ts-morph `move` updates imports).
- [The constant codemod misses a site] -> a literal whose contextual type is a constant-backed union is replaced by the checker's lookup, not by text search; after it, a lint rule (`no-restricted-syntax` on string literals compared with `.zone`/`.phase`/`.type`) would be a follow-up, not part of this change.
- [`ZONE.Enemy` reads worse than `"enemy"` to some] -> accepted by the user: every set is written once.
- [Script authors' habits] -> scripts keep importing only `api.ts`, which re-exports the constants.

## Migration Plan

Slices in the order above, one commit each; rollback is reverting the slice's commit. No data migration: the state, saves and the corpus are unchanged.

## Open Questions

None. In-force ADRs reviewed: ADR-0002, 0004, 0005, 0011, 0013, 0014, 0015, 0016, 0018, 0020, and the proposed ADR-0021 to 0024 (the store this change reorganises around); none is revisited. A new ADR records the engine's organisation.
