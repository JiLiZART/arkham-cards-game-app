## 1. Move log (pure, no network)

- [ ] 1.1 Define `Move` and `Numbered` in `src/net/moves.ts`, and the save's optional `room` field `{id, playerKey, seats, n}` in `Save`. Older saves still load (test).
- [ ] 1.2 `applyMove(store, move)`: route each move kind to the existing store call (`newCampaign`, `startScenario`, `choose`, `answerFlow`, `upgradeDeck`, `undo`, load a save). Test: a hot-seat game and the same calls applied as moves end in identical `campaign`, `setup` and `actions`.
- [ ] 1.3 `allowed(state, move, by, roster)`: the permission rules from the design (seat of `pending.inv`, the last mover's undo before any later move and above the floor, own investigator's upgrade, host-only `new` and `load`, any seated player for flow and start). Table-driven tests.
- [ ] 1.4 `HostLog`: accept a proposal only at the current length, check it with `allowed`, apply, number, and emit. Refusals carry a reason. Tests for stale, forbidden and accepted proposals.
- [ ] 1.5 `PeerLog`: apply numbered moves in order, buffer gaps, and report `have`. Merge a longer tail from another peer, with "all logs are prefixes" asserted. Tests, including host takeover with one move only some peers received.

## 2. Store and view integration

- [ ] 2.1 When a room is open, the store's shared calls send proposals instead of applying. Applying happens through `PeerLog` only. Without a room, behaviour is unchanged (the existing store tests pass untouched).
- [ ] 2.2 Persist `room` in the save after every applied move, and restore it on load.
- [ ] 2.3 Add `mySeats` to the view store. With no room it is every investigator. `choicesOffered` also requires the decider in `mySeats` (tests in `players.test.ts`).
- [ ] 2.4 `barAsk` gains `{ kind: "waiting", inv }` when the decider is held elsewhere. The instruction bar renders "Waiting for <investigator>" (`net.waiting`, EN and RU).
- [ ] 2.5 `canUndo` in a room: only the last mover, only while their move is last. The tooltip names who can undo (`net.undoBy`, EN and RU). Tests.
- [ ] 2.6 Queue numbered moves while `prepare` is loading packs, and apply them after it finishes. Test with a delayed `prepare`.

## 3. Signaling Worker (`worker/`)

- [ ] 3.1 Add `wrangler` as a devDependency, with `worker/wrangler.toml` (the route `arkham.artkost.dev/net/*`, the Durable Object binding and migration) and `worker/src/index.ts`. Add `pnpm net:dev` to run it locally.
- [ ] 3.2 Room logic as pure functions in `worker/src/room.ts`: hello with a version check, roster with SHA-256 player key hashes, claiming, changing and releasing a seat (the host may release seats away at least two minutes), the lobby, picking the host by highest `have`, and signal relay addressing. Vitest tests, run in Node.
- [ ] 3.3 `Room` Durable Object: WebSocket hibernation API, storage for the room metadata, and the pure functions from 3.2. It never stores moves.
- [ ] 3.4 `GET /net/turn?room=` returns public STUN plus Cloudflare TURN credentials minted from the `TURN_KEY_ID` and `TURN_KEY_TOKEN` secrets. Unknown rooms are refused. `GET /net/health` returns the build version.
- [ ] 3.5 Keep the Worker inside the repo's lint, format and typecheck (a tsconfig for `worker/`, included in `pnpm typecheck`).

## 4. Browser transport (`src/net/`)

- [ ] 4.1 Signaling client: WebSocket to `/net/room/:id`, hello and reconnect with backoff, and typed messages shared with the Worker (`src/net/protocol.ts`, imported by both).
- [ ] 4.2 Peer mesh: one `RTCPeerConnection` per pair, using the ICE servers from `/net/turn`, falling back to STUN with a warning. A reliable, ordered data channel `moves`. ICE restart on failure.
- [ ] 4.3 Net session: wires the signaling client, the mesh, `HostLog` or `PeerLog`, and the store. It handles host takeover when the Durable Object names a new host. It exposes connection state per player for the UI.
- [ ] 4.4 Room id and player key: 128 random bits each from `crypto.getRandomValues`, base64url. `#g=` is read on load and written while the room is open.
- [ ] 4.5 Feature detection: online entries show only after `/net/health` answers.

## 5. UI

- [ ] 5.1 "Play online" on the title screen and "Open online room" on the campaign screen. These are new components under `src/ui/menu/`, each in its own folder with a CSS Module (ADR-0016).
- [ ] 5.2 Lobby: the host chooses campaign and difficulty, players claim seats with a content deck or one of their saved custom decks, taken investigators are marked, and Start is for the host. It also shows the hidden-information notice and Copy link.
- [ ] 5.3 Join flow for a `#g=` link: version mismatch with a reload offer, claim a free seat or watch as a spectator, and seats restored for a known player key.
- [ ] 5.4 Rejoin prompt when the app opens without the link but the save has a room.
- [ ] 5.5 Connection indicator in the top bar: each player connected, reconnecting or away, the host marked, and the host's "release seat" for players away at least two minutes.
- [ ] 5.6 All new strings in `content/i18n/{en,ru}/ui.json`, in both locales.

## 6. Deploy and docs

- [ ] 6.1 `.github/workflows/deploy.yml`: after the Pages publish, run `wrangler deploy` with the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. A Worker failure does not undo the site's publish.
- [ ] 6.2 README: online play, local setup (`pnpm net:dev` beside `pnpm dev`), the Cloudflare secrets, the proxied DNS record, and creating the TURN key. Update AGENTS.md key directories with `src/net/` and `worker/`.

## 7. Verification

- [ ] 7.1 Two Playwright browser contexts on your own dev server and `wrangler dev`. Ana opens a room, Ben joins and claims Agnes, and they play a turn each. Check that both tables match, then save screenshots under `.playwright-mcp/net-session/`.
- [ ] 7.2 Rejoin: reload Ben's page mid-scenario and check the seats and state come back. Then close Ana's tab and check that Ben becomes host and play goes on.
- [ ] 7.3 Spectator, version mismatch and online undo scenarios from the online-play spec, run by hand in the browser.
- [ ] 7.4 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:content` and `pnpm build` pass.
- [ ] 7.5 `openspec validate net-session --type change --strict` passes.
