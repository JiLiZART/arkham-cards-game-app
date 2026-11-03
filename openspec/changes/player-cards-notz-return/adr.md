# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 are in force (0027–0036 proposed; no `Supersedes` links in `adr/`).

- ADR-0006 card data from the snapshot, behaviour in `cards.json`: kept; the generated file is untouched, the abilities go in `content/packs/return/cards.json`.
- ADR-0012 and ADR-0013 coverage committed, a card works when every printed line is accounted for: kept; the rtnotz player row moves in `coverage.json` and the program.
- ADR-0014 player windows are engine windows: kept; Mind Wipe (3) reacts in the existing `phaseBegins` window as the core card does.
- ADR-0028 and ADR-0034 scripts through the registry and the explicit API: kept; the two scripts import the core scripts' functions and the API only.
- Others: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced; the two vocabulary entries follow the card-content spec, and the script reuse follows `content/packs/nat/scripts/60129.ts`.
