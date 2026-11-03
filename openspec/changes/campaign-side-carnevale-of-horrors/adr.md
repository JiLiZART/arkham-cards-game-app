# ADR Review Manifest

- Status: completed
- Review date: 2026-11-02

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

ADR-0001 to ADR-0036 reviewed; ADR-0019 is superseded in part by ADR-0020; ADR-0027 to 0036 are proposed and honoured here.

- ADR-0007 scenarios generated from the campaign guides: kept; the hand-written campaign replaces the generated one by id, as the ADR allows.
- ADR-0011 campaign flow as a typed step language: kept; the mask choice is a flow step (`investigatorChoice` with codes), the reveler counts flow data.
- ADR-0012 / ADR-0013 completeness measured and a card works when every line is accounted for: kept; one new line rule (the clockwise connection line) and the coverage file move with the change.
- ADR-0028 / ADR-0034 script registry and script API: the scenario script and the card scripts use the registry's hooks and `api.ts` only.
- ADR-0004: the peek's hidden face is view state.
- ADR-0001 to 0003, 0005, 0006, 0008 to 0010, 0014 to 0018, 0020 to 0027, 0029 to 0033, 0035, 0036: unaffected.

## New Durable ADRs Created

- None - no major durable architectural decisions were introduced. The ring, the reveler piles and the mask reaction are one scenario's data and script on top of the engine changes other proposals own.
