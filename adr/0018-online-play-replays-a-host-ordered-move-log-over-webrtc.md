# ADR-0018: Online play replays a host-ordered log of session moves, sent peer to peer over WebRTC

- Status: accepted
- Date: 2026-10-28

## Context and Problem Statement

Players on different devices want to play one campaign together, and to rejoin after a crash. The engine is deterministic: a game is its setup plus a list of choices, and `replay()` rebuilds the state. The store already saves and restores games that way. Some shared changes are not engine choices: the campaign flow between scenarios, beginning a scenario, deck upgrades and undo. The site is static, and nothing runs game code on a server. How should browsers keep one shared game?

## Considered Options

- A log of session moves (a choice, a flow answer, a scenario start, an upgrade, an undo, a campaign start or a loaded save). The host numbers each move and sends it on over WebRTC data channels, and every browser applies it with the unchanged engine.
- Sync engine `Action`s only.
- Send whole state snapshots after every change.
- An authoritative server running the engine, with each browser seeing only its own hidden information.
- No ordering: each move carries the log length it was made at, and browsers drop stale ones.

## Decision Outcome

Chosen option: "a host-ordered log of session moves". It reuses what the engine and store already guarantee: same moves in, same state out. It covers the campaign flow and deck upgrades, which an `Action`-only log misses. It needs no server that knows the rules. Snapshots are large and redundant given replay. An authoritative server would hide cards, but it would need hosting with the engine and its content, and that is out of scope for a fan project played among friends. Without ordering, undo and flow answers race.

Moves are applied only when their numbered copy arrives, never optimistically. Only the host numbers moves, so every browser's log is a prefix of one log. When the host leaves, the browser with the longest log takes over. Every browser re-runs the permission checks (whose seat may answer, who may undo) on each numbered move.

### Consequences

- Good, because the engine does not change, and a room's game is reproducible from its log like any saved game.
- Good, because rejoin is "restore the save, fetch the missing tail", and host takeover needs no consensus protocol.
- Good, because the peer mesh is reused by later voice and chat.
- Bad, because every browser holds the full game state, hands and deck order included. Online play cannot stop a player from reading hidden cards.
- Bad, because every new store call that changes shared state must become a move, or online browsers drift apart.
- Bad, because all browsers in a room must run the same build and engine version. A deploy mid-session asks late joiners to reload.
