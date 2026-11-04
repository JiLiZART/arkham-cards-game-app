## Context

`CHAOS_TOKENS` (`src/content/schema.ts:10`) is the core set's sixteen tokens; `ChaosToken` is its zod enum and `ChaosTokenIcon`/`ChaosToken.tsx` already paint `bless`, `curse` and `frost` (`src/ui/components/ChaosToken/ChaosToken.tsx:9-11`). `GameState.chaosBag: ChaosToken[]` (`src/engine/world/types.ts:455`) is the whole model: `addChaosTokens` (`context.ts:182`) pushes, the reveal stage (`rules/skillTest.ts:345-373`) splices a random token out and `t.drawn` holds it, token resolution (`skillTest.ts:454-510`) handles `autoFail`, `elderSign` and the four symbols through the scenario table with `revealAnother`, `tokenTotal` sums the modifiers, and the test's end (`skillTest.ts:844`) pushes `t.tokens` and `t.ignored` back into the bag. `rules/tokens.ts` holds `tokenX`. `preyCandidates` (`rules/enemies.ts:56`) knows `bearer`, `only`, `highest`, `lowest`. `canPlay` (`rules/cards.ts`) checks cost and slots. `CampaignState.chaosBag` (`campaign/types.ts:102`) is the campaign's bag, written back from the scenario's at its end. The Grimoire defines Seal (l.1503: sealed tokens are not in the bag, released when the card leaves play, a play cost for a player card with the keyword); bless and curse are defined by The Innsmouth Conspiracy's insert, quoted in `tic.md` §2.3 (+2 / −2, reveal another, return to the pool, at most 10 of each in the bag and sealed). The written changes that use this one: `player-cards-tfa` (nine seal cards), `campaign-the-forgotten-age` (04334/04335 "in the bag or sealed"), `campaign-return-to-the-forgotten-age` (53064 seals an elder sign), `campaign-children-of-blood` (seal and release of `blood`, prey by sealed count, Codex A), the TIC, FHV, TDC and side-and-promo player-card changes.

## Goals / Non-Goals

**Goals:** bless and curse as token kinds with their reveal rule, pool and cap; sealed tokens on card instances with release on leaving play and the Seal play cost; the ops, conditions, amounts, window and prey the reports list; the bag modal and card frames showing them; `ENGINE_VERSION` 11.

**Non-Goals:** `frost` (`engine-eoe-partners-frost`) and `blood` (`campaign-children-of-blood`) themselves: they add a row to the kind table; the second chaos bag of Hemlock House (`engine-fhv-days-relationships`); the TIC flashbacks' permanent campaign-bag edits (`campaign-the-innsmouth-conspiracy`); any card's data.

## Diagram (C4-inspired, component level, ASCII; the engine is pure, the browser app the only container)

```
 content/packs/<pack>/cards.json   keywords: [{seal: "curse"}]; abilities: sealToken, releaseToken, addTokens, revealTokens
 content/campaigns*/campaign.json  chaosBags.<difficulty>: [... "bless", "curse"]; flow addChaosToken bless|curse
            |
            v  src/content/schema.ts CHAOS_TOKENS + bless, curse; ops/conditions/amounts; prey.mostSealed
 +-----------------------------------------------------------------------------------------------+
 | src/engine                                                                                    |
 |  world/types.ts  GameState.chaosBag (in the bag) + tokenPool: {bless, curse} + sealed: Record<InstId, ChaosToken[]>
 |  rules/tokens.ts TOKEN_RULES: Record<kind, {modifier, revealAnother, returnsTo: "bag"|"pool"}> |
 |                  (bless: +2, another, pool; curse: -2, another, pool; numbers: bag)             |
 |  rules/skillTest.ts  resolveToken: symbols -> scenario table; others -> TOKEN_RULES; after each |
 |                  reveal win("tokenRevealed", {kind, inv}); test end: by returnsTo                |
 |  context.ts      addChaosTokens(kind, n) draws from tokenPool (cap); removeChaosTokens -> pool; |
 |                  sealToken(on, kind), releaseTokens(from, kind?, n?, to)                        |
 |  movement.ts     moveCard out of play: releaseTokens(card, all, "bag"|"pool" by kind)           |
 |  rules/cards.ts  canPlay: seal keyword needs the kind in the bag; EnterPlay seals it            |
 |  rules/enemies.ts preyCandidates: mostSealed {kind} over cards each investigator controls       |
 |  effects/tokens.ts  addTokens, removeTokens, replaceToken, sealToken, releaseToken, revealTokens|
 |  queries.ts      tokensInBag(kind), sealedOn(card, kind), tokensInBagOrSealed(kind)             |
 |  campaign/campaign.ts  scenario end: bless/curse left in the bag -> pool, not CampaignState.bag |
 |  api.ts          verbs seal, release, addTokens; reads tokensInBag, sealedOn                    |
 +-----------------------------------------------------------------------------------------------+
            v
 src/ui/hud/ChaosBagModal (bless/curse rows + pool), card frame (sealed icons), CardDetail (list)
```

## Decisions

1. **The bag is three places: in the bag, sealed, in the pool.** `GameState.chaosBag` keeps its meaning (what can be revealed); `tokenPool: { bless: number; curse: number }` starts at 10 each; `sealed: Record<InstId, ChaosToken[]>` is a table keyed by instance (ADR-0024). `addChaosTokens(game, tokens)` draws bless and curse from the pool and stops at zero (the cap: bag + sealed ≤ 10 follows from the pool); other kinds are unbounded as today. `removeChaosTokens` returns bless and curse to the pool and drops other kinds. _Alternative:_ a single list with a `where` field per token — rejected: the reveal splices from `chaosBag`, and three counters are what the modal shows.

2. **Reveal rules by kind are one table.** `TOKEN_RULES` in `rules/tokens.ts`: `{ bless: { modifier: 2, revealAnother: true, returnsTo: "pool" }, curse: { modifier: -2, revealAnother: true, returnsTo: "pool" } }`, the numbers and `autoFail`/`elderSign` as today (`returnsTo: "bag"`); `resolveToken` in `skillTest.ts` reads it for a non-symbol kind, and the test's end (`skillTest.ts:844`) sends each of `t.tokens` and `t.ignored` where its row says. `revealTokens { n, then }` outside a test reveals `n` from the bag, runs `then` with `tokens` in the context, and returns them the same way. `frost` adds a row with its own "second frost" rule in its change; `blood` likewise.

3. **A reveal window per token.** After each token is drawn and before its modifier is applied, `win("tokenRevealed", { inv, kind, test })` opens (the existing "would reveal" window at `skillTest.ts:359` stays before the draw); abilities with `trigger: "tokenRevealed"` and a `tokens` filter react; `Condition.revealedThisTest { kind }` reads `t.drawn`.

4. **Sealing is `moveToken`, not `removeToken`.** `sealToken { kind | choice: kinds, on: target, from: "bag" }` takes the first matching token from `chaosBag` (the controller choosing when `choice` lists several and more than one is present, `CHOICE.Generic`, key `sealWhich`, `auto: true`) and pushes it to `sealed[on]`; `releaseToken { from: target | "any", kind?, amount?, to: "bag" | "pool" }` moves back (`to` defaults to the kind's `returnsTo`); `moveCard` out of play (`movement.ts`) releases everything on the card by the kind's default (Grimoire l.1503). The Seal keyword: `{ seal: kind | kinds }` in `keywords` (the shape of ADR-0040); `canPlay` refuses when none of the kinds is in `chaosBag` (reason key `play.noTokenToSeal`); `EnterPlay` runs `sealToken` for it. A sealed token is not in `chaosBag`, so nothing else changes for the draw.

5. **Reads and the campaign.** `tokensInBag(game, kind)`, `sealedOn(game, card, kind?)`, `tokensInBagOrSealed(game, kind)` in `queries.ts`; `Amount` and `Condition` entries of the same names; `tokenX` gains `sealedOnYou { kind }` (Blood Money's skull) and `tokensInBag { kind }`. `preyCandidates` gains `{ mostSealed: kind }`: the investigators whose controlled cards hold the most of that kind, ties as today. At the scenario's end `campaign.ts` writes back `chaosBag` without bless and curse (they return to the pool); a campaign's `chaosBags` and the flow's `addChaosToken` may name them, and `createGame` seeds the pool minus what the bag starts with. _Decided (assumed):_ bless and curse do not carry between scenarios unless the guide adds them; the TIC insert is not in `inspired/`, so this is listed under Open Questions.

6. **UI.** `ChaosBagModal` gets two rows with "N left" from `tokenPool` (read through `read.ts`); the card frame draws the sealed tokens' icons (`ChaosTokenIcon`) in a corner on the map and in the play area strip; `CardDetail` lists them. The token draw needs nothing: the discs are one per token in `chaosBag`.

## Risks / Trade-offs

- [The pool model is wrong for a scenario that says "add a curse token" with the pool empty] → the op adds nothing and emits `EVENT.TokenPoolEmpty`, which is the rule (at most 10).
- [Cards that read sealed tokens on a specific card after it changes zone] → the release happens in `moveCard`, the one place every zone change goes through.
- [Snapshots and the corpus] → no recorded game seals or blesses; `tokenPool` and `sealed` appear in the snapshot as new keys, re-recorded by the script.
- [Seal as a play cost with a choice of kinds] → `canPlay` needs any one present; the choice is asked at play, recorded like every choice.

## Migration Plan

`ENGINE_VERSION` 11. `pnpm import:cards` after the importer learns "Seal (…)"; `pnpm coverage`. Campaign files are unchanged until a campaign change lists bless or curse.

## Open Questions

- Whether bless and curse tokens left in the bag at a scenario's end carry into the next scenario of a campaign (decision 5 assumes they return to the pool). The Innsmouth Conspiracy rules insert is not in `inspired/`; the user confirms from the printed insert.
