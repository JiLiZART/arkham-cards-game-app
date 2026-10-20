# ADR Review Manifest

- Status: completed
- Review date: 2026-10-20

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0013 are all in force (no `Supersedes` links in `adr/`).

- ADR-0013 a card works when every printed line is accounted for: kept; the 27 cards count as working once their abilities (or Dynamite Blast's script) are in data; no new line rule is needed because every card gets abilities.
- ADR-0012 completeness measured and committed: kept; `content/coverage.json` and `docs/campaign-program.md` move with the change.
- ADR-0006 card data from the vendored snapshot: kept; the designators and abilities are hand-written overrides in `cards.json`, the generated files untouched.
- ADR-0004 viewing is view state, deciding is game state: kept; windows, bonuses, counters and restricted actions are game state; prompt words are strings by key.
- ADR-0011 campaign flow as a typed step language: unaffected.
- ADR-0001 to 0003, 0005, 0007 to 0010: unaffected.

## New Durable ADRs Created

- `adr/0014-player-windows-are-engine-windows.md`: player windows are engine `Window` steps at the points the grimoire's flow chart marks; what may be used in them is declared on the card. The other engine additions (the `dealDamage`/`excessDamage` windows, the new effect ops, costs and counters) follow the existing "would" window pattern and extend the effect vocabulary the card-content spec defines, so they record no new decision.
