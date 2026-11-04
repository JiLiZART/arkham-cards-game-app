# ADR Review Manifest

- Status: completed
- Review date: 2026-11-03

## Review Summary

ADR review completed for this change.

## In-Force ADRs Reviewed

- ADR-0007 Scenario and campaign definitions are generated from ArkhamCards' campaign guides: the new `ScenarioDef` fields (named decks, versions, random ops, checkpoint) are what the importer and the campaign changes write; no supersession.
- ADR-0011 The campaign flow is a typed step language: a checkpoint resolution hands the flow log notes; the flow does not change.
- ADR-0013 A card works when every printed line is accounted for: `implemented.ts` counts spawn expressions, story lines and reveal triggers.
- ADR-0014 Player windows are engine windows: `afterReveal` and `wouldBeDefeated` are windows, not hooks on cards.
- ADR-0015 The Arkham Grimoire is the rules reference: story cards (l.358), Removed from Game (l.1420), the void as an out-of-play area the cards define.
- ADR-0021, ADR-0023, ADR-0024 (proposed, in force for the store): new piles and tables live in the store, each fact in its own table.
- ADR-0026 Closed sets of strings: new zones, pile names and step kinds are added to `ZONE`, `PILE` and `STEP`.
- ADR-0028 Scripts are found through one registry with typed hooks: `locationLeavesPlay`, `wouldBeDefeated`, `storyResolved` are typed in `ScriptHooks`.
- ADR-0029 Engine tests drive games through a scenario driver: every test in this change uses `kits/driver.ts`.
- ADR-0033 Deferred engine rules are typed step kinds: `Flip`, `ResolveStory`, `RemoveLocation`, `ReadInterlude`, `EnterVehicle`, `LeaveVehicle`.
- ADR-0034 The script API is an explicit list of reads and intent verbs: each new step a script needs gets a verb in `api.ts`.
- ADR-0035 Surfaces that draw card placement read one presented table: the void shelf and beneath counts are read there.
- ADR-0038 A Return-to scenario is its base scenario plus a setup card: the random ops are what its setup cards use.

## New Durable ADRs Created

- ADR-0039 Scenario cards are instances with faces, in named decks, with piles beneath (`adr/0039-scenario-cards-are-instances-with-faces-named-decks-and-piles-beneath.md`).
