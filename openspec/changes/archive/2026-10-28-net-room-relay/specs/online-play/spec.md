## MODIFIED Requirements

### Requirement: Peer connections with public STUN and relayed TURN

Browsers in a room SHALL connect to each other directly with WebRTC, every pair with its own connection. The signaling service SHALL relay connection setup between browsers in the same room. A browser SHALL try public STUN servers first, then TURN relays when the signaling service has credentials for them: short-lived ones from a Cloudflare TURN key, or static ones set as secrets for any other TURN provider. The service SHALL refuse TURN credentials for rooms it does not know.

Whenever no direct connection to a player is open, a browser SHALL send its messages for that player through the signaling service instead: the service forwards each message to the addressed player in the same room, stamped with the sender's id, and SHALL NOT read, store or change it. Messages SHALL use the direct connection again as soon as it opens. A browser that joins or comes back SHALL ask the host for the moves it misses as soon as the room shows the host has more, without waiting for a direct connection.

A connection indicator in the top bar SHALL show each player's state: connected, connected via server, reconnecting or away.

#### Scenario: Behind a strict mobile network

- **GIVEN** Ben is on a mobile network where direct connections fail and the room has no TURN relay
- **WHEN** he joins and plays
- **THEN** his moves and the host's go through the signaling service, both tables stay the same, and the room menu shows Ben "connected via server"

#### Scenario: The direct connection opens later

- **GIVEN** Ben's moves go through the signaling service
- **WHEN** a direct connection to the host opens
- **THEN** the following moves use it, and the room menu shows Ben "connected"

#### Scenario: Catching up without a direct connection

- **GIVEN** a game with 40 moves and no direct connection between Ben and the host
- **WHEN** Ben reloads his page
- **THEN** he receives the 40 moves through the signaling service and his table matches the host's

#### Scenario: A TURN provider set by secrets

- **WHEN** the room service has `TURN_URLS`, `TURN_USERNAME` and `TURN_CREDENTIAL` set
- **THEN** browsers of a known room receive those servers after the public STUN servers

#### Scenario: Player drops

- **WHEN** Ben's network drops for ten seconds
- **THEN** the indicator shows Ben reconnecting, then connected, and no move is lost
