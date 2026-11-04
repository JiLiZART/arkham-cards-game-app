# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0007 Scenario and campaign definitions are generated from ArkhamCards' campaign guides: a campaign's `chaosBags` and `addChaosToken` steps may now name bless and curse; the compiler's shape is unchanged.
- ADR-0013 A card works when every printed line is accounted for: "Seal (…)" lines count through the `seal` keyword; seal and release abilities through the ops.
- ADR-0014 Player windows are engine windows: `tokenRevealed` is a window.
- ADR-0015 The Arkham Grimoire is the rules reference: Seal follows l.1503; bless and curse follow The Innsmouth Conspiracy's insert as quoted in the inspection report, noted under the design's open question.
- ADR-0021, ADR-0023, ADR-0024 (proposed, in force for the store): `sealed` is a table per instance, `tokenPool` a scenario fact.
- ADR-0026 Closed sets of strings: `CHAOS_TOKENS` gains two members; `EVENT.TokenPoolEmpty`, `EVENT.Sealed`, `EVENT.Released`.
- ADR-0029 Engine tests drive games through a scenario driver: `rigBag` rigs bless and curse draws.
- ADR-0034 The script API is an explicit list of reads and intent verbs: `seal`, `release`, `addTokens`; reads `tokensInBag`, `sealedOn`.
- ADR-0036 The UI reads the engine through one read entry point: the pool and sealed tokens are read through `read.ts`.
- ADR-0040 Keywords with arguments are structured card data: `{ seal: kind }` takes that shape.

## New Durable ADRs Created

- ADR-0042 The chaos bag is three places, and every token kind carries its reveal rule (`adr/0042-the-chaos-bag-is-three-places-and-every-token-kind-carries-its-reveal-rule.md`).
