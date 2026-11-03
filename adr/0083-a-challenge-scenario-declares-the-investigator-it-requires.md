# ADR-0083: A challenge scenario declares the investigator it requires

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

Eight side scenarios are challenge scenarios: each is printed for one investigator (Read or Die for Daisy Walker, All or Nothing for "Skids" O'Toole, Bad Blood for Agnes Baker, By the Book for Roland Banks, Red Tide Rising for Wendy Adams, Laid to Rest for Jim Culver, Relics of the Past for Monterey Jack, Enthralling Encore for Lola Hayes). Their cards name the investigator (Namer of the Dead preys on Daisy; Wendy's elimination resigns everyone; Jim's spirit deck), their resolutions swap that investigator's signature cards for the Advanced or parallel versions, and their experience is computed for that investigator and the others separately. Today a campaign has no way to say who must play: the new-game screen offers every investigator, and the generated flows apply the swap to `each` investigator. How does a campaign name its required investigator, and where is it enforced?

## Considered Options

- `CampaignDef.requiredInvestigators: string[][]` (one list per required seat; each list the codes that satisfy it, e.g. `[["01002", "90001"]]` for core or parallel Daisy); the new-game screen refuses Begin until one seat holds a listed investigator; the flow effects `earnCard`/`removeCard` take `who: "required"` resolved to that seat; the engine exposes the required seat to scripts (`requiredInvestigator(game)`) so prey, resign and XP rules read it instead of a code.
- Enforce nothing: the scenario's script auto-fails setup without the investigator.
- Hard-code the investigator in each scenario's script and in the flow by code.

## Decision Outcome

Chosen option: "a declared requirement on the campaign", because it is one field the screen, the flow and the scripts read; because the parallel fronts (90001, 90037, 90049, 90062) are the same seat as the core card and must satisfy it; and because the flow's `who: "each"` bug is fixed once, by a `who` the compiler emits from the guide's `investigator_choice` with a fixed investigator. Script-only enforcement was rejected for failing after the deck was built; hard-coding for duplicating the rule in three places per scenario.

### Consequences

- Good, because every challenge change reuses one screen rule, one flow target and one script read.
- Good, because a host campaign offering the challenge as a side story (`sideScenario` step) can skip it when the seat is not filled.
- Bad, because the new-game screen gains a constraint it shows only for these eight campaigns, in both locales.
- Follow-up: `campaign-side-read-or-die` adds the field, the screen check and the `who: "required"` target; the other challenge changes declare their investigator and parallel front.
