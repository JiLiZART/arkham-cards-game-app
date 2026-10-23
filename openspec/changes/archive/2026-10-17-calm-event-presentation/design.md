## Context

How the screen tells the story today:

- `store.ts` applies every choice at once and queues the animated events (`ANIMATED`). `EventPlayer` (`hud/Hud.tsx`) plays them one by one on timers.
- The feed shows the log up to the next unplayed animated event (`shownCount`). Every visible entry is drawn twice: once by `Feed` (live: 8 lines, 12 s each) and once by `ActionFloats` (2 at a time, 900 ms apart).
- Each overlay that uses the middle of the screen has its own partial wait rules:
  - `PhaseTitle` waits for token, testResult and encounter events, the intro and the showcase.
  - `HandOff` waits for the intro and the showcase.
  - `Showcase` waits for nothing; it opens as soon as `trackShowcase` adds cards.
  - `RevealOverlay` shows an encounter or a resolving card whenever one exists.
  - `HitFx` plays after `whenSettled`, regardless of what else is on screen.
- Nothing dims or highlights the map during an event. `CardMesh` already has `highlighted` and `hovered` frames.

## Goals / Non-Goals

**Goals:**

- One middle-of-screen holder at a time, in the order the game produced them, with one mechanism instead of per-component rules.
- Fewer floating texts and a shorter, merged live feed. The full detail stays in the Journal.
- A spotlight on the map for the animated event that is playing.

**Non-Goals:**

- Engine, save-format or replay changes.
- Slowing event timings (`DURATION` stays as it is).
- A settings toggle for any of this. Add one if players ask.
- Merging in the Journal.

## Decisions

### 1. The stage is a FIFO of claims in the view store

`view.ts` gains `stage: string[]` with two actions:

- `claimStage(key)` appends the key if it is absent.
- `releaseStage(key)` removes it.

The head of the queue holds the middle; `useStageHolder(key)` returns whether `stage[0] === key`. Each holder claims when it wants the middle and renders only while it holds it:

- the showcase (key `showcase`), and a deck pick (`pick:<seq>`);
- the intro (`intro`);
- the encounter flight (`event:<logIndex>`);
- the token draw and test result (`event:<logIndex>`, claimed by `EventPlayer`);
- a phase title (`title:<key>`) and the paced pause (`pause:<seq>`).

Holders release when they are done or unmount, so a new game or an undo empties the stage through those cleanups, with no separate reset.

A card being resolved does not claim the stage. It shows only while the stage is empty. It can stay in the resolving zone while waiting for a choice, and a claim there would block the events queued before that choice, which would deadlock with the input block.

The showcase claims only once no events are playing or queued, because the drawn cards come after the events of the same choice.

_Why a queue, not a derived precedence rule:_ the spec says "in the order the game produced them". A derived rule needs a fixed priority, which breaks for "showcase opened, then an encounter came". A queue makes the order fall out of claim order. _Alternative considered:_ extending each component's own wait list, as `PhaseTitle` does today. That is the source of the current gaps, because every new overlay must be added to every list.

### 2. EventPlayer waits for the stage

- Center events (`token`, `testResult`, `encounter`) claim `event:<logIndex>` when they become current. Their timer starts only while they hold the stage.
- Every other animated event, such as attack or damage, starts only when the stage is empty. Its float, hit streak and numbers therefore never play over a held middle.

`waitsForSettle` keeps its meaning: settle first, then the stage.

### 3. Floats and hits wait for an empty stage

- `ActionFloats` releases queued floats only while `stage.length === 0`.
- `HitFx` wraps its `whenSettled` callback in `whenStageFree`, which subscribes to the view store until the stage is empty.

Both keep their queues, so nothing is dropped.

### 4. Float whitelist in `feed.ts`

`FLOAT_KINDS` lists: `damage`, `defeated`, `attack`, `enemyDamage`, `enemyDefeated`, `spawn`, `clues`, `doom`, `agendaAdvance` and `actAdvance`. `ActionFloats` floats only entries whose `kind` is in the list. This is one `Set`, beside the existing `HIDDEN`.

### 5. Merging is a pure function over raw events plus burst marks

`mergeLive(items, game, db, locale)` takes the newest visible log indexes and returns feed lines. Each line is either a single entry or a merge of a run.

**Runs:**

- A run is consecutive entries in the same burst whose types are in `ROUTINE = {draw, resource (not lost), ready}`.
- `enemyMove` is merged only with other `enemyMove` entries.
- An entry of any other type ends the run.

**Bursts:** a burst is the set of log entries produced by one dispatch. The store records `logMarks: number[]`, the log length before each `choose`/auto step. It is in-memory only and reset on a new game, a load or an undo. An undo truncates the marks. A load starts with one mark at the current log length, so older entries are never merged; they are past the live window anyway.

**Line text:** a run sums its amounts per investigator. The line uses new templates:

- `feed.merged.draw` ("{inv} drew {n} cards") and `feed.merged.resource`;
- the `.each` variants ("each investigator drew {n} card(s)") when every playing investigator has the same amount;
- `feed.merged.ready` ("cards readied");
- `feed.merged.and` to join the different kinds of one run in run order.

Russian strings use the existing plural helper, if there is one, or fixed forms like the current feed strings.

_Alternative considered:_ merging by time window in `Feed`. It is simpler, but it merges across separate player actions (two Draw actions in a row become "drew 2") and isn't testable as a pure function.

Live feed: `LIVE_MAX` drops from 8 to 4. The Journal path stays on raw `entries`.

### 6. Spotlight via a dim plane and lifted cards

- `EventPlayer` sets `view.spotlight = { cards, invs }` from the current event: `e.card`, `e.data.source`, `e.data.enemy` (if present) and `e.inv`. It clears the spotlight when no event is current. Events whose ids aren't on the map give an empty spotlight, which means no dim.
- `Table` renders one large black plane above the table cards and below lifted cards. Its opacity eases toward 0.55 or 0 in `useFrame` over about 150 ms.
- `CardMesh` gets a `spotlit` prop that raises the card above the plane, with the existing `highlighted` frame.
- The HTML mini-portraits get a `dimmed` class unless they are spotlit.
- The plane has `raycast={() => null}`, so it never takes the pointer.
- Under reduced motion, the plane stays at 0 and there is no lift, only the frame.

_Alternative considered:_ post-processing, or darkening each material. That means more code and more draw-state churn for the same look.

## Risks / Trade-offs

- **A holder that never releases freezes the middle.** Mitigation: every holder releases in an effect cleanup, and a new game or undo clears the stage. A dev-only console warning fires if the same head holds for more than 30 s without user input pending.
- **The game feels slower,** because floats now wait behind overlays. This is accepted: the user asked for clarity over speed. Timings themselves are unchanged.
- **Burst marks are lost on reload,** so the first live lines after a load aren't merged. This is harmless, because they are older than the live window.
- **The dim plane height must sit between flat cards and lifted cards** at every camera angle. Mitigation: lift by a fixed world offset well above card stacks, and check it at the default and zoomed-in cameras in the browser drive.
