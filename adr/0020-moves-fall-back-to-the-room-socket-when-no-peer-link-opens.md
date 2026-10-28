# ADR-0020: Moves fall back to the room's socket when no peer link opens

- Status: accepted, supersedes ADR-0019 in part (the room service now carries moves)
- Supersedes: ADR-0019
- Date: 2026-10-28

## Context and Problem Statement

Online play sends session messages between browsers over WebRTC data channels (ADR-0018), set up through a Cloudflare Worker with a Durable Object per room (ADR-0019). Public STUN gives a direct link on most home networks; office, school and mobile networks often need a TURN relay. ADR-0019 chose Cloudflare TURN, but it needs billing on the Cloudflare account, which this project can't add. Without a relay, a player on such a network can't send or receive a single move. Every browser already keeps a WebSocket open to its room's Durable Object. How do messages reach a player when no direct link opens?

## Considered Options

- The room's Durable Object forwards a message to one player of the room, stamped with the sender's id, without reading or storing it. A browser uses this whenever no data channel to that player is open.
- A free TURN provider (Metered's Open Relay, ExpressTURN) with static credentials.
- Self-hosted coturn on a small server.
- No fallback: players whose networks block direct links can't join.

## Decision Outcome

Chosen option: "the room's Durable Object forwards messages", because it reaches every player who can open the site, costs nothing on the free plan for a turn-based game's few messages a minute, needs no other account or server, and reuses the socket and the sender stamping that signaling already has. The sessions keep every rule: the room still knows nothing about the game, but it now carries moves it can't interpret. A TURN provider stays possible: the room hands out static credentials set as secrets, as well as a Cloudflare TURN key.

### Consequences

- Good, because no network a browser can load the site from is left out, without paid services.
- Good, because the direct link is still preferred message by message, so latency is only paid where needed.
- Bad, because relayed messages are protected only by TLS to Cloudflare, not end to end as on a data channel. The room service could read them. Every browser in a room already holds the whole game, so this exposes nothing a player couldn't see.
- Bad, because the room service is no longer move-free, and its message volume grows with relayed players.
- Follow-up: voice (a later change) can't use this path; it will need TURN, from a provider set by secrets.
