# ADR-0011: The campaign flow is a typed step language compiled from the guides and run by one engine interpreter

- Status: accepted
- Date: 2026-10-19

## Context and Problem Statement

What a campaign does between scenarios (interludes, branches on the campaign log, the players' choices, counters, side scenarios, endings) was not represented at all: hand-written and generated campaigns alike were a fixed scenario list with a flat list of resolution effects. ArkhamCards' campaign guides (ADR-0007's source) describe all of it as a step graph in their own schema, with 40 input kinds, 20 condition kinds and 25 effect kinds, many of which exist for that app's own screens (campaign links, dossiers, maps). The engine needs a representation it can validate, persist mid-walk, replay deterministically and show in two languages, that serves the hand-written campaign and the generated ones alike.

## Considered Options

- A step language of our own in the content schema (`story`, `branch`, `input`, `effects`, `playScenario`, `upgradeDecks`, `end`; conditions and effects as discriminated unions), compiled from the guides at import into `flow.json` per campaign and written by hand for Night of the Zealot; one pure interpreter in the engine advancing a serialisable cursor (a stack of step ids and the answers given); a sectioned campaign log as the data the conditions read.
- Ship the guides' JSON and interpret it at run time.
- Code each campaign's flow as TypeScript (functions per interlude and resolution).

## Decision Outcome

Chosen option: "a step language of our own, compiled at import", because the engine's surface stays what the game can offer (the rest degrades to text with the guide's default, listed by the import), `check:content` can validate every reference before a player meets it, the cursor is plain data (persisted and migrated like the rest of the save), the same interpreter runs the hand-written campaign, and the Russian texts attach by step id through the existing i18n import. Interpreting the guides' JSON was rejected for coupling the engine to a third party's schema and shipping 10 MB; TypeScript per campaign was rejected because it can't be generated, validated or translated as data.

### Consequences

- Good, because adding a campaign, hand-written or generated, means producing a flow in one language, and a flow bug is a content error the check reports.
- Good, because campaign play is deterministic and replayable from its answers, like scenario play from its actions.
- Bad, because the compiler must be kept in step with the guides' schema as ArkhamCards evolves, and the unsupported kinds must stay listed.
- Bad, because the save format changes (version 3) and carries a migration for the flat log and the scenario index.
- Follow-up: the mechanics the campaigns add in play (supplies, keys, partners, bless/curse, frost) are the natural next inputs and effects to support; each lifts steps out of the unsupported list.
