# ADR-0019: Signaling is a rule-free Cloudflare Worker with a Durable Object per room

- Status: accepted
- Date: 2026-10-28

## Context and Problem Statement

WebRTC peers need a meeting point to exchange offers, answers and ICE candidates, and about one pair in ten needs a TURN relay to connect at all. Free public TURN servers with static credentials have small quotas. The site is on GitHub Pages, and its domain, arkham.artkost.dev, is on Cloudflare DNS. The lobby and the list of who holds which seat must survive the host reloading or leaving (ADR-0018). Where does signaling run, and who mints TURN credentials?

## Considered Options

- A Cloudflare Worker on `arkham.artkost.dev/net/*`, with one Durable Object per room. It relays signaling, keeps the room's roster, seats, lobby and host, and mints short-lived Cloudflare TURN credentials from a secret.
- Trystero, using public Nostr relays or BitTorrent trackers for signaling, with static free TURN credentials.
- The public PeerJS broker.
- Exchanging offers and answers by hand, as links.

## Decision Outcome

Chosen option: "a Cloudflare Worker with a Durable Object per room", because it is the only option that gives reliable TURN without putting a secret in the browser. It also holds the roster where a reload cannot lose it, and it adds no runtime dependency to the game. Running on the site's own origin needs no CORS setup and no configured address. Trystero and PeerJS depend on public infrastructure nobody here controls, and give no TURN. Links by hand make every rejoin a chore.

The Worker knows nothing about game rules and never receives moves. It holds only room metadata: versions, hashed player keys, seats, the lobby and the host.

### Consequences

- Good, because the free tier covers a hobby project. Rooms with no open socket cost nothing.
- Good, because if hosting later moves to Cloudflare, the same Worker can serve the site.
- Bad, because the project now depends on a Cloudflare account, and the deploy needs secrets: an API token, the account id and a TURN key.
- Bad, because the domain's DNS record must stay proxied by Cloudflare for the `/net/*` route to work.
- Bad, because `wrangler` becomes a devDependency, and the repository holds a second deployable beside the site.
