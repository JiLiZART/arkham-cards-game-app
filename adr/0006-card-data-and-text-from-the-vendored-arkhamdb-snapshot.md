# ADR-0006: Card data and card text come from the vendored ArkhamDB JSON snapshot

- Status: accepted
- Date: 2026-10-17

## Context and Problem Statement

Card data came from ArkhamDB's API one pack at a time, and card translations from ArkhamCards' assets. Covering every cycle (114 packs, 6,047 cards, a dozen locales) by API would mean many requests, rate limits and results that change under us. A local copy of ArkhamDB's data repository (`inspired/arkhamdb-json-data`) holds the same records and every locale's text.

## Considered Options

- Import card data and card text from the vendored snapshot; record its commit; keep the API path for one-off refreshes; campaign text stays with ArkhamCards.
- Fetch everything from the API at import time.
- Keep ArkhamCards as the text source and the API as the data source, pack by pack.

## Decision Outcome

Chosen option: "the vendored snapshot", because imports become reproducible (same input, same output), run offline, cover every cycle and locale in one command, and the snapshot is the upstream of the API anyway.

### Consequences

- Good, because adding a locale is one command; adding a cycle is one command.
- Good, because `check:content` can validate the whole catalogue in CI without network.
- Bad, because the snapshot must be refreshed by hand (`git pull` in `inspired/`) and its commit noted.
- Bad, because campaign text (intros, resolutions) still comes from a second source, ArkhamCards.
