## Context

`dispatch` returns the new state and its events together. The store sets `game` at once and puts the animated events (`ANIMATED` in `store.ts`) in `queue`, with `current` the one playing (ADR-0002). For as long as the queue runs, `game` is ahead of the screen. Two rules hide that on the table:

- `heldGame(game, queue)` (`spotlight.ts:87`): for each queued `enemyMove`, the enemy is patched back to `data.from`, unengaged (`patchedState`), so the map moves it when its event plays.
- `heldCards({ current, queue })` (`store.ts:62`): the cards of playing or queued `encounter` and `weakness` events (`HELD`); they wait in the showcase until tapped.

Readers today:

| Surface                                                                    | Reads                              | Holds enemy moves | Hides waiting cards |
| -------------------------------------------------------------------------- | ---------------------------------- | ----------------- | ------------------- |
| Map (`Table.tsx` `Scene`, arrivals)                                        | `heldGame`, `heldCards`            | yes               | yes (arrival hold)  |
| Play strip (`PlayStrip.tsx`)                                               | `heldGame`, `heldCards`            | yes               | yes (filtered)      |
| Investigators' modal (`Investigators.tsx`)                                 | raw `game`                         | no                | no                  |
| Phone strip modal (`AssetsModal.tsx`)                                      | raw `game`                         | no                | no                  |
| Encounter discard (`PileColumn.tsx`)                                       | raw `game`                         | n/a               | no                  |
| Counters (`Stats.tsx`, `TokenBadges.tsx`, `ScenarioPanel.tsx`, map tokens) | raw `game`                         | n/a               | n/a                 |
| Options, bar, skill-test screen, showcase, hand, feed                      | raw `game` (plus their own clocks) | n/a               | n/a                 |

The first five rows draw where cards are; the counters show numbers whose events carry only deltas (`EVENT.Damage` has `{ damage, horror }`, `EVENT.Doom` `n`); the last row answers the choice, which the input gate keeps closed while events play.

## Goals / Non-Goals

**Goals:**

- One pure function gives "the table as played so far" for placement, and one hook serves it.
- Every surface that draws card placement uses it; the map and the strip keep their behaviour.

**Non-Goals:**

- Holding counters back (open question; needs prior values).
- Changing which events are animated or how they are paced (`ui-event-conductor`).
- Reading the pending choice from anything but the live game.

## Decisions

### 1. Before and after (component view of the UI container)

Before:

```
  game store: game, current, queue
     |              |                |                     |
     | heldGame +   | heldGame +     | raw game            | raw game
     | heldCards    | heldCards      |                     |
     v              v                v                     v
  Map (Table)    PlayStrip     Investigators modal,    counters, options,
  (own memo)     (own filter)  AssetsModal,            hand, feed
                               encounter discard   <-- run ahead
```

After:

```
  game store: game, current, queue
            |
            v
  +----------------------------------------+
  | presented(game, current, queue)        |  src/ui/game/presented.ts, pure
  | -> { game: held placement,             |  (heldGame + heldCards moved here)
  |      waiting: Set<InstId> }            |
  +-------------------+--------------------+
                      |
               usePresented()  (memo on game, current, queue)
                      |
     +----------+-----+--------+-------------------+------------------+
     v          v              v                   v                  v
   Map      PlayStrip   Investigators modal    AssetsModal     encounter discard

  live game (unchanged): options and bar (behind the input gate), skill-test screen,
  showcase, hand, feed, counters
```

- `presented` returns the same `game` object when nothing is held, so memoised layouts (`layout(db, game, viewer)` in `SceneInner`) don't recompute.
- `waiting` is a set; surfaces filter with it as `PlayStrip` does. The map keeps its arrival hold, reading `waiting` instead of calling `heldCards(gameStore.getState())`.
- Rejected: switching all 36 raw readers to the presented game. Counters would still be ahead (no prior values), and the pending choice must stay live; a blanket switch would only hide which surfaces matter.
- Rejected: holding the store's `game` itself until the queue drains. The pending choice, undo and online moves all key off the real state; that would be a second game state in the UI.

### 2. Placement only

The rule covers where a card is (location, engaged investigator) and whether it is on the table yet. Exhaustion, tokens and counters stay live. This matches what the two existing rules do and keeps `presented` free of per-event inverse logic; the open question records the counter case.

## Risks / Trade-offs

- [A modal opened on a waiting card (an engaged enemy) loses it until the event plays] -> that is the intent; the spec scenario checks it reappears when its move plays.
- [The encounter discard count drops by one while a treachery waits] -> matches the map and strip; checked in the browser.
- [`presented` grows into per-event inverses] -> the design limits it to placement; a counter rule needs its own change and event data.

## Migration Plan

No saved data changes. Move `heldGame`/`heldCards` and their tests into `presented.ts`, switch the map and strip (no behaviour change), then the three new surfaces. Rollback is a revert.

## Open Questions

- Should counters wait for their events too?
- Should the HUD's spotlight and camera focus read the presented game?
- Other surfaces seen running ahead?

No in-force ADR needs revisiting: this extends ADR-0002 (presentation follows the animation clock) from channels to table state, and keeps ADR-0004's split (the decision is the engine's live state).
