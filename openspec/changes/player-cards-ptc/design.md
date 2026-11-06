## Context

The cycle's player cards are generated into `content/packs/ptc/cards.generated.json` (ptc, eotp, tuo, apot, tpm, bsr, dca: 383 cards) and `content/packs/return/cards.generated.json` (rtptc among the other Return boxes), with behaviour expected in each pack's `cards.json` or `scripts/<code>.ts` (ADR-0006, ADR-0013). `ptc/cards.json` has 03230, 03040, 03041; `return/cards.json` has 51008; 03114 works from its text. The investigators' definitions are `content/investigators-generated/0300{1..6}.json` with starter decks `content/decks-generated/0300x-starter.json`; their abilities are declared under their code in `cards.json` as the core and Dunwich investigators' are. The engine has `uses` of every kind, `soaksForLocation`, `maxCommitted`, `addUses`, `returnSelfToHand`, `noChaosTokens`, `nonEliteCannotAttack`, `takeFromDiscard`, `searchDeck`, `lookAtTop`, `succeededBy`, `successfulEvade`, `treacheryDrawn`, the `dealDamage` and player windows (ADR-0014), `Cost.resourcesOrUses`, `Amount.onSelf`, `firstAction` and `parley` from `nat-pack-cards` and `player-cards-dwl`; a Permanent card starts in play (`src/engine/index.ts:230`).

In-force ADRs: 0001–0036 and 0050 (0027–0036, 0050 proposed). 0006, 0013, 0014, 0021 (state is JSON-plain), 0018 (online play replays a host-ordered move log: Time Warp's rewind is resolved inside `replay`, so peers agree), 0028/0034 (scripts through the registry and the explicit API).

## Goals / Non-Goals

**Goals:** the 125 cards and 6 investigators work, in data where the vocabulary fits; each pack lands on its own and ticks its program row.

**Non-Goals:** the 15 story cards (campaign changes); Exile, Researched and Hidden themselves (`engine-generic-keywords`); flips and cards beneath (`engine-scenario-structure`); the parallel investigators and Enthralling Encore's cards (`player-cards-investigator-decks`); bot strategy for the new cards.

## Diagram (C4-inspired, component level, ASCII)

```
 content/packs/ptc/cards.json (+ return/cards.json)        content/packs/{ptc,return}/scripts/<code>.ts
   abilities, costs, conditions, elderSign per code          03003 03005 03006 03007 03011 03012 03013 03014
   incl. investigators 03001-03006                           03015 03018 03019 03022 03023 03025 03029 03033
            |                                                03042 03106 03141 03149 03158 03199 03238 03263
            |                                                03264 03272 03304 03306 03308 03310 03311 03315
            v                                                52002 52011 52012 52013
 +---------------------------------------------------------------------------------------------+
 | src/engine                                                                                  |
 |  rules/skillTest.ts: commitFromAfar (03010); committedExactly window; wouldSucceed window   |
 |    (03030); margin-keyed: resources (03032), clues per 2 (03192), auto-evade (03193, 03194),|
 |    uses kept (03031); Minh's wild icon; commit conditions {remainingSanity, onSpell}        |
 |  rules/cards.ts: Composure priority + limit 1 in play; role filter (Lola); hand cost        |
 |    modifier (03142); commit costs {resourcesX (03233), charges (03235)}                     |
 |  rules/investigators.ts: role state + switch; wouldBeDefeatedByHorror (03269)              |
 |  rules/round.ts: extraActionOncePerTurn (03234); action start mark (03311);  giveAction    |
 |  rules/enemies.ts: aloofByAttachment (03038); prey {only, lowestSanity}; ignoreRetaliate;   |
 |    defeatEngagedNonElite (03189); evadeDisengageNoExhaust (03028); cannotEngageYou          |
 |  effects/: investigateRemote (03027), moveToAnyRevealed (03034), damageEachAt (03153),      |
 |    distributeUses (03239), cancelAssignedDamage (03305), toVictory (03016), shuffleDiscard  |
 |    (03196), Amount {damageOnYouHalf}, enemiesEngaged                                        |
 |  campaign/decks.ts: Mark starts with Sophie; Sefina's 13-card hand; Stick to the Plan       |
 |  campaign/upgrade.ts + campaign.ts: Charon's Obol (+2 XP; killed if defeated)              |
 |  engine-generic-keywords: Exile, Researched, Hidden; engine-scenario-structure: flip,       |
 |    beneath (used, not defined here)                                                         |
 +---------------------------------------------------------------------------------------------+
            | prompts by key, labels ability.<code>.<n>
            v
 src/ui (unchanged), content/i18n/{en,ru}/ui.json
```

## Decisions

1. **Data first, script by exception.** The split follows the report's per-card verdicts (`ptc.md` §5): data now (20), new vocabulary (67 less the story cards), script (the diagram's list). A vocabulary entry is added only when two cards need it or a script would be mostly boilerplate; one card's oddity stays a script (The Home Front, The King in Yellow, Spirit-Speaker, Angered Spirits, "Let me handle this!", Ever Vigilant, Sleight of Hand, Uncage the Soul, The Thing That Follows, Heroic Rescue, Charles Ross, Calling in Favors, Snare Trap, A Chance Encounter, On the Hunt, "Not without a fight!", "Eat lead!", Eidetic Memory, Cheat Death, Key of Ys).

2. **Investigator abilities under the investigator's code**, as core's and Dunwich's. Mark's Sophie and Sefina's opening hand are `campaign/decks.ts` rules keyed by the investigator's declaration (`startsInPlay: ["03009"]` as Pete's Duke; `openingHand: { draw: 13, keep: 8, beneath: { type: event, max: 5 } }`); Minh's wild icon is a reaction on a `committed` window that sets an icon flag on the card for the test; Yorick's asset from the discard reuses `searchAndPlay` with `from: discard`; Akachi's extra charge is a constant `usesBonus` modifier read where uses are set.

3. **Lola's role is investigator state.** `role` on the investigator, set by a prompt after the opening hand (`campaign/decks.ts`), read by `canPlay`, the commit check and `UseAbility` as a class filter with Neutral always allowed; a fast ability on 03006 switches it (limit once per round); Improvisation and Crisis of Identity set it through a `setRole` op. _Alternative:_ a flag per class — rejected: one field, one prompt key.

4. **Composure is a horror-assignment priority.** A card flagged `composure` must receive non-direct horror dealt to its controller before the investigator does (the assign-horror step offers only Composure cards while one can take it), and `limitInPlay: { trait: "Composure", n: 1 }` refuses a second. _Alternative:_ scripts for five cards — rejected: one flag, five users.

5. **Time Warp is the existing Undo, driven by a card** (user decision). The app's Undo replays the recorded choices without the last ones, and calling off a skill test does the same back to the test's start. Time Warp reuses that replay.
   - **Action start mark:** when an investigator starts an action during their turn while a hand holds a card that waits for `actionPerformed`, `performActionHandler` records the flag `actionStart = { inv, key }` under a key of its own, cleared when the turn ends, and opens the `actionPerformed` window once the action has resolved. _As built:_ a key, not a `counters.choice` count, so the state of a game without Time Warp is unchanged and the recorded games replay as before.
   - **The card:** Time Warp is offered in that window to an investigator at the acting investigator's location. Playing it pays its cost and sets `state.rewind = { action: actionStart.key, card, paid }`.
   - **The rewind:** `replay` in `src/engine/index.ts` sees `rewind` after a dispatch and calls `rewound`: it replays the choices until the one after which the action's key is noted and keeps the state before it, then moves Time Warp from the restored hand to the discard and pays its costs again, the only change the card's text allows. It then continues with the remaining choices. The random generator keeps its state from after the undone action rather than the restored one, so redoing the action draws new chaos tokens, as returning the token to the bag does at the table.
   - **The store:** after a choice whose result carries `rewind`, it rebuilds the game with `replay` over the full list, the path `runUndo` already takes. The list keeps the Time Warp choice, so a save or report of the game replays to the same state. Online, the Time Warp choice is an ordinary `choose` move that every peer replays (ADR-0018); `src/net/` needs no new move.
   - **The Undo button:** its floor is untouched. Time Warp may rewind past a revealed card or token, because its text says to; the Undo button still may not. Taking back the Time Warp choice itself is an ordinary undo, subject to the floor.
   - _Alternative:_ a copy of the state kept in the state while a hand holds the card. Rejected by the user: a second undo mechanism beside the one the app already has, and a double-sized save during those turns.

6. **Charon's Obol** is two hooks: `campaign/upgrade.ts` adds 2 experience at a scenario's resolution for an investigator who holds it and was not defeated during the scenario; `campaign/campaign.ts` kills an investigator who holds it and was defeated, even when the resolution would otherwise save them (user decision). Stick to the Plan is a `campaign/decks.ts` step before the opening hand (choose up to 3 Tactic or Supply events to attach) plus `extraPlayable` from beneath it.

7. **Sophie's flip** uses the `flip` op of `engine-scenario-structure` on a forced trigger at 5 damage, back at 4 or less; Sefina's beneath pile uses its `beneath` store with a `drawFromBeneath` op.

8. **Archaic Glyphs' third secret** records "researched" into the campaign log through a `record` from a card script (the Researched gate of `engine-generic-keywords` reads it at the next upgrade).

9. **`ENGINE_VERSION` bump.**

## Risks / Trade-offs

- [Vocabulary sprawl: 40-odd new entries] → each has one unit test and two users or a stated reason; the proposal lists them so the apply step adds no others.
- [Replaying from the start of the scenario on every Time Warp] → the same cost as one Undo, which the app already pays; a test plays Time Warp after an investigate that drew a chaos token and checks the state against a replay of the shortened list.
- [Lola's filter touches every play, commit and use check] → one predicate `allowedForRole(inv, card)` with Neutral always true; the existing tests of other investigators run with `role` undefined.
- [Dependence on the campaign change's group 1 for `horrorOnYou`, parley costs and clues on cards] → four cards wait for it (03008, 03155, 03182a's sibling cards, 03237); the rest of the packs do not.
- [Researched cards without the log entry in a standalone game] → `engine-generic-keywords` defines the gate; a standalone deck treats the entry as absent.

## Migration Plan

Content and engine in one change per the task groups; `ENGINE_VERSION` bump (saved scenarios restart, campaigns kept). Rollback: revert.

## Open Questions

- **Lola Hayes's role and Hidden cards**: a Hidden weakness in Lola's hand is Neutral; confirmed readable in any role? Taken as yes (Neutral is always allowed).
- No in-force ADR needs revisiting.
