## 1. Room relay

- [x] 1.1 Protocol: `ToRoom` `{ t: "relay"; to; w }` and `FromRoom` `{ t: "relay"; from; w }`.
- [x] 1.2 Durable Object: forward `relay` to the addressed player's socket in the same room, `from` taken from the sender's socket, nothing stored. (The session tests' room server does the same; a forged sender is refused there.)
- [x] 1.3 Session: every message to a player goes over the data channel when it is open, else through the room; the host's broadcast reaches each online player either way. Received `relay` messages go through the same handler and sender checks as data-channel ones.
- [x] 1.4 Session: catch up from the roster's `have` when the host has more moves, one outstanding question per peer.
- [x] 1.5 Session tests with a mesh whose links never open: a full lobby, start and moves; a reload catching up; a forged sender still refused.

## 2. TURN from secrets

- [x] 2.1 `iceServers()`: a Cloudflare TURN key first, else `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` as one entry after public STUN, else STUN only. Tests.

## 3. UI

- [x] 3.1 Room menu: "connected via server" for an online player with no open link; the pill counts it as connected; the "No relay server" warning removed. Strings in EN and RU.

## 4. Docs and verification

- [x] 4.1 README online-play section: the room fallback and the TURN secrets.
- [x] 4.2 Browsers with WebRTC disabled play a game through the local Worker; then the deployed Worker.
- [x] 4.3 `pnpm typecheck`, lint, tests, `openspec validate net-room-relay --strict`.
