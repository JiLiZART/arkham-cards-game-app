# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 are in force (0027–0036 proposed; no `Supersedes` links in `adr/`).

- ADR-0007 scenario and campaign definitions generated from the guides: kept; the campaign takes the hand-written path the ADR keeps open, and the importer skips it as it skips Night of the Zealot.
- ADR-0011 campaign flow as a typed step language: kept; the hand-fixed `flow.json` uses the same step kinds, and the table's facts reach it through the existing campaign notes.
- ADR-0012 completeness measured and committed, ADR-0013 a card works when every printed line is accounted for: kept; `tokensReal` becomes stricter for conditional lines, within the ADR's rule that a reference card works by its token lines.
- ADR-0015 rules questions against the grimoire: followed for the token and movement rules.
- ADR-0025 engine layers, ADR-0026 closed sets as constants: the new ops, flags and `x` values join the existing constant objects and layers.
- ADR-0028 scripts through one registry with typed hooks, ADR-0034 explicit script API: the scenario scripts use the registry's typed hooks and add none by string.
- ADR-0001 to 0006, 0008 to 0010, 0014, 0016 to 0024, 0027, 0029 to 0033, 0035, 0036: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. Moving a campaign to the hand-written folder, adding vocabulary per pack and handing facts to the flow through campaign notes follow ADR-0007, ADR-0013 and ADR-0011.
