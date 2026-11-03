# ADR-0053: Campaign supplies are a log section copied into the scenario and written back

- Status: proposed
- Date: 2026-11-03

## Context and Problem Statement

The Forgotten Age gives each investigator supplies bought with points at the prologue and the resupply point (provisions, medicine, rope, a map...), checks them in five interludes ("any one investigator must cross off one gasoline", "each investigator with medicine may cross it off to remove a Poisoned"), and reads them on cards during a scenario ("check your supplies: if you have a compass, look at the top 3 cards of the exploration deck"; Steps of Yoth crosses off a rope). Supplies are per investigator with counts (two provisions), they persist across the campaign, and both the flow and the table change them. The campaign log has sections of four kinds (entries, count, cards, investigatorCount; ADR-0011) and the generated flow already declares a `supplies` section it cannot fill. Player cards also have `uses: supplies`, an unrelated token.

## Considered Options

- A fifth log section kind, `supplies`: per investigator, a multiset of supply ids; flow steps to buy, check and cross off; at scenario start the log's supplies are copied into the game state, cards read and cross off the copy, and the scenario's end writes it back, as experience and the campaign notes already flow.
- Supplies as `investigatorCount` entries keyed `supply:<name>`, with no new kind.
- Supplies as a campaign field outside the log, read by cards through a new engine read.

## Decision Outcome

Chosen option: "a log section kind, copied in and written back", because the log is already what the flow reads, the log screen shows and the save persists, so one new kind gets all three; because a scenario must act on supplies without the flow (a card's condition), and the engine's rule is that a scenario is its seed plus its choices, so what a card reads must be in the game state, not in the campaign; and because the write-back at the end is the same seam experience uses. `investigatorCount` keys were rejected: the screen would show sixteen counters per investigator and the step kinds would still be new.

### Consequences

- Good, because the flow's four unsupported supply step kinds compile to typed steps, and the log screen shows supplies as the guide prints them.
- Good, because a card's supply check is a plain condition over the game state, deterministic in replay.
- Good, because a scenario-local supply list (Relics of the Past) is the same step with `record: false`.
- Bad, because supplies exist in two places during a scenario; an abandoned scenario keeps the log as it was, like experience.
- Bad, because the campaign save version bumps for the new section.
- Follow-up: the Return-to resupply's experience-to-points conversion is a field of the buy step; Edge of the Earth's and The Scarlet Keys' per-investigator campaign assets may reuse the kind or add their own.
