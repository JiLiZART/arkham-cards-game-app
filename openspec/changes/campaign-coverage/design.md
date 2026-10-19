## Context

Completeness is today the `generated` flag on `CampaignDef` (ADR-0007: generated from the guides; hand-written takes precedence). The picker's rules filter, the tile badge and the sidebar's note all read it, and the investigator picker marks an investigator partly implemented when their card has no abilities. Whether a card works is already decided by `implemented(db, code)` in `src/ui/catalog/implemented.ts` (abilities, a script, or text with nothing to run), which the catalog's "works" filter uses. Measured with it: about 3,400 encounter cards across the generated campaigns' scenarios and 1,480 of 1,550 player cards outside the core set do not work; Night of the Zealot has 8 of its 72 left. Generated campaigns' scenarios and their packs load lazily (ADR-0007), so the browser cannot compute a campaign's coverage before the player picks it.

In-force ADRs: 0001 to 0011, none superseded. 0007 (generated campaigns, hand-written precedence) and 0011 (the flow) constrain this design.

## Goals / Non-Goals

**Goals:** a coverage number per pack and per campaign that the screens can read at once; the "partly implemented" mark following it; one campaign file shape; the program of per-pack changes written down with its definition of done.

**Non-Goals:** implementing any card or scenario script (that is each pack's change); changing `implemented()`'s meaning; any engine change; scoring the quality of a card's implementation beyond "it has behaviour".

## Decisions

1. **Coverage is computed offline and committed, not computed in the browser.** `src/content/coverage.ts` is pure (`packCoverage(db)`, `campaignCoverage(db, id)`) over a fully loaded content db; `scripts/coverage.ts` loads everything from disk and writes `content/coverage.json`; the loader reads it eagerly like `pack-index.json`. *Why:* the browser has neither the generated scenarios nor the packs before a pick, and loading all packs to draw the picker would cost the first download. *Alternative:* compute at run time after `loadAllPacks`: rejected for the cost. *Alternative:* a `complete: true` flag written by hand into each campaign file: rejected, it would drift from the cards.

2. **The check guards the file.** `check:content` computes the same report and fails when it differs from the committed file ("content/coverage.json is behind the content (npm run coverage)"), the pattern the README credits already use. Coverage moves only by changing content and rerunning the command, so a pack change's diff shows its coverage going up.

3. **What a campaign "uses"**: every card of its scenarios' encounter sets and side decks, its acts and agendas, and not the scenario reference cards (their tokens are data, checked by tokens being real, not by `implemented`). Player cards are counted per pack, not per campaign: any investigator may bring them, so they gate the pack's completeness, not the campaign's. A campaign is complete when its used cards all work and every scenario has a scenario script (`db.scripts[scenarioId]`).

4. **The label reads coverage; `generated` keeps its meaning.** `generated` still says where a campaign came from (the import), and stays until a campaign is moved to `content/campaigns/`. The UI's notion becomes `complete = coverage.campaigns[id].complete`. The investigator picker's "partly implemented" becomes "their own card or one of their signature cards doesn't work", read from the same file (`coverage.investigators[code]`), which is more honest than "no abilities on the card".

5. **One campaign shape.** Night of the Zealot's `campaign.json` gains `packs`, `card` and `cards`, written by hand, and `check:content` checks every campaign's `cards` against its scenarios' reference cards, agendas and acts, so a hand-written list can't drift. The run-time fallback in `CampaignSheet` goes, so a moved campaign and Night of the Zealot are read the same way.

6. **The program is a document, each pack a change.** `docs/campaign-program.md` is generated from the coverage report the first time (counts, packs in play order) and then kept by hand: each pack's change ticks its row. One change per pack keeps every change the size of Night of the Zealot's work or smaller, each playable on its own. A cycle's new mechanics (supplies, keys, partners…) come as a change of their own before that cycle's first pack. *Alternative:* one change per campaign: rejected by the user (too large to review or ship).

## Risks / Trade-offs

- [`implemented()` is generous: a card with written abilities that cover only part of its text counts as working] → each pack change's tests (bot playthroughs, card tests) are the real gate; coverage is the progress measure, and the program document says so.
- [A committed generated file adds churn to every pack change] → it is small (one row per pack and campaign) and sorted; its diff is the change's progress.
- [Player cards counted per pack make the deluxe and mythos packs look further from done than their scenarios] → the report shows encounter and player counts apart, and a campaign's completeness ignores player cards.

## Migration Plan

Additive: a new committed file, a new command, the UI reading it. No save change. Rollback: revert; the UI falls back to `generated`.

## Open Questions

None. ADR-0007 stays in force; the new commitment (completeness is measured from the content and committed) is recorded as ADR-0012.
