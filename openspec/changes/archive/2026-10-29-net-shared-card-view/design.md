## Context

Opening a card at full size is view state: `useView().setModal(m)` with `m` one of `{ card }`, `{ deck: "act" | "agenda" | "reference" }`, `{ inv }`, `{ assets }`, `{ threats }`, `{ bag }` (ADR-0004). `Modals.tsx` renders whichever is open. Online, browsers exchange `Wire` messages through `Session` (ADR-0018), over the data channel or the room socket (ADR-0020); every browser replays the same moves, so a card's `InstId` names the same card on every table. Card instances carry `owner`: `null` for encounter and scenario cards.

## Goals / Non-Goals

**Goals:** the act, agenda, reference card and unowned cards a player opens appear on every browser in the room, labelled with who showed them; nothing else changes.

**Non-goals:** a pointer or highlight on the 3D map; mirroring closes; sharing hand, play-area or investigator views; hot-seat changes.

## Decisions

### 1. A `show` wire message outside the move log

`Wire` gains `{ t: "show"; m: { card: InstId } | { deck: "act" | "agenda" | "reference" } }`. `Session.show(m)` sends it to every other online player with the existing `sendAll`. On receipt, the session hands `(sender's name, m)` to a new dependency `onShow`, as it hands seats to `setMySeats`. The session doesn't check the card: it knows no game rules. Senders are authenticated by the channel the message came through, as for every wire message.

```
  Ana's browser                                            Ben's browser
  +---------------------------+                            +------------------------------+
  | Modals / ScenarioPanel    |                            | connect.ts onShow(name, m)   |
  |  setModal({deck:"agenda"})|                            |  shareable & on table?       |
  | view store                |   Wire {t:"show", m}       |  modal, menu, drag all free? |
  |  -> shared? session.show  | -- data channel or room -->|  setModal(m), shownBy="Ana"  |
  +---------------------------+     (sendAll, ADR-0020)    | Modals: "Ana is showing"     |
                                                           +------------------------------+
```

Rejected: logging it as a move (it would replay, enter undo and saves, and wait for the host); a room-server broadcast (the room would need a message type for what the mesh already carries).

### 2. Which views are shared: a pure function in the UI

`sharedView(game, m)` returns true for `{ deck }`, and for `{ card }` whose instance exists with `owner === null`. It runs on the sender before sending and on the receiver before opening, so a stale or private id never opens. It lives in `src/ui/game/` beside the other table logic and is unit-tested.

### 3. Sending from the view store, receiving in `connect.ts`

`setModal` stays the one entry point. `connect.ts` (where the session meets the stores) subscribes to the view store: when `modal` changes to a shared view that this browser opened, it calls `session.show`. Received views go through `onShow`, which sets the modal and `shownBy` (the sender's name) in one `set`; any later `setModal` clears `shownBy`. A view opened by `onShow` is not sent back, because it carries `shownBy`.

The receiver opens nothing while `modal`, `menu` or `moveDrag` is set, during the scenario intro, or when a card's id isn't in its game yet (it is behind on moves). The view is dropped, not queued: the sender can show it again.

### 4. The label

`CardModal` and `DeckViewer` show "{name} is showing" (`net.showing`) above the card when `shownBy` is set. EN and RU strings.

## Risks / Trade-offs

- [A player opens many cards quickly and floods the other screen] -> each new view replaces only a view that is itself shown (`shownBy` set); a view the receiver opened themselves blocks it. Closing is always one click or Escape.
- [Hidden information] -> unowned cards on the table are public already; deck order and hands are never sent. Every browser holds the whole game anyway (online-play spec).
- [Old browsers in the room ignore `show`] -> an unknown wire type falls through the session's switch; no protocol bump needed.

## Migration Plan

None: a new optional message. Deploy the site; a browser on the old build ignores it.

## Open Questions

None. In-force ADRs reviewed: ADR-0004 (view vs game state), ADR-0018 (host-ordered log), ADR-0020 (room fallback, superseding ADR-0019 in part); this design stays within them.
