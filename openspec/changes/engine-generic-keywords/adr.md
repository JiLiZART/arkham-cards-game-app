# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0006 Card data and card text come from the vendored ArkhamDB JSON snapshot: the importer writes keyword objects into `cards.generated.json`; `cards.json` overrides.
- ADR-0013 A card works when every printed line is accounted for: `implemented.ts` counts an argued keyword line only when its object is on the card.
- ADR-0014 Player windows are engine windows: the Relentless re-attack and Predator attacks open the existing attacked and defeat windows.
- ADR-0015 The Arkham Grimoire is the rules reference: Patrol, Hidden, Exile and Researched follow it; Relentless, Swarming, Bonded, Veiled and Predator follow the cycle inserts quoted in the reports, noted in the design.
- ADR-0026 Closed sets of strings: `STEP.PatrolMoves`, `STEP.PredatorAttacks`, `EVENT.HiddenDrawn`, `EVENT.SwarmDefeated`.
- ADR-0028 Scripts are found through one registry with typed hooks: `patrolTarget` is typed in `ScriptHooks`.
- ADR-0029 Engine tests drive games through a scenario driver: one driver test file per keyword.
- ADR-0033 Deferred engine rules are typed step kinds: the two new enemy-phase steps.
- ADR-0034 The script API is an explicit list of reads and intent verbs: `exile`, `addSwarm`, `grantKeyword`; reads `swarmOf`, `isHidden`, `keywordArg`.
- ADR-0039 Scenario cards are instances with faces, in named decks, with piles beneath: swarm cards are a beneath pile; Veiled is `flip` and `resolveStory`.

## New Durable ADRs Created

- ADR-0040 Keywords with arguments are structured card data the engine resolves (`adr/0040-keywords-with-arguments-are-structured-card-data.md`).
