# online-play Specification

## Purpose

Online play: a room of browsers on one game. The host orders the moves of a session, every browser replays them through the unchanged engine, and a rule-free Cloudflare Worker only relays signaling and room state (ADR-0018, ADR-0019).

## Requirements

### Requirement: Online rooms and their link

The game SHALL let a player open an online room from the title screen (for a new campaign) or from the campaign screen (for the campaign in progress). The room gets an id of 128 random bits, written base64url in the URL hash as `#g=<id>`. The address bar SHALL show that link while the room is open, and a Copy link button SHALL put it on the clipboard. The id MUST NOT be derived from the game, and it MUST NOT be sent to any server other than the signaling service.

Online play SHALL be offered only when the signaling service answers. Otherwise the online entries are hidden, and everything else works as before.

#### Scenario: Opening a room for a new campaign

- **GIVEN** the signaling service is reachable
- **WHEN** a player chooses "Play online" on the title screen
- **THEN** the lobby opens, the address bar ends with `#g=` and a 22-character id, and Copy link copies the full address

#### Scenario: No signaling service

- **GIVEN** the build is served without the signaling service
- **WHEN** the title screen shows
- **THEN** it has no online entry, and New game and Continue work as before

### Requirement: Lobby

For a new campaign the room SHALL start in a lobby. The host, who opened the room, chooses the campaign and difficulty. Every player in the room sees the same lobby. A player claims a seat by choosing an investigator and a deck, either a content deck or a custom deck saved on their own device. The same investigator MUST NOT be claimed twice. A player MAY claim more than one seat. A player MAY change or release their own seats until the game starts. Start SHALL be enabled for the host only, once at least one seat is claimed and every claimed seat has a deck. Pressing it starts the campaign on every browser with the same seed.

The lobby SHALL survive the host reloading the page.

#### Scenario: Two players fill the lobby

- **GIVEN** Ana opened a room and chose Night of the Zealot, Standard
- **WHEN** Ben opens the link, picks Agnes with her starter deck, and Ana picks Roland
- **THEN** both lobbies show Roland (Ana) and Agnes (Ben), and Ana's Start is enabled

#### Scenario: Investigator already taken

- **WHEN** Ben tries to pick Roland, whom Ana holds
- **THEN** Roland is shown as taken by Ana and cannot be chosen

#### Scenario: A custom deck from the joiner's device

- **WHEN** Ben picks Agnes with a custom deck saved in his browser and Ana starts
- **THEN** Agnes plays Ben's custom deck on both browsers

### Requirement: Taking a saved campaign online

The host SHALL be able to open a room on the campaign saved on their device, including a scenario in progress. The room then starts from that save, and joiners claim its existing investigators instead of building new ones. Seats not claimed stay with the host.

#### Scenario: Mid-scenario save goes online

- **GIVEN** Ana's save is in The Midnight Masks with Roland and Agnes, Agnes to act
- **WHEN** Ana opens a room on it and Ben claims Agnes
- **THEN** Ben's browser shows the same table, and Agnes's choices appear on Ben's browser only

### Requirement: Seats decide who answers

Each browser in a room SHALL hold zero or more seats. A choice SHALL be offered only on the browser holding the seat of the investigator who decides it. On every other browser the instruction bar shows "Waiting for <investigator>", and the choice's buttons and hand actions are inert. A browser opens on its own seat's table, also while another browser's investigator decides; it MAY look at any investigator's table from the player bar, but cards in a hand it does not hold are shown face down. Campaign flow prompts between scenarios (choices, Continue, Begin) SHALL be answerable from any seated browser, and the first answer counts.

#### Scenario: Another browser's investigator decides

- **WHEN** it is Agnes's turn and Ben holds Agnes
- **THEN** Ana's browser stays on Roland's table with her own hand face up, and its bar says "Waiting for Ben: Agnes"

#### Scenario: Agnes decides on Ben's browser

- **WHEN** it is Agnes's turn
- **THEN** Ben's browser offers her actions, and Ana's browser shows "Waiting for Agnes" with no action buttons

#### Scenario: A commit to another investigator's test

- **WHEN** Roland (Ana) tests and Agnes (Ben) may commit
- **THEN** the commit window opens on Ben's browser, and Ana's bar waits for Agnes

### Requirement: Moves are ordered by the host and replayed everywhere

Every change to the shared game SHALL travel as a move: starting the campaign, beginning a scenario, a choice, a campaign-flow answer, a deck upgrade, an undo, or loading a saved campaign. A browser sends its move to the host. The host checks that it was made on the latest state and is allowed from that player, numbers it, applies it, and sends it to every browser. Each browser applies numbered moves in order with the same engine, so every browser reaches the same state. A browser SHALL NOT apply its own move before the numbered copy arrives. A refused move SHALL be reported to its sender only, and no browser's state changes.

Settings stay on each device: language, pace, tap decks, sound and tips.

#### Scenario: Same state everywhere

- **WHEN** Ben's Agnes plays Shrivelling and draws a chaos token
- **THEN** Ana's browser shows the same token, the same result, and the same feed entries

#### Scenario: Stale move

- **WHEN** Ben answers a prompt that a move from Ana has already closed
- **THEN** the host refuses it, Ben sees why, and both browsers show the state after Ana's move

#### Scenario: Different languages

- **WHEN** Ana plays in English and Ben in Russian
- **THEN** each sees the game in their own language, with identical state

### Requirement: Host takeover

When the host leaves, the room SHALL go on. The connected browser with the longest move log becomes the host. Every browser fetches any moves it lacks from the new host. When a browser joins with a longer log than the host's, the host fetches the missing moves from it.

#### Scenario: Host closes the tab

- **GIVEN** Ana (host), Ben and Cleo are playing
- **WHEN** Ana closes her tab
- **THEN** within a few seconds the next move by Ben or Cleo is accepted, and the connection indicator names the new host

### Requirement: Rejoin after a crash or reload

Each browser SHALL keep, in its save, the room id, a random player key for that room, its seats and its move count. Opening the room's link again on the same browser SHALL restore its seats and fetch the moves it missed. Opening the app without the link, with such a save, SHALL offer to rejoin the room. The host SHALL be able to release the seats of a player who has been disconnected for at least two minutes, and another browser can then claim them.

#### Scenario: Browser crash

- **GIVEN** Ben holds Agnes and his browser crashes
- **WHEN** Ben opens the link again
- **THEN** he holds Agnes again, and his table matches Ana's, including moves made while he was away

#### Scenario: New device

- **GIVEN** Ben's laptop died and he has been gone for more than two minutes
- **WHEN** Ana releases Ben's seat and Ben opens the link on his phone
- **THEN** Ben can claim Agnes on the phone

### Requirement: Spectators

A browser that opens a room's link without a seat, when no seat is free, SHALL join as a spectator. A spectator sees the board, the feed and every animation, with every hand face down, may look at any investigator's play area, and has no choices offered.

#### Scenario: Full room

- **GIVEN** all seats are held
- **WHEN** Dan opens the link
- **THEN** Dan watches the game, and his instruction bar only ever says who is deciding

### Requirement: Online undo

In a room, Undo SHALL be offered only to the player whose choice is the last move, and only until another move is numbered after it. The undo floor applies as in hot-seat play. The undo is itself a move, so every browser takes the choice back.

#### Scenario: Taking back a commit

- **WHEN** Ben commits a card by mistake and no one has answered since
- **THEN** Ben's Undo is enabled, Ana's is disabled, and Ben's undo returns the card to his hand on both browsers

#### Scenario: Too late

- **WHEN** Ana answers a prompt after Ben's choice
- **THEN** Ben's Undo is disabled

### Requirement: Version check

A browser SHALL join a room only when its build and engine versions match the room's. Otherwise it shows that the versions differ and offers to reload, and the room is unaffected.

#### Scenario: Old tab after a deploy

- **GIVEN** a new build was deployed after Ana opened the room
- **WHEN** Ben joins on the new build
- **THEN** Ben is told the versions differ, and Ana's game goes on

### Requirement: Peer connections with public STUN and relayed TURN

Browsers in a room SHALL connect to each other directly with WebRTC, every pair with its own connection. The signaling service SHALL relay connection setup between browsers in the same room and SHALL NOT receive moves. A browser SHALL try public STUN servers first, then TURN relays with short-lived credentials from the signaling service. The service SHALL refuse TURN credentials for rooms it does not know. When TURN is unavailable, the game SHALL go on with STUN only and say that some networks may fail to connect.

A connection indicator in the top bar SHALL show each player's state: connected, reconnecting or away.

#### Scenario: Behind a strict mobile network

- **GIVEN** Ben is on a mobile network where direct connections fail
- **WHEN** he joins
- **THEN** his browser connects through the TURN relay and plays normally

#### Scenario: Player drops

- **WHEN** Ben's network drops for ten seconds
- **THEN** the indicator shows Ben reconnecting, then connected, and no move is lost

### Requirement: Hidden information is not protected online

The game SHALL tell players, in the lobby, that every browser holds the whole game, including hands and deck order. Online play is meant for players who trust each other.

#### Scenario: Lobby notice

- **WHEN** a player opens a lobby
- **THEN** a short notice says that online play does not hide cards from other browsers
