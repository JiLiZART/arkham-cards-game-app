# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 are in force (0027–0036 proposed; no `Supersedes` links in `adr/`).

- ADR-0006 card data from the vendored snapshot: kept; `vengeance` is one more snapshot field mapped by `import-cards.ts`, never hand-edited.
- ADR-0007 scenarios generated from the guides: kept and corrected; the importer still writes every official campaign, now with partial sets, per-scenario bags, agenda-only decks and random starts instead of skipping; hand-written campaigns stay untouched.
- ADR-0011 campaign flow as a typed step language: extended; `before[<scenario>]` is one more place steps live, run by the same interpreter, checked by the same content check.
- ADR-0012 and ADR-0013 completeness measured and committed, a card works by its lines: kept; a removed card is not used by the scenario, and a setup card with no token lines is accounted for in full.
- ADR-0021 to ADR-0024 engine store: unaffected; `setAside` and `remove` move cards through `moveCard` as before.
- ADR-0025 and ADR-0026 engine layout and closed sets: kept; `blood` joins the constant token set; `compose` sits in `api.ts`.
- ADR-0027, ADR-0028, ADR-0034 script run, registry and API: kept; `compose` returns a plain `ScriptHooks` the registry reads, through the explicit API.
- Others: unaffected.

## New Durable ADRs Created

- `adr/0038-a-return-to-scenario-is-its-base-scenario-plus-a-setup-card.md`: a Return-to scenario keeps its base reference card and lists the box's card in `setupCards`, composes its script over the base's hooks, and a base campaign offers the box's sets as an option chosen at creation (`replaceSets`, `addSets`). The importer fixes themselves correct ADR-0007's implementation and record no new decision.
