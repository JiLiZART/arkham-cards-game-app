## ADDED Requirements

### Requirement: Signaling service deployed with the site

The deploy SHALL also publish the signaling service that online play uses: a Cloudflare Worker with one Durable Object per room, answering on the site's own origin under `/net/` (room sockets, TURN credentials, and a health check). The deploy SHALL pass it the TURN key from repository secrets, never from the source. A deploy whose signaling service fails to publish SHALL NOT fail the site's publish, and the site then hides online play.

#### Scenario: Health check after a deploy

- **WHEN** a deploy finishes
- **THEN** `https://arkham.artkost.dev/net/health` answers with the deployed build version

#### Scenario: Signaling publish fails

- **WHEN** the Worker deploy fails and the site build passes
- **THEN** the site still publishes, its title screen has no online entry, and the deploy log shows the Worker error
