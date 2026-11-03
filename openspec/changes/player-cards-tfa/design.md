## Context

The cycle's player cards are generated into `content/packs/tfa/cards.generated.json` (tfa, tof, tbb, hote, tcoa, tdoy, sha) and `content/packs/return/cards.generated.json` (rttfa), with behaviour expected in each pack's `cards.json` or `scripts/<code>.ts` (ADR-0006, ADR-0013). Two work (04103, 04107). The investigators' definitions are `content/investigators-generated/0400{1..5}.json`; their abilities go under their code in `cards.json` as the core investigators'. The engine has restricted actions by trait and designator (`nat-pack-cards`), `Cost.resourcesOrUses`, the `dealDamage` window (ADR-0014), player windows, `searchDeck`/`takeFromDiscard`, parley, attachments to locations and enemies (`engine-scenario-structure`), seal (`engine-bless-curse`), Researched (`engine-generic-keywords`), `addWeakness`/`earnCard`/`removeCard` in the campaign decks, `deckChangeCost` in `src/engine/campaign/upgrade.ts`.

In-force ADRs: 0001–0036, 0045, 0046, 0050, 0052, 0053, 0082, 0083. 0006, 0013, 0014, 0028, 0034 constrain this change.

## Goals / Non-Goals

**Goals:** the 120 cards and 5 investigators work, in data where the vocabulary fits; each pack lands on its own and ticks its program row.

**Non-Goals:** the story assets and relics (campaign changes); seal and Researched themselves; the parallel investigators (`player-cards-investigator-decks`); bot strategy for the new cards.

## Diagram (C4-inspired, component level, ASCII)

```
 content/packs/tfa/cards.json (+ return/cards.json)        content/packs/{tfa,return}/scripts/<code>.ts
   abilities, costs, conditions, elderSign per code          04001 04004 04008 04009 04012 04021 04022 04023
   incl. investigators 04001-04005                            04024 04028 04032 04035 04037 04038-04042 04106
            |                                                 04109 04158 04192 04197 04198 04200 04202 04204
            |                                                 04267 04270 04307 04308 53012-53015 ...
            v                                                          |
 +-----------------------------------------------------------------------------------------------+
 | src/engine                                                                                     |
 |  rules/cards.ts: playFromDiscard; event attaches to asset; commitOnly + wild per hand size;    |
 |    extra ally slots; parley shuffles enemy into deck                                           |
 |  rules/round.ts: gainActions {onlyFor: evade} (Finn); Leo's turn-start window (Ally -1)        |
 |  rules/skillTest.ts: difficulty = enemy evade; evade with willpower then move; retry (04200)   |
 |  rules/tokens.ts: autoFail -> elder sign once (Mateo); cancel symbol token; name a token;      |
 |    reveal 3 resolve 2 (Olive); ignore symbol effects (Defiance); reveal X more (04202)        |
 |  rules/enemies.ts: attack at connecting ignoring aloof/retaliate; lowered fight; to deck top   |
 |  effects/: Amount statPerToken (Calvin), shroudOfLocation, connectionsCount; secrets placed    |
 |  campaign/upgrade.ts: Shrewd Analysis, Arcane Research, On Your Own, Ancient Stone's number   |
 |  campaign/decks.ts: Dark Pact, Doomed and Offer chains; killed / driven insane                 |
 |  engine-bless-curse: seal/release; engine-generic-keywords: Researched (used, not defined)     |
 +-----------------------------------------------------------------------------------------------+
            | prompts by key, labels ability.<code>.<n>
            v
 src/ui (unchanged), content/i18n/{en,ru}/ui.json
```

## Decisions

1. **Data first, script by exception.** The split follows the report's per-card verdicts: data now (about 20), new vocabulary (about 35), script (about 45, the investigators' two among them). A vocabulary entry is added only when two cards need it or a script would be boilerplate; one card's oddity stays a script (Jake Williams, Call of the Unknown, Caught Red-Handed, Dr. Elli Horowitz, Tooth of Eztli, Unearth the Ancients, "You handle this one!", Dark Prophecy, Yaotl, Backpack, Recall the Future, Intrepid, Olive McBride, Defiance, Live and Learn, Against All Odds, Ornate Bow, Feed the Mind, The Skeleton Key, Pnakotic Manuscripts, Borrowed Time, Dendromorphosis).

2. **Investigator abilities under the investigator's code.** Ursula 04002: reaction after a move, investigate as a free action once per round (`investigate` with `free: true` in a `moved` window). Finn 04003: `gainActions { onlyFor: "evade" }` at turn start (the Galvanize shape). Calvin 04005: `Amount { statPerToken: damage | horror }` as a constant modifier. Leo 04001: a script in the `turnBegins` window offering an Ally from hand at 1 less. Father Mateo 04004: a script in the token reveal, once per game, turning an auto-fail into an elder sign (cancel and treat as elder sign), with his elder sign's choice. _Alternative:_ scripts for all five — rejected: three fit the vocabulary two later packs also use.

3. **Seal cards write over the bless/curse change's `seal { token, on: self }` and `release`**; the Chthonian Stone's charges spend on release, Crystalline Elder Sign's +1 or elder sign choice, Seal of the Seventh Sign's "tokens sealed here can't be released" flag, Shards of the Void's sealed-token reveal; one test each on a fixture bag.

4. **Campaign chains are deck edits in `campaign/decks.ts`** at the scenario's end or the upgrade step: Dark Pact replaced by The Price of Failure when not played; Doomed → Accursed Fate → The Bell Tolls, the last killing its bearer; Offer You Cannot Refuse → Fine Print → Sell Your Soul with the bearer's experience bonus, then driven insane; Ancient Stone's "identified the stone (N)" as a `count:` campaign note read by the Researched versions' uses. `src/engine/campaign/upgrade.ts`: Shrewd Analysis (two copies of an upgraded Unidentified card at random for one cost), Arcane Research (the first Spell upgrade per scenario 1 cheaper, 1 mental trauma at purchase), On Your Own (Exceptional, Permanent; no Ally assets in the deck, the deckbuilding check in `investigator-decks`).

5. **Live and Learn is a retry, not an undo**: after a failed test the card starts the same test again (same skill, difficulty and action) with +2 and the first result kept; the store's replay-based Undo is not involved.

6. **`ENGINE_VERSION` bump.**

## Risks / Trade-offs

- [Vocabulary sprawl: ~35 entries] → each has one unit test and two users or a stated reason; the proposal lists them so the apply step adds no others.
- [Father Mateo's auto-fail conversion sits inside the token reveal] → one hook in `rules/tokens.ts` before the token resolves, tested with a forced auto-fail.
- [The weakness chains touch the campaign deck between scenarios] → each chain has a test over two scenario ends with a fixed seed.
- [Seal depends on `engine-bless-curse`] → the nine cards wait for it; the other groups do not.

## Migration Plan

Content and engine in one change per the task groups; `ENGINE_VERSION` bump (saved scenarios restart, campaigns kept). Rollback: revert.

## Open Questions

- None open; the user's answer is under "Decided (user)" in the proposal. No in-force ADR needs revisiting.
