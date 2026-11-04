## Why

The chaos bag is a plain array (`GameState.chaosBag: ChaosToken[]`, `addChaosTokens` in `src/engine/context.ts:182`, the draw at `rules/skillTest.ts:368`) over a closed `CHAOS_TOKENS` list (`src/content/schema.ts:10`) with no bless, no curse, no sealed token and no pool. The Innsmouth Conspiracy introduces bless and curse and 67 of its 104 player cards read them (`tic.md` §5), with 19 encounter cards and five token tables; The Feast of Hemlock Vale has 32 more player cards and Kōhaku (10012); parallel Jim (90049, 90051), Wendy (90037, 90038), Father Mateo (90082) and Rex (90078, 90080) use them. Seal is a keyword from The Forgotten Age on (04013, 04014, 04030, 53008, 04031, 04199, 04235, 04310, 04311; 53064, 04334, 04335), in The Drowned City (11007–11009, 11028, 11038, 11043, 11046, 11060, 11070), in Day of Reckoning (07040) and in all of Children of Blood (seal and release of `blood` tokens: 13064, 13093a/b, 13099, 13102, 13112–13114, 13118, Codex A on 13073 and 13083; Prey "most sealed tokens" on 13091, 13097, 13103, 13109, 13117). `player-cards-tfa`, `player-cards-tic`, `player-cards-fhv`, `player-cards-tdc`, `player-cards-side-and-promo`, `campaign-the-innsmouth-conspiracy`, `campaign-the-forgotten-age` (04334/04335 "tokens in the bag or sealed"), `campaign-return-to-the-forgotten-age` (53064) and `campaign-children-of-blood` are written against this change. Edge of the Earth's `frost` and Children of Blood's `blood` are their own changes, but they need a token kind to carry a reveal rule, which this change gives.

## What Changes

- **Two token kinds.** `bless` and `curse` join `CHAOS_TOKENS`. Revealed in a skill test, bless is +2 and reveals another token, curse −2 and reveals another; after the test each goes back to the token pool, not the bag. Revealed outside a test (an effect that reveals tokens) they return to the pool too.
- **A token pool and a cap.** The scenario holds a pool of 10 bless and 10 curse; adding tokens takes them from the pool, so at most 10 of a kind are in the bag and sealed on cards together; removing returns them.
- **Reveal rules by kind.** The symbol tokens keep the scenario's table; each other kind carries a rule (modifier, reveal another, where it returns) in one table in `rules/tokens.ts`, which `frost` and `blood` extend in their changes.
- **Seal and release.** A token sealed from the bag lives on a card instance and is not in the bag; the `seal` keyword on a player card is an additional cost to play it (not playable when no such token is in the bag); a card leaving play releases what it holds to the bag; effects release by kind or count, from a card or from any card; a bless or curse released as the rules say goes where the effect says (the bag or the pool).
- **Vocabulary.** Ops `addTokens { kind, amount }`, `removeTokens { kind, amount, from: "bag" }`, `replaceToken { from, to }`, `sealToken { kind | choice, on, from: "bag" }`, `releaseToken { kind?, amount?, from, to: "bag" | "pool" }`, `revealTokens { n, then }`; conditions `tokensInBag { kind, min, max }`, `sealedOn { kind, target, min }`, `revealedThisTest { kind }`; amounts `tokensInBag`, `sealedOn`, `tokensInBagOrSealed`; a window `tokenRevealed` with the kind, for "after a bless token is revealed" abilities; prey `mostSealed { kind }`; token X source `sealedOnYou { kind }`.
- **Campaign bag.** Bless and curse tokens in the bag at a scenario's end return to the pool; a campaign's `chaosBags` and the flow's `addChaosToken` may name them, and they are then added at setup from the pool.
- **UI.** The chaos bag modal lists bless and curse with the pool count; a card holding sealed tokens shows them on its frame; the token draw already has their art.
- **BREAKING**: `ENGINE_VERSION` 11; `GameState` gains `tokenPool` and `sealed`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: chaos bag (bless, curse, the pool, reveal rules by kind, a reveal window), skill tests (reveal another after bless or curse, return to the pool), and a new requirement for sealed tokens (seal as a play cost, release on leaving play, prey by sealed tokens).
- `game-table-ui`: chaos bag modal (bless, curse and pool counts; sealed tokens on cards).
- `card-content`: card record format (`seal` keyword with the token it seals).

## Impact

- `src/content/schema.ts` (`CHAOS_TOKENS`, `Keyword` `{ seal: ChaosToken | ChaosToken[] }`, the ops, conditions, amounts, `prey.mostSealed`, `TokenEffect.x` `sealedOnYou`), `src/content/implemented.ts` (`seal`, bless/curse lines), `src/content/campaign` schema (`chaosBags` may hold bless/curse).
- `src/engine/world/types.ts` (`GameState.tokenPool`, `sealed: Record<InstId, ChaosToken[]>`), `world/store.ts` (snapshot), `context.ts` (`addChaosTokens` through the pool; `sealToken`, `releaseTokens`), `rules/tokens.ts` (the kind table, `tokenX`), `rules/skillTest.ts` (reveal rule by kind, return to pool, `tokenRevealed` window), `rules/cards.ts` (`canPlay` with the seal cost; seal on entering play), `movement.ts` (release on leaving play), `rules/enemies.ts` (`preyCandidates` `mostSealed`), `effects/tokens.ts` (the ops), `campaign/campaign.ts` (end of scenario: pool), `campaign/flow.ts` (`addChaosToken` for bless/curse), `api.ts` (verbs `seal`, `release`, `addTokens`; reads `tokensInBag`, `sealedOn`), `read.ts` (`sealedOn`).
- `src/ui/hud/ChaosBagModal`, `src/ui/components/CardFace` or the card frame (sealed tokens), `content/i18n/{en,ru}/ui.json` (pool, seal prompts, "cannot play: no token to seal").
- Tests through `kits/driver.ts` with `rigBag`: `src/engine/__tests__/blessCurse.test.ts`, `seal.test.ts`; `rules/__tests__/tokens.test.ts`.
- Depends on nothing of the other three foundation changes; `engine-eoe-partners-frost` (`frost`) and `campaign-children-of-blood` (`blood`) extend the kind table. Followed by the player-card and campaign changes named above.
