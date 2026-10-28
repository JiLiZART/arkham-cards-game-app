## Why

Two browsers in a room talk over a WebRTC data channel. Public STUN is enough on most home networks, but office, school and mobile networks often block the direct link, and the relayed fallback (Cloudflare TURN) needs billing on the Cloudflare account, which this project can't add. Players on those networks can't join a game. The moves are small and turn-based, and every browser already keeps a WebSocket open to the room, so the room can carry them.

## What Changes

- **Moves through the room.** Whenever no direct link to a player is open, a browser sends its session messages (proposals, numbered moves, catch-up requests and answers, refusals) to that player through the room's WebSocket. The room forwards each one to the addressed player, stamped with the sender, without reading it. As soon as the direct link opens, messages use it again.
- **Catch-up without a direct link.** A browser that joins or comes back asks the host for the moves it misses as soon as the room's roster shows the host has more, instead of waiting for a direct link to open.
- **The room menu** shows a player reached through the room as "connected via server". The "No relay server" warning goes away: every player in the room can be reached.
- **Any TURN provider.** Besides a Cloudflare TURN key, the room hands out static TURN credentials set as three secrets (`TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL`), the form free plans such as Metered's Open Relay or ExpressTURN give.
- **Amends ADR-0019:** the room service still knows no game rules, but it now carries moves it can't read.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `online-play`: "Peer connections with public STUN and relayed TURN" becomes a direct link with the room as fallback, and a TURN provider configured by secrets.

## Impact

- `worker/src/do.ts` (a `relay` message forwarded to one player), `worker/src/turn.ts` (static TURN secrets).
- `src/net/protocol.ts` (the `relay` messages), `src/net/session.ts` (send through the room when the link isn't open; catch up from the roster).
- `src/ui/hud/NetIndicator/` and `content/i18n/{en,ru}/ui.json` ("connected via server", the warning removed).
- README's online-play section; a new ADR amending ADR-0019.
- Cost: each relayed message is a Durable Object WebSocket message, well inside the free plan for a card game's few moves per minute.
