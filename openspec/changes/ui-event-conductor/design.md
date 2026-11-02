## Context

The store turns each dispatch's events into a queue of animated events (`enqueue` in `src/ui/state/store.ts`, filtered by `ANIMATED`); `current` is the head, `nextEvent()` moves on. `EventPlayer` (`src/ui/hud/Hud/Hud.tsx:88-158`) decides, per render:

1. **On screen now** (`ready`): the event's cards have landed if it waits for that (`waitsForSettle`: a token, a hit from a card), and it holds the middle (a test's token and result through the test screen's `test:<id>` claim, a centre event through its own `event:<logIndex>` claim), or, for every other event, only a test holds the middle.
2. **Waits for the player** (`waits`): a test's token always (the token draw advances it), a result drawn by hand, a tap-pace event (`holdsForTap`), a held encounter card or weakness (`HELD`).
3. **How long** otherwise: `DURATION[type]` (500 ms default), plus `HIT_MS + 300` for a hit from a card, 1800 ms for a test result, times 1.6 at the slow pace.

It then writes `view.playing` and the spotlight, and sets the timeout. Five other components advance the queue by hand (`StepCaption`, `Reveal`, `SkillTestScreen`, `TokenDraw`, `Table`). ADR-0002 makes `view.playing` the clock every channel follows, so this logic is the single most shared timing rule in the UI, and it is untested.

The stage (`view.stage: string[]`, FIFO, `claimStage`/`releaseStage`, `useStage(key)`) is claimed by 7 kinds of key: `test:<id>` (SkillTestScreen), `event:<logIndex>` (EventPlayer), `pause:<seq>`, `title:<key>`, `turn:<key>` (Hud titles), `showcase` (Showcase), `intro` (IntroOverlay). Freedom is asked inline at 7 sites with 3 meanings (see the proposal). `src/ui/state/stage.test.ts` covers the queue itself.

Constraints: ADR-0002 (presentation follows `view.playing`), ADR-0004 (the clock's state is view state; `current` and `queue` are the game store's), ADR-0005 (no layout-specific timing). Every browser in a room runs its own clock (ADR-0018 replays moves, not animation), so nothing here crosses the network.

## Goals / Non-Goals

**Goals:**

- The clock as one pure function, tested in Node against recorded events at each pace.
- Stage claims built from a closed set of kinds; freedom asked through three named predicates.
- No visible change: order, timings and holds stay as they are.

**Non-Goals:**

- Changing any timing, the FIFO stage, or the spec's list of what holds the middle.
- Moving the title queues (`PhaseTitle`, `TurnTitle`) or the settle detection (`arrivals.ts`) into the conductor.
- "Can a choice be offered now" (`ui-input-gate`), "game minus unplayed events" (`ui-presented-table`), where options go (`ui-option-placement`).

## Decisions

### 1. Before and after (C4 component view of the HUD's presentation clock)

Rigor: lightweight C4-inspired, component level inside the browser app container; ASCII.

Before:

```
  +-------------------- game store (zustand) --------------------+
  | queue, current, pace, drawByHand, nextEvent()                |
  | ANIMATED, HELD, TAP, holdsForTap, needsNext  (store.ts:40-90)|
  +-------------------------------+------------------------------+
                                  | read
  +-------------------------------v------------------------------+
  | EventPlayer (Hud.tsx:88-158)  -- untested                    |
  |  testKey / CENTER / waitsForSettle / ready / waits           |
  |  DURATION, HIT_MS, SLOW, 1800 ms  -> setTimeout(nextEvent)   |
  +------+------------------------------------+------------------+
         | useStage("event:"+i)               | setState playing, spotlight
  +------v-------------- view store ----------v------------------+
  | stage: string[]   settledFor   playing   spotlight           |
  +--^-----------^-----------^-----------^-----------^-----------+
     |           |           |           |           |
  "test:" only  "test:"|"pause:"        length==0   claims by string
  Hud:107       Hud:315, Tip:96,        Floats:92,  SkillTest, Showcase,
  feed:257      InvChoice:32            Reveal:181  Intro, Hud x3
```

After:

```
  +-------------------- game store --------------------+
  | queue, current, pace, drawByHand, nextEvent()      |
  +-------------------------+--------------------------+
                            | read
  +-------------------------v--------------------------+       +---------------------------+
  | EventPlayer (adapter, ~25 lines)                   |------>| src/ui/game/conductor.ts  |
  |  conduct(...) -> setState(playing, spotlight)      | calls |  conduct()       (pure)   |
  |  advance.by=="timer" -> setTimeout(nextEvent, ms)  |       |  ANIMATED HELD TAP TIMING |
  +-------------------------+--------------------------+       |  stageKey(kind, id)       |
                            |                                  |  stageFreeForEvents       |
  +-------------------------v--- view store -----------+       |  stageFreeForPrompts      |
  | stage: string[] (keys from stageKey) settledFor    |<------|  stageEmpty               |
  +----------------------------------------------------+ read  +-------------^-------------+
     ^ claims: useStage({kind,id})                                           | import
     |                                                  Hud, TipLayer, InvestigatorChoice,
  SkillTestScreen, Showcase, IntroOverlay, Hud titles   feed, Floats, Reveal, ui-input-gate
                                                        conductor.test.ts (Node, corpus events)
```

- The conductor owns the rules; the stores keep the state; components only wire the two.
- Assumption: the stage's FIFO and `whenStageFree` stay in `view.ts`; only their keys and the questions asked of them move.

### 2. `conduct`'s shape

```ts
type Advance = { by: "timer"; ms: number } | { by: "player" } | { by: "screen" };
function conduct(i: {
  current: QueuedEvent | null;
  stage: readonly string[];
  settledFor: unknown;
  pace: Pace;
  byHand: boolean;
}): { playing: QueuedEvent | null; claim: StageClaim | null; advance: Advance | null };
```

- `claim` is the stage claim the event needs (`event:<logIndex>` for a centre event, none otherwise); the adapter passes it to `useStage`, then calls `conduct` with the resulting stage. `conduct` reads `stage` only to decide `playing`, so the claim and the decision don't loop.
- `advance` splits today's `waits` boolean in two: `player` (a tap, Next or Continue: tap pace, by-hand result, held encounter card) and `screen` (a test's token, which the token draw advances when its disc lands). The step caption's `needsNext` becomes `advance.by === "player"` minus the cases with their own button, in the same module.
- Rejected: a hook (`useConductor`) holding the logic (still untestable without React); a store slice with its own timer (state that duplicates `current`, and a timer in a store breaks the store tests' synchronous flow); a state machine library (a new dependency for one function with three outputs).

### 3. Typed claims, string storage

`StageClaim = { kind: StageKind; id: string | number }`, `StageKind` a constant object of the 7 kinds per ADR-0026's pattern for closed sets, and `stageKey(c)` renders `kind:id` (`showcase` and `intro` have no id). The view store keeps `string[]`, so `stage.test.ts`, the queue order and debugging in `window.__arkhamView` stay as they are. Predicates parse the kind with one `kindOf(key)`. Rejected: storing claim objects (equality by reference breaks `includes`, and every selector would need a comparator).

### 4. Three predicates, named for who waits

`stageFreeForEvents(stage)`, `stageFreeForPrompts(stage)`, `stageEmpty(stage)` in `conductor.ts`. Each site switches to the one that matches its current check, so behaviour is unchanged by construction; the spec names the three so the difference is a requirement, not an accident. `AutoSwitch` and `InvestigatorChoice` keep their extra `!intro && showcase.length === 0` until open question 3 is answered.

### 5. Testing against the corpus

`conductor.test.ts` loads a recording from `src/engine/replays/` (its events, filtered by `ANIMATED`, as the store would queue them) and steps through: for each event at each pace, `conduct` with a stage that holds the claim it asks for and `settledFor` set, asserting `advance`. Unit cases pin the named rules: slow is 1.6x, a hit from a card adds the streak, a test token waits for the screen, an encounter card waits for the player at every pace, a non-centre event plays while only a test holds the stage and not during a title.

## Risks / Trade-offs

- [A predicate swapped at a site changes who waits] -> each site maps to the predicate equal to its current expression; a test per predicate covers each of the 7 kinds; the browser pass checks a title, a pause, a test with a fast ability, and the showcase.
- [The adapter's claim-then-decide order renders once more than today] -> today's `EventPlayer` already claims through `useStage` and decides on the next render; the order is the same.
- [ADR-0002's "any change to how EventPlayer decides affects every channel"] -> now that rule is one function with tests, which is the mitigation that consequence asked for.
- [The corpus test ties UI timing to recorded games] -> it asserts the rule's outputs per event type, not a recorded timeline, so a re-recorded corpus doesn't break it.

## Migration Plan

One branch, in order: conductor module with tests (tables copied, not moved); `EventPlayer` onto it; tables removed from `store.ts` with imports updated; typed claims at the 7 `useStage` callers; predicates at the 7 sites. Each step keeps `pnpm test` green. Rollback is reverting the change; no saved data is touched.

## Open Questions

- The four questions in the proposal (title queues, events vs prompts during a pause, the extra intro/showcase checks, timings in the spec).
- In-force ADRs reviewed: 0002, 0004, 0005, 0016, 0018, 0026. None needs revisiting; ADR-0032 refines ADR-0002 without superseding it.
