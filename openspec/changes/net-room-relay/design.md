## Context

net-session (ADR-0018, ADR-0019) sends every session message over a WebRTC data channel between each pair of browsers. The room's Durable Object only relays connection setup (`signal`) and keeps the roster. When neither STUN nor TURN gives two browsers a direct link, `mesh.send` returns false and the message is dropped: the player can't propose, and the host's numbered moves never reach them. Cloudflare TURN needs billing on the account, which isn't available.

Every browser already holds a WebSocket to the room for the roster and for signaling, and the room already forwards `signal` messages between players by id.

## Goals / Non-Goals

**Goals:** every player in a room can play whatever their network, with no paid service; a TURN provider can be added later by secrets alone.

**Non-goals:** voice (it needs TURN or a media server, a later change); hiding moves from the room service beyond not reading them (they aren't encrypted end to end, as the data channel's are).

## Decisions

### 1. A `relay` message the room forwards without reading

`ToRoom` gains `{ t: "relay"; to: string; w: unknown }` and `FromRoom` gains `{ t: "relay"; from: string; w: unknown }`. The Durable Object handles it like `signal`: it looks up the addressed player's socket in the same room and sends `{ t: "relay", from: <sender's id>, w }`. The sender's id comes from the socket's attachment, never from the message, so the session's sender checks (a numbered move only from the host, a `moves` answer only from a peer asked) hold for relayed messages too. Nothing is stored.

```
  Ben's browser                 Room DO (one per room)             Ana's browser (host)
  +-------------+   relay        +------------------------+  relay      +-------------+
  | session     | {to:ana,w:     | webSocketMessage:       | {from:ben, | session     |
  |  sendTo()   |  propose} ---> |  socketOf("ana")        |  w:propose}|  onWire()   |
  |  mesh closed|                |  send, sender stamped   | ---------> |  hostHandle |
  +-------------+                +------------------------+            +-------------+
        ^                                   |                                 |
        |        relay {from:ana, w:move}   |   relay {to:ben, w:move}        |
        +-----------------------------------+<--------------------------------+
                 (Ana's mesh link to Ben is not open either, so her broadcast relays to Ben)
```

- Boundaries: the Durable Object forwards opaque payloads between players of one room; the sessions keep every rule.
- The direct link is preferred per message: `sendTo` tries `mesh.send` first and relays only when it returns false. When the link opens, the next message uses it, and no switch-over state is needed.
- Order: the log already buffers out-of-order moves and asks for gaps, so a move on the data channel overtaking one on the socket is harmless.

Rejected: a relay as a fake TURN server inside the Worker (Workers can't take UDP/TURN traffic); relaying only after a timeout (a slower start and a timer to tune, for nothing gained).

### 2. Catch-up from the roster

A joining browser used to send `have` when a data channel opened, and the side with fewer moves asked for the rest. Without a link that never happens. The roster already carries `have` (each player's log length, reported to the room). On each roster, a browser whose log is shorter than the host's asks the host (`need`), at most one outstanding question per peer. The data-channel `have` stays as it is.

### 3. "Connected via server" in the room menu

A player is "connected" when the data channel to them is open, "connected via server" when it isn't but both this browser and that player are online in the room, "reconnecting" when this browser has lost the room, and "away" when they're offline. The pill counts both connected states. The "No relay server" warning is removed, because every online player can be reached.

### 4. TURN from secrets

`iceServers()` takes, in order: the Cloudflare TURN key (unchanged), else `TURN_URLS` (comma-separated), `TURN_USERNAME` and `TURN_CREDENTIAL` as one static server entry, else STUN only. Static credentials are visible to anyone in a known room, which is how the free plans of such providers are meant to be used (they limit per key).

## Risks / Trade-offs

- **Relayed moves pass through Cloudflare unencrypted beyond TLS.** The room service could read them but doesn't; the data channel's end-to-end encryption no longer holds for those messages. Acceptable: every browser in the room already holds the whole game.
- **Message size.** A `load` move carries a whole save. Durable Object WebSocket messages allow well over a save's size; a save over that limit would fail to relay the same way it would fail to send on the data channel.
- **Cost.** Each relayed message is a Durable Object request (WebSocket messages are billed at a fraction of a request). A turn-based game sends a few per minute: far inside the free plan.
