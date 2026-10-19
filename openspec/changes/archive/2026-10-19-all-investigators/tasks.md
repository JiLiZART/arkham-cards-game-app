## 1. Import

- [x] 1.1 `scripts/import-investigators.ts` with tests: requirements string parsing (size, signatures with alternatives, random weakness), the option grammar, regular investigators only, hand-written files win.
- [x] 1.2 Starter decks from ArkhamCards' `starterDecks.ts` with tests (the 01000 placeholder, deck size).
- [x] 1.3 Schema and loader: the wider `InvestigatorDef`, both folders; run the import; `check:content` passes.

## 2. Picker and loading

- [x] 2.1 The investigator step: every investigator, class and cycle filters, search, partly-implemented note, needs-a-deck state.
- [x] 2.2 Prepare loads the investigators' and decks' packs; test with Zoey.

## 3. Verification

- [x] 3.1 Tests, lint, build, content check; start a campaign with Zoey in Russian and play a round; drive-calm to round 3.
- [x] 3.2 README; `openspec validate all-investigators --type change --strict`.
