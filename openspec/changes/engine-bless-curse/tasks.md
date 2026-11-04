## 1. Token kinds, the pool and the reveal rule

- [ ] 1.1 Failing driver test `src/engine/__tests__/blessCurse.test.ts` (with `rigBag`): a bless gives +2 and reveals another, then is in the pool; a curse −2 the same; bless then −1 sums to +1; curse then auto-fail fails and pools the curse; adding 3 bless with 2 in the pool adds 2; removing a bless returns it to the pool; bless left in the bag at the scenario's end are not in the campaign's bag.
- [ ] 1.2 `src/content/schema.ts`: `CHAOS_TOKENS` + `bless`, `curse`; campaign `chaosBags` and flow `addChaosToken` accept them; `world/types.ts GameState.tokenPool`; `world/store.ts` snapshot; `index.ts` seeds the pool minus the starting bag; `ENGINE_VERSION` 11.
- [ ] 1.3 `rules/tokens.ts TOKEN_RULES`; `rules/skillTest.ts` resolves a non-symbol kind from it, sums every revealed modifier, returns each token by `returnsTo` at the test's end (and for `ignored`); `context.ts addChaosTokens`/`removeChaosTokens` through the pool with `EVENT.TokenPoolEmpty`; `campaign/campaign.ts` writes back the bag without bless and curse.
- [ ] 1.4 Failing test in `rules/__tests__/tokens.test.ts`: `revealTokens { n: 2, then }` outside a test reveals two, runs `then` with them in the context, returns them by kind; `tokenRevealed` window opens per token with its kind; `Condition.revealedThisTest { kind: "curse" }`.
- [ ] 1.5 Effect ops `addTokens`, `removeTokens`, `replaceToken`, `revealTokens` in `effects/tokens.ts`; trigger `tokenRevealed` with a `tokens` filter in `rules/cards.ts`; `Amount`/`Condition` `tokensInBag`; `tokenX` `tokensInBag`; verbs and reads in `api.ts` (pin `scriptApi.test.ts`).

## 2. Seal and release

- [ ] 2.1 Failing test `seal.test.ts`: Protective Incantation is not offered with no curse in the bag and seals one when played; The Chthonian Stone's skull is back in the bag after it is discarded; a sealed bless released by default goes to the pool; `releaseToken { from: "any", kind: "skull" }` releases from every card; `sealToken` with a choice of kinds asks the controller; `tokensInBagOrSealed("elderThing")` counts both.
- [ ] 2.2 `world/types.ts GameState.sealed`; `context.ts sealToken`, `releaseTokens`; `movement.ts moveCard` out of play releases; `Keyword { seal }` in the schema and `implemented.ts` (and the importer parsing "Seal (…)"); `rules/cards.ts canPlay` with reason `play.noTokenToSeal`, `EnterPlay` seals; ops `sealToken`, `releaseToken`; `queries.ts sealedOn`, `tokensInBagOrSealed`; `EVENT.Sealed`, `EVENT.Released`.
- [ ] 2.3 Failing test `preySealed.test.ts`: `prey: { mostSealed: "blood" }` engages the investigator whose cards hold the most; `tokenX("sealedOnYou", { kind })` counts yours.
- [ ] 2.4 `preyCandidates` `mostSealed`; `TokenEffect.x` `sealedOnYou`; schema entries.

## 3. UI

- [ ] 3.1 `src/ui/hud/ChaosBagModal`: bless and curse rows with "N left" from the pool through `read.ts`; test by `data-testid`.
- [ ] 3.2 The card frame on the map and in the play area strip draws sealed tokens' icons; `CardDetail` lists them; `content/i18n/{en,ru}/ui.json` strings (`bag.poolLeft`, `play.noTokenToSeal`, `sealWhich`, `kw.seal` text revised to name the pool).

## 4. Verification

- [ ] 4.1 The replay corpus re-recorded by the script for the two new snapshot keys; `boundary.test.ts` passes.
- [ ] 4.2 `pnpm import:cards`, `pnpm coverage`, `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm check:content`; `openspec validate engine-bless-curse --type change --strict`.
