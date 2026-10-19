## 0. Before

- [x] 0.1 Archive `campaign-coverage` (complete; it brings the `content-coverage` spec this change's deltas modify), syncing its specs.

## 1. What "works" means

- [x] 1.1 `implemented()`: a table of line kinds to the field that runs them (`Prey -` → `prey`, "investigated using [x] instead" → `investigateSkill`, `Uses (` → `uses`, "Max n committed per skill test" → `maxCommitted`, with spawn and keyword lines as now); a card works when no line is left; tests: the Ghoul Priest, the Ravenous Ghoul and the three Arkham Woods work, a card with `prey` and an uncovered Forced line doesn't, and the patterns matched against real cards of several cycles.
- [x] 1.2 Reference cards: each token line of the front (Easy, Standard) and back (Hard, Expert) covered by its scenario's token entry for that difficulty (modifier, `x`, `onFail`, `onReveal` or `condition`, `revealAnother`); a reference card no scenario uses doesn't work; tests: a placeholder-only generated scenario doesn't work, a scenario with Easy and Standard only doesn't work, a fixture with all four difficulties written works.

## 2. Per-scenario coverage

- [x] 2.1 `scenarioCoverage(db, id)` (campaign, cards with the reference card, `tokens`, `scripted`, `complete`); `campaignCoverage` counts reference cards and is complete when all its scenarios are; schema `ContentCoverage.scenarios`; tests: a shared set counts in each scenario and once in the campaign, Extracurricular Activity is not complete with tokens not real.

## 3. Token effects the engine lacks

- [x] 3.1 Effect op `searchEncounterDraw { filter }`: search the encounter deck and discard pile, the resolving investigator draws the first match, shuffle the encounter deck; nothing found does nothing; schema, validation, engine, tests (found in the discard pile, found in the deck, none).
- [x] 3.2 `revealAnother: { if: Condition }` and condition `enemyInPlay: CardFilter`; `"ifAncientOneInPlay"` still valid; tests (no Cultist in play reveals another, a Cultist in play doesn't).

## 4. Night of the Zealot's Hard and Expert tokens

- [x] 4.1 Hard and Expert token effects for The Gathering, The Midnight Masks and The Devourer Below from the backs of 01104, 01120 and 01142; engine tests for the spec's scenarios (The Gathering skull on Hard draws a Ghoul from the discard pile; The Midnight Masks cultist on Expert with no Cultist reveals another); a test that each hand-written scenario defines all four difficulties.
- [x] 4.2 `npm run coverage`: Night of the Zealot, its scenarios and its reference cards complete; the picker's Complete filter shows it (wizard tests updated to the new numbers).

## 5. The program

- [ ] 5.1 `docs/campaign-program.md` tables rebuilt from the new report, checkboxes carried over; the campaign boxes (`eoec`, `tskc`, `fhvc`, `tdcc`, `cob`, `fof`, `guardians`) one row per scenario under their pack; a sentence that a campaign box is worked one scenario at a time; the doc's test also checks every incomplete scenario of a campaign box has a row.
- [ ] 5.2 README coverage paragraph: what "works" means (every printed line accounted for, reference cards by their token lines), the `scenarios` report, a link to ADR-0013.

## 6. Verification

- [ ] 6.1 Browser: Night of the Zealot's tile has no partly-implemented mark and is in the Complete filter, Dunwich's sidebar numbers follow the new report, in English and Russian; 0 console errors.
- [ ] 6.2 `npm test`, lint, typecheck, build, `check:content` by exit code; `openspec validate coverage-honest --type change --strict`.
