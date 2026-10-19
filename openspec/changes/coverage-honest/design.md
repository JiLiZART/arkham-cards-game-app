## Context

ADR-0012 made completeness a computed, committed number: `src/content/coverage.ts` over a fully loaded content db, written by `npm run coverage` to `content/coverage.json`, guarded by `check:content`, read by the new-game screen. Whether a card works is `implemented(db, code)` in `src/content/implemented.ts`: abilities or a script, or text whose every line is a `Spawn -` instruction or keywords the engine acts on.

Measured against the content, that rule is wrong both ways:

- **Too strict on data-only behaviour.** Night of the Zealot reports 64 of 69 cards working; the five left are the Ghoul Priest and the Ravenous Ghoul (`prey` set in `content/packs/core/cards.json`) and three Arkham Woods (`investigateSkill` set). The engine reads both fields (`src/engine/rules/enemies.ts`, the investigate action).
- **Blind to token effects.** Scenario reference cards are left out of campaign coverage (campaign-coverage design, decision 3) but counted, as never working, in pack coverage. Nothing checks a scenario's `tokens`: 144 of the 149 generated scenarios carry modifiers with no effects, and Night of the Zealot's three scenarios define Easy and Standard only, so on Hard or Expert `skillTest.ts` finds no entry for a symbol token and applies nothing.
- **A campaign box is one row.** Edge of the Earth's encounter pack (`eoec`) holds ten scenarios and 223 encounter cards; the program says each change is the size of Night of the Zealot's work or smaller.

Two of Night of the Zealot's Hard/Expert token lines can't be written in today's effect language: "search the encounter deck and discard pile for a [[Ghoul]] / [[Monster]] enemy, and draw it" (`discardEncounterUntil` discards what it passes and the lead draws), and "If there are no [[Cultist]] enemies in play, reveal another token" (`revealAnother` is `true` or `"ifAncientOneInPlay"`, and no condition tests for an enemy in play). Placing doom on the nearest enemy is already `placeDoom { on: "nearestEnemy" }`.

In-force ADRs: 0001 to 0012, none superseded. 0012 (measured and committed) and 0007 (generated campaigns; `generated` keeps its meaning) constrain this design; 0011 (the flow) is untouched.

## Goals / Non-Goals

**Goals:** "works" means every printed line is accounted for; reference cards measured by their token lines and counted again; a per-scenario report; Night of the Zealot complete in fact, Hard and Expert included; the program worked one scenario at a time for campaign boxes.

**Non-Goals:** any UI change (the screens already read coverage); writing any generated scenario's tokens; widening investigator coverage to weaknesses and starter decks; judging whether an ability's effects match its line (an ability or script covers the lines it is written for, as before).

## Diagram (C4-inspired, component level, ASCII; the content tooling runs in Node, the browser app reads the file)

```
  content/ (cards.json, scenarios/*.json, scripts/*.ts)
        |
        v  loadContentFromDisk (src/content/node.ts)
  +-------------------------------- src/content ---------------------------------+
  |                                                                              |
  |  implemented.ts                         coverage.ts                          |
  |  +---------------------------+          +--------------------------------+   |
  |  | implemented(db, code)     |<---------| packCoverage                   |   |
  |  |  - player/encounter card: |          | scenarioCoverage  (new)        |   |
  |  |    LINE_RULES: line ->    |          | campaignCoverage  (from        |   |
  |  |    field that runs it     |          |   its scenarios)               |   |
  |  |  - reference card:        |          | investigatorCoverage           |   |
  |  |    TOKEN_LINES: line ->   |          | contentCoverage / coverageJson |   |
  |  |    db.scenarios[s].tokens |          +--------------------------------+   |
  |  +---------------------------+                    |                          |
  +---------------------------------------------------|--------------------------+
        |                                             v
        |                         scripts/coverage.ts --> content/coverage.json
        |                         scripts/check-content.ts (stale? fail)
        v                                             |
  src/engine/rules/skillTest.ts                       v
   token entry: revealAnother {if}       browser: loader reads it eagerly,
   effect op: searchEncounterDraw        wizard.ts / NewGame / CampaignSheet
```

## Decisions

1. **Per-line accounting with a table of line kinds.** `implemented()` splits the text into lines (as now) and strikes each line a rule accounts for; the card works when nothing is left. The table maps a line pattern to the field that must be set: `^Prey - ` → `prey`; `investigated using \[\w+\] instead` → `investigateSkill`; `^Uses \(` → `uses`; `^Max \d+ committed per skill test` → `maxCommitted`; `^Spawn - ` → the spawn the engine reads (as now); keyword-only lines → `keywords` (as now). Abilities or a script still account for the whole card. *Why:* one mechanism, already there for spawn and keywords; a card with data for one line and a Forced ability on another stays not working, which "any behaviour field set" would hide. *Alternative:* any behaviour field set counts: rejected as generous the way abilities already are, without the excuse.

2. **A reference card is measured by its token lines.** The reference card's front holds Easy/Standard, its back Hard/Expert; each line starts with a token (`[skull]`, `[cultist]`, `[tablet]`, `[elder_thing]`). For each side, for each of its two difficulties, a line is covered when `db.scenarios[s].tokens[difficulty][token]` exists and has what the line asks for: a bare modifier → `modifier`; "-X" → `x`; "If you fail" → `onFail`; "reveal another token" → `revealAnother`; any other sentence → `onReveal` or `condition`. The scenario is found from the reference card code (`scenario.card`). A reference card used by no scenario does not work. *Why:* the printed card is the specification of the tokens; this turns the program's real-token-effects step into a number, and catches a missing difficulty.

3. **Reference cards count again.** In campaign coverage (`campaignCoverage` stops filtering `type === "scenario"`) and in scenario coverage. Pack coverage already counts them. *Why:* with decision 2 they have a real meaning; leaving them out was the reason a scenario's tokens went unmeasured.

4. **`scenarios` in the report; a campaign complete from its scenarios.** `scenarioCoverage(db, id)`: `{ campaign, cards: CardCount, tokens, scripted, complete }`, `cards` over the scenario's encounter sets, side decks, acts, agendas and reference card; `tokens` = its reference card works; `complete` = all its cards work and it is scripted. `campaignCoverage` keeps its own deduplicated `cards` and `unscripted`, and `complete` = every scenario complete (the same truth as today's rule, said through scenarios). Keyed by id at the top level of `ContentCoverage`, sorted like the rest. *Why:* the program and a box's per-scenario change point at a scenario directly; Return-to scenarios have ids of their own.

5. **Two token-effect additions, in the effect language.** `searchEncounterDraw { filter: CardFilter }`: search the encounter deck and the encounter discard pile for the first card matching the filter, the investigator resolving the effect draws it (an enemy spawns engaged as a drawn encounter card does), then shuffle the encounter deck; nothing found, nothing happens. Used in `onFail`, which already resolves after the test. `revealAnother` becomes `true | "ifAncientOneInPlay" | { if: Condition }`, with a new condition `enemyInPlay: CardFilter` (and `not` for "no Cultist enemies"); `"ifAncientOneInPlay"` stays for the generated content that uses it. *Why:* the rules as printed, reusable by later cycles that print the same lines. *Alternative:* `discardEncounterUntil` with `leadDraws`: rejected, it discards the cards it passes and the wrong investigator draws.

6. **Night of the Zealot's Hard and Expert tokens, hand-written** from the backs of 01104, 01120 and 01142 into the three scenario files, with an engine test per new behaviour and a test that each hand-written scenario defines all four difficulties.

7. **The program regenerated once, campaign boxes per scenario.** The tables of `docs/campaign-program.md` are rebuilt from the new report; a campaign box (`eoec`, `tskc`, `fhvc`, `tdcc`, `cob`, `fof`, `guardians`: an encounter pack whose scenarios form a whole campaign of more than one scenario) gets one row per scenario under the pack, with its counts; mythos packs stay one row each. Checkboxes carry over. The doc's test also checks that every incomplete scenario of a campaign box has a row.

## Risks / Trade-offs

- [Line patterns miss a phrasing (the Russian text is not used, but English wording varies across cycles)] → patterns are anchored on the forms ArkhamDB prints; an unmatched line simply leaves the card not working, the safe direction; a test lists the patterns against real cards of several cycles.
- [Token line parsing is a heuristic over prose] → only the shape is checked (which field is needed), never the effect's correctness; the bot playthroughs and engine tests remain the real gate, as ADR-0012 says.
- [Every generated campaign's numbers drop (one more non-working card per scenario)] → that is the truth the change is for; the UI only shows the numbers.
- [`revealAnother` gains a third shape] → the old literal stays valid; the schema keeps old content parsing.

## Migration Plan

Archive `campaign-coverage` first (it brings the `content-coverage` spec this change modifies). Then: `implemented()` rules; reference-card token lines; scenario coverage; engine additions; Night of the Zealot's tokens; `npm run coverage`; the program doc. No save change: a save holds no token table. Rollback: revert; the committed report goes back with it.

## Open Questions

None. ADR-0012 stays in force; this change's narrowing of "works" is recorded as ADR-0013, which amends it.
