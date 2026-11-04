## 1. The compiler

- [x] 1.1 Failing tests first in `scripts/campaignFlow.test.ts` with small `Raw` fixtures: a `resolution` step expands the named resolution's steps in place and a hidden resolution is not a key of `flow.resolutions`; a `no_resolution_defeated`/`no_resolution_resigned` pair becomes `none` with one `chooseOne`; a `$id` step is found in `shared` and then in the owner's steps; `$upgrade_decks` still special; `campaign_data version` inside a `multi` with count 1 compiles to `any` with a true part and the branch takes `then`.
- [x] 1.2 `scripts/campaignFlow.ts`: `FlowSource.shared`; `compileStep` cases for `$` ids and `"resolution"`; `test()` for `version`; `compile()` filters hidden resolutions; the `none` pair.
- [x] 1.3 Failing test: a campaign whose setup reaches a `set_scenarios` effect (through an always-true version branch and a `choose_one` whose choices all carry one) has `flow.order` equal to the first list mapped to file ids with the interludes in place, and no `chooseOne` step for the question; a campaign without one keeps today's order.
- [x] 1.4 `compile()`: the setup's default-path walk for `set_scenarios`; the `effect` case returns `[]` for it; `input` drops a `choose_one` whose choices differ only by `set_scenarios`.
- [x] 1.5 Failing test: an interlude neither in the order nor named by a step is dropped with its steps; one named by `nextScenario` is kept; `checkFlow` reports a dead interlude in a hand-written flow. Implement the pruning in `compile()` and the check in `src/content/flowChecks.ts`.
- [x] 1.6 `scripts/import-campaigns.ts`: build `shared` from the guide's `core` scenario; pass each group its own scenarios plus the guide's interludes and epilogues; write the scenario file's `resolutions` without hidden ones; test in `scripts/import-campaigns.test.ts`.

## 2. Regenerate and verify the flows

- [x] 2.1 `pnpm import:campaigns`, `pnpm import:i18n --locale ru`; assert on the output in a test over the generated flows: `the-path-to-carcosa` and `return-to-the-path-to-carcosa` orders as the spec lists; `the-house-always-wins.none` holds R1's steps; `written-in-rock` R1–R5 end with R6's steps and the scenario file has no R6; `the-feast-of-hemlock-vale` has `addCount day` and `nextScenario the-first-evening` reachable from Written in Rock's resolutions; `the-dream-quest` and `the-web-of-dreams` reach `upgradeDecks` after Dark Side of the Moon and Point of No Return; no side flow but `fortune-and-folly` holds `fortune-and-folly-checkpoint`; no step text begins with a rules heading.
- [x] 2.2 Engine test through `src/engine/kits/driver.ts` and the campaign runner: a Hemlock Vale campaign completing Written in Rock with R1 on Day 1 has day count 2, Night 1 recorded, and The First Evening next; a Carcosa campaign starting shows the prologue and plays Curtain Call first; The House Always Wins ending with no resolution records a bone to pick.
- [x] 2.3 The import's unsupported summary per campaign recorded in the change (counts before and after) so the campaign changes know what remains.

## 3. The program document

- [x] 3.1 Rewrite `docs/campaign-program.md`: head (ADR-0012, how a change is done), the table of the 65 changes in landing order with status and what each completes (design decision 6), then the pack and per-scenario coverage tables from `content/coverage.json` with each pack's change named; `scripts/program.test.ts` asserts every `campaign-*`, `player-cards-*` and listed engine change under `openspec/changes/` (or its archive) appears once.

## 4. Verification

- [x] 4.1 `pnpm coverage`, `pnpm check:content`, `pnpm test`, `pnpm typecheck`, `pnpm lint:fix`, `pnpm format:fix`; `openspec validate campaign-flow-compiler-fixes --type change --strict`.
