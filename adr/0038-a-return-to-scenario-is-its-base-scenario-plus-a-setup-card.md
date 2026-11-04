# ADR-0038: A Return-to scenario is its base scenario plus a setup card, and a base campaign offers the box's sets as an option

- Status: proposed
- Date: 2026-11-03

## Context and Problem Statement

The five Return-to boxes replay their base campaign's scenarios with a setup card per scenario, a handful of replacement encounter sets (and, for The Forgotten Age, an added one), and new acts, agendas, locations and enemies. The generated Return-to scenarios copy the base's reference card and token tables but model none of the setup cards' rules, and coverage can never count a setup card as working because no scenario plays with it as its reference card (`referenceCardWorks` in `src/content/implemented.ts`). Four campaign changes (Return to the Night of the Zealot, Dunwich, Carcosa, The Forgotten Age) each need the same three pieces; defined in one of them, the others wait for it.

## Considered Options

- One shape, defined once in `scenario-import-fixes`: the scenario file keeps the base card as `card` and lists the box's card in `setupCards`; a setup card works when it prints no token lines; the scenario script is `compose(base, extra)` over the base's typed hooks; the base campaign declares the box's sets as a `CampaignDef.options` entry (`replaceSets`, `addSets`) chosen at creation and fixed after.
- Copy the base scenario's script and tables into each Return scenario, and make "The Dunwich Legacy (replacement sets)" a second campaign entry.
- Make the setup card the scenario's reference card and move the token tables onto it.

## Decision Outcome

Chosen option: "one shape, defined once", because a Return scenario is by the rules its base scenario with extra steps (the program says so in `docs/campaign-program.md`), composing hooks keeps a base fix in one place, the token table stays on the card that prints it (ADR-0013 measures a card by its lines), and an option on the base campaign is a six-line difference that does not deserve a second campaign, flow and tile.

### Consequences

- Good, because any Return-to campaign can land first; none waits on Dunwich.
- Good, because coverage reports a Return-to scenario honestly: tokens real from the base card, the setup card real without lines.
- Bad, because a Return scenario file copies the base's token table (ADR-0013 measures the file), so a base table fix must be repeated; a content check that a Return scenario's table equals its base's keeps them from drifting.
- Bad, because the options live in the campaign state and the save, one more field to migrate if their shape changes.
- Follow-up: each Return-to change declares its pairs on its base campaign's `campaign.json` and composes its scripts; the new-campaign screen shows one toggle per declared option.
