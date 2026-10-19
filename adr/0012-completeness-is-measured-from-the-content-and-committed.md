# ADR-0012: Completeness is measured from the content and committed; the generated flag only says where a campaign came from

- Status: accepted
- Date: 2026-10-19

## Context and Problem Statement

ADR-0007 generated 35 campaigns from the campaign guides with partial rules, and the new-game screen marked them "partly implemented" by their `generated` flag. Making them complete is a long program of per-pack changes (about 3,400 encounter cards and 1,480 player cards without behaviour, a scenario script per scenario). The flag can't follow that work: it says where a campaign came from, not how much of it plays. The browser loads a generated campaign's scenarios and packs only when it is picked, so it cannot compute a campaign's state before then.

## Considered Options

- Compute coverage from the content offline (`npm run coverage`): per pack, its encounter and player cards and how many work; per campaign, the cards its scenarios use and which scenarios have scripts. Commit the report as `content/coverage.json`, loaded with the first download; `check:content` fails when it is behind the content. The UI reads completeness from it; `generated` keeps meaning "from the import".
- Compute it in the browser after loading every pack.
- A hand-set `complete` flag per campaign.

## Decision Outcome

Chosen option: "compute offline and commit", because the number then moves only when content changes and the check keeps it honest, every pack change shows its progress in its diff, the screens know it without loading any pack, and the definition of done for a pack change is mechanical (coverage reports it complete). Loading every pack in the browser was rejected for the first download's cost; a hand-set flag for drifting from the cards.

### Consequences

- Good, because the program of per-pack changes has a measure and an acceptance test.
- Good, because a generated campaign can be complete (and lose its mark) before it is moved to `content/campaigns/`.
- Bad, because every content change that touches a card's behaviour must rerun `npm run coverage` (the check says so).
- Bad, because "works" is `implemented()`: a card with partial behaviour counts as working; tests in each pack change remain the real gate.
- Follow-up: one change per pack, listed in `docs/campaign-program.md`; a cycle's new mechanics as their own change before its first pack.
