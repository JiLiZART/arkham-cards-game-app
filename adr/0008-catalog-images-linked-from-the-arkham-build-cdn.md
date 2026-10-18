# ADR-0008: Card images the game doesn't host are linked from arkham.build's CDN in HTML views

- Status: accepted
- Date: 2026-10-18

## Context and Problem Statement

The game hosts 229 English scans (the cards its scenarios use, downloaded at deploy time) and 3,833 Russian card sides. A catalog of every card needs images for about 5,600 more. The WebGL table can only use same-origin images because arkham.build's CDN sends no CORS headers; plain HTML `<img>` elements have no such limit.

## Considered Options

- Link the CDN from HTML views for cards the game doesn't host.
- Commit every English scan at half size (about 300 MB).
- Download every scan into the build at deploy time (about 300 MB per deploy).

## Decision Outcome

Chosen option: "link the CDN", because the repository and the deploy stay small, the catalog is a reading view where a missing image degrades to the card drawn from data, and the table keeps its same-origin scans.

### Consequences

- Good, because nothing large is added to the repository or the deploy.
- Bad, because the catalog's images depend on arkham.build being online and allowing hotlinks.
- Follow-up: if the CDN becomes unreliable, switch to the deploy-time download (the existing `fetch:cards` script) for all cards.
