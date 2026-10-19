# ADR-0013: A card works when every printed line is accounted for; a scenario reference card by its token lines

- Status: accepted
- Date: 2026-10-19
- Amends: ADR-0012 (which stays in force)

## Context and Problem Statement

ADR-0012 measures completeness from the content and commits it, with "works" defined by `implemented()`: abilities or a script, or text made only of spawn instructions and keywords. Measured against the content, that definition misreported both ways. Night of the Zealot showed five cards not working whose behaviour is in data the engine reads (`prey`, `investigateSkill`), so its tile carried the partly-implemented mark for nothing. Nothing measured a scenario's chaos token effects: the generated scenarios hold placeholder modifiers with no effects, and Night of the Zealot had no Hard or Expert tokens, so on those difficulties a symbol token resolved to nothing, and coverage still reported its cards as nearly all working. The program of per-pack changes is judged by this number, so its definition has to be one a pack change can't satisfy without doing the work.

## Considered Options

- Per-line accounting: a card works when every line of its printed text is accounted for, by its abilities or script, or by the field the engine acts on for that kind of line (`Prey -` by `prey`, "investigated using [skill] instead" by `investigateSkill`, `Uses` by `uses`, …). A scenario reference card's lines are its symbol tokens per difficulty, each covered when that difficulty's token entry carries what the line asks for (the modifier, X, an effect on failure, an effect on reveal, reveal another). Reference cards count in pack, campaign and scenario coverage.
- Any behaviour field set counts as working (as any ability does), and reference cards stay out of the measure.
- Keep ADR-0012's definition and rely on each pack change's tests.

## Decision Outcome

Chosen option: "per-line accounting", because it is the mechanism `implemented()` already used for spawn lines and keywords, extended rather than replaced; it keeps a card with data for one line and nothing behind another not working; and it makes the printed reference card the specification of a scenario's tokens, so a missing difficulty or a placeholder token shows as a card that doesn't work. "Any field set" was rejected for hiding exactly the half-done cards a pack change leaves; keeping the old definition for reporting a campaign complete on a difficulty where its tokens do nothing.

### Consequences

- Good, because the program's real-token-effects step has an acceptance test, and a scenario is complete only when its tokens are written for all four difficulties.
- Good, because behaviour expressed in data counts the same as behaviour in abilities, so content authors aren't pushed to scripts to move the number.
- Good, because, with reference cards in the measure, the scenario becomes a unit coverage can report on its own, which lets a campaign box be worked one scenario at a time.
- Bad, because every generated campaign's numbers drop (one more card per scenario that doesn't work yet).
- Bad, because the line patterns and token-line reading are heuristics over English card text: they check which field a line needs, never whether the effect is right; an unrecognised line leaves the card not working (the safe direction). Engine tests and bot playthroughs remain the real gate.
- Follow-up: a new kind of data-driven line (a field the engine starts acting on) adds its pattern to the table in the same change.
