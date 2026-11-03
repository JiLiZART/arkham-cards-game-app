## Context

The cycle's player cards are generated into `content/packs/dwl/cards.generated.json` and `content/packs/return/cards.generated.json`, with behaviour expected in each pack's `cards.json` or `scripts/<code>.ts` (ADR-0006, ADR-0013). Six work from earlier changes (02020, 02030, 02116, 02117 from `uses-cards-heal-and-ward`; 02262; 51008). The investigators' definitions are `content/investigators-generated/0200{1..5}.json`; their abilities are declared under their code in `cards.json` as the core investigators' are. The engine has `baseSkill` in `queries.ts`/`rules/skillTest.ts` but not in the op schema; `actionsLeft` but no op that spends it; `takeControl`, parley, `restrictedActions`, `Cost.resourcesOrUses`, `Amount.onSelf`, the `dealDamage` window (ADR-0014) and the player windows from `nat-pack-cards`.

In-force ADRs: 0001–0036 (0027–0036 proposed). 0006 (behaviour in `cards.json`, generated data untouched), 0013 (every printed line accounted for), 0014 (player windows are engine windows), 0028/0034 (scripts through the registry and the explicit API).

## Goals / Non-Goals

**Goals:** the 118 cards and 5 investigators work, in data where the vocabulary fits; each pack lands on its own and ticks its program row.

**Non-Goals:** the 18 story assets and set-aside weaknesses (campaign changes); Exile and Researched themselves (`engine-generic-keywords`); the parallel investigators and their cards (`player-cards-investigator-decks`); bot strategy for the new cards.

## Diagram (C4-inspired, component level, ASCII)

```
 content/packs/dwl/cards.json (+ return/cards.json)     content/packs/{dwl,return}/scripts/<code>.ts
   abilities, costs, conditions, elderSign per code        02007 02009 02011 02013 02018 02021 02026 02031
   incl. investigators 02001-02005                          02106 02110 02153 02156 02190 02228 02229 02230
            |                                               02232 02235 02265 02270 02271 02302 02303 02304
            |                                               02305 02310 51010 51011, and 02004 02005
            v                                                        |
 +---------------------------------------------------------------------------------------------+
 | src/engine                                                                                  |
 |  rules/skillTest.ts: fight/investigate {baseSkill, moveFirst}; noDamageToOthersOnFail;     |
 |    committedByOther icons; successBy -> extra clue / return to hand / heal                   |
 |  rules/cards.ts: Cost {actions, doomOnSelf, resourcesX}; commit restrictions; cannotReady   |
 |  rules/round.ts: startingResources modifier; skipUpkeepIncome; Jenny's extra resource      |
 |  rules/tokens.ts: skull treated as 0 (Jim); elder sign as skull                             |
 |  rules/enemies.ts: enemyWouldSpawn window; moveEnemy; defeatEnemy op                        |
 |  effects/: healAt connecting, discoverAt connecting, moveTo investigator, redirectDamage,   |
 |    preventAndGain, removeDoom, Amount healEqualsHorror / damageBonus                        |
 |  campaign/upgrade.ts: Adaptable free swaps; campaign/decks.ts: Pete starts with Duke        |
 |  engine-generic-keywords: Exile, Researched (used, not defined here)                        |
 +---------------------------------------------------------------------------------------------+
            | prompts by key, labels ability.<code>.<n>
            v
 src/ui (unchanged), content/i18n/{en,ru}/ui.json
```

## Decisions

1. **Data first, script by exception.** The split follows the report's per-card verdicts: data now (47 cards), new vocabulary (49), script (22 + Jim and Pete). A vocabulary entry is added only when two cards need it or a script would be mostly boilerplate; one card's oddity stays a script (Double or Nothing, Hypnotic Gaze, Lure, Defiance, Expose Weakness, Alyssa Graham, Dr. Maleson, The Gold Pocket Watch, The Red-Gloved Man, Through the Gates).

2. **`baseSkill` enters the op schema.** `fight`/`investigate`/`evade` gain `baseSkill: number` and `moveFirst: "connecting"` (Duke), reusing the `baseSkill` the skill-test code already has for scripts; `noDamageToOthersOnFail: true` on `fight` (Blackjack 0 and 2). _Alternative:_ scripts for Duke and the Strange Solutions — rejected: four cards, the engine already has the field.

3. **Costs and restrictions as data.** `Cost.actions` (Kukri's extra action), `Cost.doomOnSelf` (Blood Pact), `Cost.resourcesX` (Jenny's Twin .45s: uses = X), `maxCommitted`-style restrictions become `commitOnly: { testKind | yourTest | otherTest }` (Rise to the Occasion, Inquiring Mind, Rise 3), `CardDef.cannotReady` (Wracked by Nightmares' effect on assets).

4. **Investigator abilities under the investigator's code**, as core's; Jim's skull is a token-value override in `rules/tokens.ts` keyed by a constant modifier `skullValue: 0` and an elder-sign option; Pete's Duke is `startsInPlay: ["02014"]` on the investigator's declaration read by `campaign/decks.ts` when a scenario is dealt.

5. **Adaptable is an upgrade-screen rule**: as a Permanent card it is in play from setup (existing behaviour) and never drawn. `campaign/upgrade.ts` lets a deck with Adaptable swap up to 2 level-0 cards for 0 XP per scenario; no engine step. _Alternative:_ a prompt in the campaign flow — rejected: the upgrade screen is where decks change (ADR-0004: deciding is game state, the deck edit is already there).

6. **Brother Xavier** takes damage in the `assignDamage` window for other investigators at his location: a reaction on `damageTaken` by another investigator with a redirect op (`redirectDamage { to: self }`), the same shape as the `dealDamage` window of ADR-0014.

7. **`ENGINE_VERSION` bump.**

## Risks / Trade-offs

- [Vocabulary sprawl: 30-odd new entries] → each has one unit test and two users or a stated reason; the proposal lists them so the apply step adds no others.
- [`baseSkill` in data changes how scripts' `baseSkill` is read] → one field, the existing script users (core) covered by their tests.
- [Dependence on `campaign-the-dunwich-legacy`'s first groups for `discardDeckTop`/`loseActions`] → three cards (02028, 02233, 51007; 02040 is the campaign's) wait for it; the rest of the packs do not.
- [Researched cards without the log entry in a standalone game] → `engine-generic-keywords` defines the gate; a standalone deck treats the entry as absent.

## Migration Plan

Content and engine in one change per the task groups; `ENGINE_VERSION` bump (saved scenarios restart, campaigns kept). Rollback: revert.

## Open Questions

- None open; the user's answers are under "Decided (user)" in the proposal.
- No in-force ADR needs revisiting.
