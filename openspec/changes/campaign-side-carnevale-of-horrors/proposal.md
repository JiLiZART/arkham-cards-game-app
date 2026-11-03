## Why

Carnevale of Horrors (`side-carnevale-of-horrors`, pack `coh`, 40 cards) is on the new-game screen but cannot be played: 1 of 40 cards works, the generated setup puts San Marco alone on the table with no connections, the chaos bag is Night of the Zealot's, no token has an effect, and the four masks and the Abbess that a host campaign would earn have no behaviour. It is the side scenario with the fewest new mechanics (a ring of locations, double-sided revelers, cards beneath the act and agenda), so it goes first and settles how a side scenario is finished.

## What Changes

- The campaign moves from `content/campaigns-generated/side-carnevale-of-horrors/` to a hand-written `content/campaigns/side-carnevale-of-horrors/` (the importer leaves hand-written ids alone, ADR-0007): the guide's Standard and Hard bags (Easy = Standard, Expert = Hard, the only two printed), the scenario's setup (one random location removed, never San Marco or Canal-side; the other eight in a random circle with one-way clockwise links; the Abbess at San Marco; one shuffled Masked Carnevale-Goer per other location; Cnidathqua and the four masks set aside), the token table from 82001 for all four difficulties, and the three resolutions with the reveler counts the flow reads.
- A scenario script `scripts/carnevale-of-horrors.ts`: the ring (`across`, clockwise and counter-clockwise neighbours), the reveler counts beneath act and agenda, act 1's peek, act 2's forced flip and Gondola board swap, act 3's encounter replacement, the agenda backs, Cnidathqua off the map and attackable from anywhere.
- Every `coh` encounter card works: 39 cards in `content/packs/side/cards.json` or `content/packs/side/scripts/<code>.ts` (section 4.1 of the inspection report lists which is which).
- The 7 player cards of the pack work: the masks 82023–82026 ("use [X] for this test instead", one mask per investigator), the Abbess 82022, and the reveler-side cards; the flow's `choose_masks` becomes a per-investigator card choice (each investigator in player order may add one mask, no mask twice).
- Standalone play costs nothing; the 3 XP side-story cost applies only when a host campaign offers the scenario through its `sideScenario` step.
- Coverage reports `coh` 40 of 40 and the campaign complete.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: Carnevale of Horrors sets up as the guide says, its tokens act, and it plays to each resolution with the rewards the reveler counts decide.
- `card-content`: the `coh` pack's cards declared (substitute-skill reaction, mask limit, revelers beneath act/agenda as token `x` sources, clockwise connection line rule); the campaign flow's per-investigator card choice.

## Impact

- New `content/campaigns/side-carnevale-of-horrors/` (campaign, scenario, flow, script); `content/campaigns-generated/side-carnevale-of-horrors/` deleted.
- `content/packs/side/cards.json` (39 entries) and `content/packs/side/scripts/` (new folder; about 25 scripts).
- `src/content/schema.ts`: token `x` sources `revelersBeneathAgenda` / `revelersBeneathActOrAgenda`, reaction `substituteSkill`, the `LINE_RULE` for the clockwise connection line, flow step `investigatorChoice` with `codes`; `src/engine/rules/skillTest.ts` (substitute skill); `src/engine/campaign/flow.ts` (per-investigator card choice).
- Depends on `engine-scenario-structure` (flip a card in play, cards beneath cards, trait and relative spawn, conditional token modifiers), `engine-location-instances-grid` (connections per location instance, so the ring is built at setup), `campaign-flow-compiler-fixes` (the leaked Fortune and Folly interlude). The masks and Abbess reach a host campaign only through the `sideScenario` step with `cost`.
- `content/i18n/{en,ru}/ui.json` prompts; `content/coverage.json`; `docs/campaign-program.md` row `coh`.

## Decided (assumed)

- Hand-written campaign, not patches to the generated files: the generated setup, bag, tokens and connections are all wrong, and ADR-0007 already keeps hand-written ids out of the importer's way.
- Easy uses the Standard bag and Expert the Hard bag: the reference card prints only two, and `tokensReal` needs all four.
- The ring is scenario data plus a script helper, not an engine "ring layout": `oneWay` connections exist on `ScenarioDef`, and no other scenario is a ring.
- Reveler counts go to the flow as scenario data (`setData`) rather than questions, so the resolution rewards are computed, not asked.

## Open questions

- Which of the nine locations' clockwise connection line counts as "accounted for" by the `oneWay` data (a `LINE_RULE`) rather than a script: proposed as data.
- The masks' "Limit 1 [[Mask]] per investigator": a deck-building limit (host campaign) or a play limit? Proposed: both, with the deck rule in `alternatives`-style deck options only when a host campaign exists.
