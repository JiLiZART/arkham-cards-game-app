## Why

Arkham Table is hot-seat only: every investigator plays on one device. Friends who live apart cannot play a campaign together, and a crashed or closed tab can only resume on the same browser. The engine already makes a game a seed plus a list of choices, so syncing that list between browsers is a small step from what exists.

## What Changes

- **Online rooms.** A player opens a room from the title screen, or from a saved campaign. The room gets a random, unguessable id in the URL hash (`#g=<id>`). Sending the link to friends invites them.
- **Lobby.** For a new campaign the host picks the campaign and difficulty. Each player picks their own investigator and deck, either from the content or a custom deck saved on their device. Duplicate investigators are refused, and a player may take more than one seat. The host presses Start once every seat is taken.
- **Taking a saved campaign online.** The host's save becomes the room's log. Joiners claim the existing investigators instead of building new ones.
- **Seats.** Each browser holds one or more seats. Choices are offered only when the deciding investigator sits at this browser. Other players see the table update and a "waiting for <investigator>" bar. Hot-seat play stays the same when one browser holds every seat.
- **Sync.** Browsers exchange session moves over a WebRTC data channel: a choice, an undo, a campaign-flow answer, a scenario start, a deck upgrade. The host gives each move its number and sends it on to every peer. Each browser replays the moves with the existing engine. If the host leaves, the peer with the longest log takes over.
- **Rejoin.** Each browser keeps a random player key for the room in its save. Opening the same link again (after a crash, a reload or a closed tab) restores its seats and fetches the moves it missed. The host can release the seat of a player who has been gone for a while, so they can come back from another device.
- **Spectators.** Someone who opens the link when every seat is taken watches read-only.
- **Undo online.** Only the player who made the last choice may undo it, and only until someone else answers. The undo floor rules stay as they are.
- **Version check.** A browser whose build or engine version differs from the room's is refused with a message.
- **Signaling and TURN.** A small Cloudflare Worker in a new `worker/` folder, on the route `arkham.artkost.dev/net/*` in front of GitHub Pages, holds one Durable Object per room. It relays the WebRTC offers, answers and ICE candidates, and mints short-lived Cloudflare TURN credentials. Public STUN servers are used first. The Worker knows nothing about game rules. Signaling is same-origin (`/net/*`), so no address needs configuring. A build served without the Worker, such as `vite preview` or a static host, hides online play.
- **Not in this change:** chat and voice (a following change, `net-voice-chat`). This change also does not hide hands from the other players' browsers: every browser holds the full game state.

## Capabilities

### New Capabilities

- `online-play`: rooms and their link, the lobby, seats and who may answer, move sync and ordering, host takeover, rejoin, spectators, online undo, version check, and signaling with STUN/TURN.

### Modified Capabilities

- `campaign-play`: "Start a campaign" gains starting from an online lobby, and taking a saved campaign online.
- `game-table-ui`: "Undo" gains the online rule (only the player who made the choice, before anyone else answers). "Hot-seat play" becomes play from seats, where one browser may hold every seat or only some.
- `web-deployment`: the deploy also publishes the signaling Worker on the site's origin under `/net/`.

## Impact

- **Engine:** no change. Moves are the existing `Action`s plus the store's session calls (`answerFlow`, `startScenario`, `upgradeDeck`, `undo`, `newCampaign`).
- **UI state:** `src/ui/state/store.ts` routes session calls through a net layer when a room is open. The save gains the room id, the player key and the seats. The view store gains "my seats". Per-device settings (locale, pace, volume) stay local.
- **UI:** a lobby screen, an "Open online room" entry on the title and campaign screens, a join screen for links, a waiting bar, a connection indicator in the top bar, and new strings in `content/i18n/{en,ru}/ui.json`.
- **New code:** a `src/net/` module (peer connections, signaling client, move log), and `worker/` (the room Durable Object and the TURN credential route).
- **Dependencies:** `wrangler` as a devDependency, because the Worker needs Cloudflare's build and deploy tool. The browser gets no new runtime dependency: it uses the native `RTCPeerConnection` and `WebSocket`.
- **Deploy:** `.github/workflows/deploy.yml` also runs `wrangler deploy`. The repository needs Cloudflare secrets: an API token, the account id, and a Calls TURN key id and token. The domain's DNS record must be proxied by Cloudflare.
- **Privacy:** any player can read another player's hand from the browser's memory. This is accepted for a game among friends.
