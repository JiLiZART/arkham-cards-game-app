## Context

A campaign today is `CampaignDef` (a scenario id list, chaos bags, log labels) plus `CampaignState` (`scenarioIndex`, a flat `log: Record<string, unknown>`, investigators, history). `applyScenarioEnd` applies the resolution's `CampaignEffect[]` (record, xp, trauma, earnCard, addChaosToken, end…) and bumps the index; `CampaignLog.tsx` shows the log and "Next: <scenario>". The import (`scripts/campaignGuide.ts` `resolutionEffects`) walks only the resolution's listed step ids, so everything inside a `branch` or an `input` is lost; interludes aren't in `campaign.scenarios` at all.

ArkhamCards' guides are a step graph per campaign and per scenario: `setup: string[]` names the entry steps, each step is `story | branch | input | effects | encounter_sets | location_setup | rule_reminder | resolution`, a branch's `condition` has `options` with `steps`, an `input` has `choices` with `effects` and `steps`, `$play_scenario` / `$upgrade_decks` / `$check_tarot_reading` are built-in steps. Measured across the 22 official campaigns: 756 resolutions, 770 branches and 1,100 inputs under them (counter 578, choose_one 326, investigator_choice 86, card_choice 46, upgrade_decks 25, checklist 24, send/receive campaign link 59, partner trauma 16, supplies 2), 107 interludes and epilogues, 33 side scenarios with an XP cost; `campaign_data` effects: result 112, skip_scenario 78, next_scenario 39, replay 6. Log sections: text 79, count 11, relationship 8, header 5, investigator_count 2, supplies 2, partner, checklist, glyphs, scarlet keys 1 each. The Russian guide (`all_campaigns_ru.txt`) has the same step ids with translated texts.

In-force ADRs: 0001–0010, none superseded. ADR-0004 (viewing is view state, deciding is game state), ADR-0006 (card data from the snapshot), ADR-0007 (campaigns generated from the guides, hand-written takes precedence) and ADR-0008 (card images from the CDN by code) constrain this design directly.

Sources the user pointed at: `inspired/Arkham_Horror_LCG/` holds the Russian print-and-play PDFs (one per pack, the rulebook, the rules reference) and `hallofarkham.com`'s card database is a WordPress page with no JSON endpoint. Neither is machine-readable for flow; both verify it.

## Goals / Non-Goals

**Goals:** every official campaign plays its guide between scenarios (interludes, branches, choices, counters, side scenarios, endings) from data; one interpreter for hand-written and generated campaigns; the log kept and shown as the guide prints it; a picker with filters and a chapter sidebar; old saves keep working.

**Non-Goals:** in-play mechanics the campaigns add (supplies, vengeance, keys, exploration, bless/curse, frost); card behaviour; linked campaigns (The Dream-Eaters A/B exchanging messages); partners (Edge of the Earth) and tarot beyond showing their text; undo of a campaign answer; a flow editor.

## Architecture

Lightweight C4-inspired container view (an assumption carried from the previous change: plain Mermaid, one level).

```mermaid
flowchart LR
  player[Player]
  subgraph import [Import time]
    guides[(ArkhamCards guides<br/>en + ru JSON)]
    pdfs[(Russian PDFs,<br/>Hall of Arkham: verification)]
    importer[import-campaigns.ts<br/>compileFlow]
    flow[(content/campaigns-generated/id/flow.json<br/>campaign.json cards + sections)]
    hand[(content/campaigns/night-of-the-zealot/flow.json<br/>hand-written)]
    check[check:content<br/>checkFlow]
  end
  subgraph app [The game]
    picker[NewGame CampaignStep<br/>filters, tiles, CampaignSheet]
    screen[CampaignScreen<br/>guide reader + log + upgrades]
    store[store.ts<br/>CampaignState: cursor, answers]
    interp[engine/flow.ts<br/>advance(state, answer) → shown]
    campaign[engine/campaign.ts<br/>applyScenarioEnd → flow]
    engine[game engine<br/>scenario play]
    cdn[(card images by code<br/>ADR-0008)]
  end
  guides --> importer --> flow
  pdfs -. verify .-> importer
  flow --> check
  hand --> check
  player --> picker
  picker -->|scenario card codes| cdn
  player -->|answers| screen --> store --> interp
  interp -->|playScenario| engine
  engine -->|resolution| campaign --> interp
  flow --> interp
  hand --> interp
```

- The interpreter is pure (`(db, state, answer) → state`): no store, no React, so it is tested like the game engine and replayable.
- The picker reads only `campaign.json` (eager): scenario card codes and names come with it, images from the CDN; the flow and the scenarios load lazily on pick, as today.
- The campaign screen is the one place prompts are answered; answers go through the store, which persists the campaign state after each.

## Decisions

1. **A typed step language of our own, compiled at import, not the guide's JSON interpreted at run time.** `CampaignStep = story | branch | input | effects | playScenario | upgradeDecks | end`, keyed by id in `flow.steps`, with `flow.setup: string[]` and per-resolution `steps: string[]`; conditions and effects as discriminated unions in `schema.ts`. *Why:* the guide has 40 input kinds, 20 condition kinds and 25 effect kinds, many for ArkhamCards' UI (campaign links, dossiers, maps); compiling keeps the engine's surface to what the game offers, lets `check:content` validate every reference, and keeps the hand-written campaign in the same language. *Alternative:* ship `all_campaigns.txt` and interpret it: 10 MB of JSON, two text languages inline, and the engine coupled to a third party's schema. Rejected.

2. **The cursor is a stack of step ids plus the answer log.** `CampaignState.flow = { stack: string[]; waiting: { step: string } | null; answers: { step: string; value: unknown }[]; data: Record<string, unknown> }`. `advance` pops the next id, runs it: a `story` is shown and waits for "Continue"; a `branch` evaluates its condition and pushes the outcome's steps; an `input` waits for its answer, then applies the chosen option's effects and pushes its steps; `playScenario` stops with `{ play: scenarioId }` and the store starts the scenario; when the scenario ends, `applyScenarioEnd` applies the engine-level outcome (trauma from play, victory XP, killed/insane) and pushes the matching resolution's steps. `scenarioIndex` goes; `currentScenarioId` reads the cursor. *Why a stack:* the guide's steps are a tree walked depth-first; a stack is the whole state of that walk, serialisable. *Alternative:* a recursive walk with closures: not persistable mid-walk.

3. **The log is sections with typed contents; the flat view is derived.** `CampaignState.log = { [section]: { entries: { id, crossedOut? }[]; counts: Record<id, number>; cards: Record<id, string[]>; perInvestigator: Record<inv, Record<id, number>> } }`, sections declared in `campaign.json` (`logSections: { id, kind, label }[]`, the notes section `campaign_notes` always present). `logHas`/`logCount` conditions default to the notes section, so Night of the Zealot's setup conditions and scripts keep their keys (`houseBurned` becomes an entry id in notes) via a `flatLog(state)` view handed to `GameSetup.campaignLog` as today. *Alternative:* keep the flat record and encode sections in keys (`doubt:count`): the log screen couldn't tell a count from an entry, and crossed-out entries have no representation.

4. **Unsupported inputs degrade to text with the guide's default.** The compiler maps what the game can offer (`chooseOne`, `counter`, `investigatorChoice`, `cardChoice`, `checklist`, `upgradeDecks`, `playScenario`, side-scenario choice) and turns the rest (send/receive campaign link, partner choices and trauma, supplies, text box, scarlet keys, tarot) into an `input` with `unsupported: <kind>`, its text, and one option that applies the guide's default (`default_choice`, or the first choice, or nothing). The campaign screen shows the text and a "Continue (not supported yet)" button; the import prints the list. *Why:* the flow must run end to end through every campaign now; the kinds left are 5% of inputs and belong to the non-goal mechanics. *Alternative:* skip them silently: the player wouldn't know a decision was made for them.

5. **Counters and investigator choices are answered on the campaign screen, with the guide's limits.** A `counter` shows the guide's text with − / + and its `max`, and applies its effects with the number (`$input_value`); an `investigatorChoice` shows the campaign's active investigators as avatars (one, or all with "none" when optional); a `cardChoice` shows the cards matching the guide's query from the investigators' decks (deck removals, the "which weakness" choices); a `checklist` shows checkboxes with min/max. Variables in effect `investigator: "$input_value"` / `"lead_investigator"` / `"all"` / `"choice"` resolve against the answer.

6. **`applyScenarioEnd` keeps the engine's part and hands the rest to the flow.** It still sums trauma and in-play XP flags, computes the victory total and marks killed/insane; the resolution's `effects` (hand-written) or `steps` (generated) run through the interpreter, where `xp` effects take the victory total from `flow.data.victory`. The old `Resolution.effects` stays valid: a hand-written resolution without `steps` compiles at load time into one `effects` step named `res:<scenario>:<id>` so the interpreter sees one shape.

7. **The picker is one screen with view state only (ADR-0004).** `CampaignStep` holds `filter` (kind, rules, length, query) and `focus` in component state; the pick itself stays in `WizardState.campaignId`. `campaignOrder` gains `filterCampaigns(db, locale, filter)` in `wizard.ts` (pure, tested). `CampaignSheet` reuses the deck viewer's `dv-*` layout: numbered rows with front and back `CardFace` by code (the back of a reference card is the second side in the snapshot), interludes as plain rows. `CampaignDef` gains `cards: { scenario, code, interlude?: true }[]` written by the import (hand-written: derived from the eager scenarios at load), so the sheet fills before `loadCampaign` resolves. *Alternative:* load the scenarios on focus: a spinner on every tap, against the first requirement.

8. **The campaign screen grows a guide reader above the log.** `CampaignScreen` (renamed from `CampaignLog.tsx`) shows, in order: the steps already read in this stretch of flow (story titles and texts, bullets with the recorded entries), the waiting prompt, then the investigators with their experience and trauma and Upgrade buttons when the flow is at `upgradeDecks`, the log sections, and "Next: <scenario>" (or "Side scenarios…") when the flow is at `playScenario`. The deck builder route is unchanged.

9. **Russian texts come through the i18n import.** `scripts/import-i18n.ts` already writes `campaign-texts/<id>.json` per locale; it gains `steps: Record<stepId, { title?, text?, bullets?, choices? }>` from `all_campaigns_ru.txt` matched by step id, and the reader resolves texts through `i18n.ts` like resolutions today. The Russian PDFs are consulted when a translated step is missing or reads oddly; Hall of Arkham when a card the guide names isn't found by name in the snapshot (the import lists those by campaign).

10. **Save migration at load.** `Save.version` 2 → 3: a campaign with `scenarioIndex` gets `flow` with the stack at the `playScenario` step of `scenarios[scenarioIndex]` (or `end` past the last), `log` wrapped into the notes section (string and array values become entries and card lists), `history` kept. `ENGINE_VERSION` moves to 3; games in progress carry on (their `campaignLog` snapshot is the flat view).

## Risks / Trade-offs

- [The guide's conditions reference data the compiler doesn't carry (`campaign_data` with `investigator_data`, `math`, partner status)] → the compiler emits `unsupported` branches that take the guide's `default_option` (or the first option) and lists them; the census test fixes the number so a regression shows.
- [Step texts contain markup (`<b>`, `<i>`, `[guardian]` icons)] → the reader renders them with the existing `formatText` (icons and emphasis) used for cards; the import keeps the markup.
- [Hand-written Night of the Zealot's scripts read `campaignLog` keys] → `flatLog` keeps the exact keys; `campaign.test.ts` and `scenarios.test.ts` guard them.
- [A flow that never reaches `playScenario` or `end` (a compiler bug) would strand a campaign] → `check:content` walks every flow from `setup` and fails when a path ends without `end`; the interpreter also refuses an empty stack with a visible error and the "Abandon campaign" route stays.
- [The campaign screen becomes long for campaigns with several story steps in a row] → steps already read collapse to their titles after the next prompt; the guide's `border` and `rule_reminder` steps are skipped.
- [Old saves] → migration tested on a fixture of each save version; a migration failure shows the error and offers Abandon rather than a blank screen.
- [Picker performance with 36 campaigns × up to 12 cards] → images are lazy (`loading="lazy"`), only the focused campaign's sheet renders.

## Migration Plan

Additive content: `flow.json` per campaign, `cards` and `logSections` in `campaign.json`, written by one import run and committed (text only, about 2 MB across all campaigns, lazily loaded). Code: schema, engine, store migration, UI. Saves migrate on load (decision 10). Rollback: revert the commits; a save written at version 3 would not load in the previous build (the Abandon route applies).

## Open Questions

None needing a user's answer. ADR-0007 stays in force (generation from the guides with hand-written precedence); this design adds a durable commitment beyond it, the step language as the contract between content and engine, recorded as a new ADR rather than a change to 0007.
