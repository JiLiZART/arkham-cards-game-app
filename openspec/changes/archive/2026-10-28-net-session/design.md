## Context

A game is `setup` plus a list of `Action`s, and `replay()` rebuilds the state (`src/engine/engine.ts`). The game store (`src/ui/state/store.ts`) records every choice, saves `{campaign, setup, actions, settings}` to localStorage, and restores by replaying. Only one investigator answers at a time (`pending.inv`). ADR-0004 keeps "who is looking" in the view store and "who decides" in the engine, and it names spectators as a view-store feature.

Some session calls never reach the action list: `newCampaign`, `answerFlow` (campaign flow between scenarios), `startScenario(seed)`, `upgradeDeck` and `undo`. They change `campaign`, or replace the action list, so they must sync too.

The site stays on GitHub Pages. Its domain, arkham.artkost.dev, is on Cloudflare DNS, so a Worker can take the route `arkham.artkost.dev/net/*` in front of Pages when the record is proxied. Signaling is then same-origin, with no address to configure and no CORS. The Worker lives in a new `worker/` folder and is deployed with `wrangler`. If hosting later moves to Cloudflare, this Worker can also serve the site.

Format and rigor of the diagrams: plain ASCII, lightweight C4-inspired (container and dynamic views only).

## Goals / Non-Goals

**Goals:**

- Two to four browsers play one campaign over the internet, from the lobby or from an existing save.
- A link (`#g=<room id>`) invites a player, and the same link rejoins after a crash or reload.
- The engine does not change, and a one-device game behaves exactly as today.
- No server holds game rules or game logs.

**Non-Goals:**

- Chat and voice, which come in `net-voice-chat`. The mesh built here is reused for them.
- Hiding hidden information from other browsers. Every browser holds the full state.
- Accounts, matchmaking, public room lists.
- Play between different builds.

## Decisions

### Container view

```
  +-----------+        +-----------+        +-----------+
  | Player A  |        | Player B  |        | Spectator |
  | (host)    |        |           |        |           |
  +-----+-----+        +-----+-----+        +-----+-----+
        | uses               | uses               | uses
        v                    v                    v
  +--------------------------------------------------------+
  | Browser SPA (one per player)                           |
  |  engine (pure) <-- game store <-- net session (src/net)|
  |  view store: viewing, mySeats      RTCPeerConnection   |
  +----+--------------------+-----------------+------------+
       | HTTPS              | WebSocket       | WebRTC data channel
       | site, /cards       | /net/room/:id   | (peer to peer, mesh)
       v                    v                 v
  +-------------------------------+     +------------------+
  | GitHub Pages: site, /cards    |     | other browsers   |
  +-------------------------------+     +------------------+
  | Net Worker (Cloudflare),      |
  |  route arkham.artkost.dev/net/*
  |  /net/turn  -> TURN creds     |---->  Cloudflare Calls TURN API
  |  Room Durable Object (1/room) |
  |   roster, seats, lobby, host  |
  +-------------------------------+
  STUN: stun.cloudflare.com, stun.l.google.com (public, no creds)
  TURN: turn.cloudflare.com, short-lived creds from /net/turn
```

- The browser does all the game work. The net session sits between the UI and the game store. When a room is open, every session call becomes a move proposal instead of a direct store call.
- The Room Durable Object is the rendezvous point. It holds the room's small, durable metadata: build and engine version, the roster (player key hash, display name, seats), the lobby choices, and who the host is. It relays WebRTC signaling between peers. It never sees moves.
- Moves travel over the data channel, from a peer to the host and from the host to everyone.

### The move log

A move is one session call, in a shape the store already understands:

```
Move =
  | { t: "new"; opts: NewCampaign }            // lobby Start
  | { t: "start"; seed: number }
  | { t: "choose"; inv: InvId; option: string }
  | { t: "flow"; value: FlowValue }
  | { t: "upgrade"; inv: InvId; cards: Record<string, number> }
  | { t: "undo" }
  | { t: "cancelTest" }                        // calling a skill test off
  | { t: "finish" }                            // the scenario's end, applied to the campaign
  | { t: "load"; save: Save }                  // a saved campaign taken online: move 0
Numbered = { n: number; by: playerKeyHash; move: Move }
```

The room's state is the result of applying moves `0..n` in order through the existing store functions. The store's save stays as it is, plus a `room` field `{id, playerKey, seats, n}`. A rejoining browser restores from its save as today, then asks for moves after `n`.

Alternatives considered: syncing engine `Action`s only, which misses the campaign flow and deck upgrades. Syncing whole state snapshots is large, and replay already makes them unnecessary.

### Host ordering, no optimistic apply

The host numbers moves. A peer sends a proposal `{ move, at: n }`. The host checks that `at` equals its log length, applies the move, and broadcasts the numbered move. If the store refuses it, the host replies with the error and the proposer shows it. A peer applies a move only when the numbered copy arrives, so peers never roll back. A round trip on a turn-based game is acceptable.

The host also checks permission before applying:

- `choose` only from the player who holds `pending.inv`'s seat;
- `undo` only from the player who made the last move, while it is still the last move, above the undo floor;
- `flow` and `start` from any seated player, matching today's shared screen;
- `upgrade` only for the player's own investigator;
- `new` and `load` only from the host.

Every peer runs the same checks when applying a numbered move. A move that fails the check is still applied, because peers must not diverge, and the peer shows a warning that the host accepted a forbidden move.

While "Tap decks to draw" is off, a browser answers the draw prompts of its own seats by sending those draws as moves. The store's local auto-answering is switched off in a room, because it would add choices that exist on one device only.

Alternatives considered: the Durable Object numbering moves (it would then store logs and cost more per room), and no ordering with per-move indexes (undo and flow answers can race).

### Host takeover and "longest log wins"

All logs are prefixes of one log, because only the host numbers moves. When the host's WebSocket and data channel drop, the Durable Object asks connected peers for their `n` and names the peer with the highest `n` as the new host. Peers then fetch any moves they lack from it. When a browser returns with a longer log than the current host, the host fetches the missing tail from it. This also covers "everyone left and came back": each save holds a prefix, and the longest one wins.

### Join, rejoin and lobby (dynamic view)

```
 Browser B                 Room DO                  Host A
    |  open #g=ROOM            |                       |
    |-- WS hello {ver, key?} ->|                       |
    |                          |-- version check       |
    |<- roster, lobby, host ---|                       |
    |  (key known: seats back; unknown: claim seat or spectate)
    |-- offer (relay) -------->|-- offer ------------->|
    |<- answer (relay) --------|<- answer -------------|
    |<========== ICE (STUN, then TURN) ===============>|
    |== data channel: have {n} =======================>|
    |<= numbered moves n+1.. =========================|
    |  replay -> same state as A                      |
```

- **Room id.** 128 random bits, base64url, in the hash, so it never reaches server logs. It is not derived from the game, which makes it unguessable and lets a room outlive a scenario restart.
- **Player key.** 128 random bits per browser per room, kept in the save. The Durable Object stores only its SHA-256. A hello with a known key gets its seats back. The host can release a seat whose player has been away, and the next claimant takes it.
- **Lobby.** The Durable Object holds the lobby (campaign, difficulty, each seat's investigator and deck), so it survives the host reloading. Each player sets their own seat. A custom deck travels as the `DeckDef` already in `NewCampaign`. When the host presses Start, it builds `NewCampaign` with a fresh seed and proposes `{ t: "new" }` as move 0. Its pack loading (`prepare`) runs on every browser before the move applies.
- **Saved campaign online.** The host proposes `{ t: "load", save }` as move 0, and the lobby shows that save's investigators as seats to claim.
- **Mesh.** Each pair of browsers opens its own connection, up to six for four players. The host relay would be enough for moves, but voice later needs pairs, and six connections are cheap.

### Seats in the UI

`mySeats` lives in the view store, which keeps ADR-0004: deciding stays engine state, and seats sit beside `viewing`. `choicesOffered` also requires the deciding investigator to be in `mySeats`. When it is not, the instruction bar shows "Waiting for <investigator>" (new i18n key). Spectators have an empty `mySeats`. With no room open, `mySeats` is every investigator, which is exactly today's hot-seat play.

### TURN credentials

`GET /net/turn?room=<id>` returns ICE servers. It lists public STUN first, then Cloudflare TURN with credentials minted for a few hours through the Calls TURN API, using a Worker secret. The route refuses rooms that the Durable Object does not know, so the credentials cannot be farmed through an open endpoint. When the call fails, the client goes on with STUN only and warns that some networks may not connect.

## Risks / Trade-offs

- [Every browser holds hands and deck order] -> accepted for friends, stated in the spec. Real hiding would need a server-side engine, which is out of scope.
- [Symmetric NAT without TURN] -> TURN credentials from the Worker. Without them, the connection indicator says so.
- [Build mismatch after a deploy mid-session] -> the version is checked at hello. A peer on an old build is asked to reload, and its save survives the reload.
- [Cheating host] -> every peer re-runs the permission checks on numbered moves and flags a refusal. It does not resolve disputes.
- [Durable Object cost] -> one object per room, idle when no socket is open, with only a few kilobytes stored. It fits the free tier for a hobby project.
- [Lazy pack loading delays applying moves] -> moves queue until `prepare` finishes. The UI shows "loading" as today.
- [Six connections on phones] -> accepted for four players. If it struggles, fall back to relaying through the host.

## Migration Plan

1. Make sure the arkham.artkost.dev DNS record is proxied by Cloudflare (orange cloud), and create a Calls TURN key.
2. Add repository secrets: a Cloudflare API token, the account id, and the TURN key id and token.
3. The deploy workflow runs `wrangler deploy` for `worker/` after the Pages build. Deploying is additive: the site keeps working, and online entries appear once `/net/health` answers.
4. Rollback: redeploy the previous Worker version. Saves keep working because the `room` field is optional and ignored by older builds.

## Open Questions

- Display names: typed by the player in the lobby, or the investigator name only? The default is a typed name stored per device.
- How long until the host may release an absent player's seat? The proposal is 2 minutes of disconnect.
- Should the Durable Object expire rooms with no visitors, for example after 30 days? It would keep storage tidy, and saves would still let the host reopen a room.
- No in-force ADR needs to be superseded. ADR-0004 already covers seats as view state. A new ADR should record "host-ordered move log over WebRTC, rule-free signaling Worker".
