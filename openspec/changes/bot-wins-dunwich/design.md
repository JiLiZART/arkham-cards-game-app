## Context

The bot (`src/engine/bot.ts`, ~440 lines) picks one option per pending choice. `objective()` reads the current act's text (locations named, clues asked, "resigned", an encounter card's Objective), and `turnChoice()` ranks the turn's options: abilities that name the goal, moving toward the goal, investigating while the group is short of clues, fighting clear wins or named enemies, otherwise evading. It is used by the Auto-play button, by `src/engine/replays/` (`pnpm search:games`, `pnpm record:games`) and by `src/engine/__tests__/dunwichPlaythrough.test.ts`, which pins a winning seed for 6 of the 8 Dunwich scenarios (Roland and Daisy, Standard, Blood on the Altar on Easy).

Two scenarios are never won (seeds 1–250, Easy included):

- **Undimensioned and Unseen** (act 2): every Brood of Yog-Sothoth (02255) must be defeated. Once it has clues, only Esoteric Formula (02254, `onlyAttackableBy` on the Brood, willpower + 2 per clue) can damage it. The bot never fetches or uses the Formula on purpose, and Roland and Daisy die first.
- **Where Doom Awaits** (acts 2–3): Sentinel Peak (02284) costs clues to enter (`moveInClues`), clues come mostly from the Altered paths, and act 3 asks clues spent at the Peak with Seth Bishop (02293) present. The bot spends clues as soon as an act lets it and never holds them for the move.

In-force ADRs that bear on this: 0025 (the engine organised by game concept with one-way imports: the bot stays in `src/engine` and reads through queries), 0022 (cards and investigators read through views: the bot never touches `game.s`), 0013 (a card works by its printed lines: coverage is measured on content, not on the bot), 0039 and 0041 (scenario cards as instances; the map per location instance, which the bot's routing reads). The replay corpus that records bot games has no ADR of its own. None needs revisiting.

## Goals / Non-Goals

**Goals:** the bot wins Undimensioned and Unseen and Where Doom Awaits on a pinned seed each, on Standard, with an empty campaign log and a suitable core starter team; the strategy additions are general (read from card data) and help any scenario with the same shapes; the bot stays legal and deterministic.

**Non-Goals:** a strong or optimal player; winning Blood on the Altar on Standard; per-cycle strategy for later campaigns; any rules change.

## Diagram (C4-inspired, component level, ASCII; the engine is one container)

```
 content/ (card data)                     src/engine
 +-------------------------+      +---------------------------------------------------+
 | cards: onlyAttackableBy |----->| bot.ts                                            |
 |        moveInClues      |      |  objective(game)  -- act text, encounter Objective |
 | scenario: botHint?      |      |   + needs: { card to fetch, clues to hold,         |
 +-------------------------+      |              enemy to wait for }                   |
                                  |  turnChoice()     -- ranks options by the needs    |
                                  |  botChoice()      -- one legal option per choice   |
                                  +----------------------+----------------------------+
                                                         | queries.ts / context.ts (read only)
                                                         v
                                  +---------------------------------------------------+
                                  | engine state (createGame / dispatch)              |
                                  +---------------------------------------------------+
            used by: Auto-play (UI) | replays/ search + record | dunwichPlaythrough.test.ts
```

## Decisions

1. **`objective()` returns needs, not only goals.** Beside the goal locations and enemies it already returns, it adds: a _key card_ (the card an enemy's `onlyAttackableBy` names, when that enemy is a goal or threatens the bot), _clues to hold_ (the largest `moveInClues` of a goal location not yet entered), and a _presence_ condition (an enemy the act names that must be at the spend location). `turnChoice()` ranks options against them: play the key card, search or draw toward it, attack the guarded enemy only with it; don't spend clues below the hold while the move is ahead; wait at the spend location until the named enemy is there. _Alternative:_ a planner over future turns — rejected, far more code than the two shapes need.
2. **A scenario hint only where data is silent**, as an optional field in the scenario file (e.g. `botHint: { investigateFirst: [codes] }` for the Altered paths, if reading clues per location is not enough). Each hint is listed in the tasks and has a test; the schema gains the field only if one is needed. _Alternative:_ hard-code by scenario id in `bot.ts` — rejected: not data, and the bot would know scenario ids.
3. **Team per scenario in the test**: the playthrough may use any core starter team. Undimensioned and Unseen is expected to want a willpower investigator (Agnes Baker 01004 or Wendy Adams 01005) to carry the Formula; Where Doom Awaits a clue gatherer pair. The pinned seeds name their team.
4. **Seeds are found offline** (a script loop or `pnpm search:games` with a seed range, up to 1000) and pinned; the test runs only pinned seeds, under about 10 s for the new cases.
5. **The replay corpus follows the bot.** If choices change, `pnpm search:games` and `pnpm record:games` rerun; Night of the Zealot's bot games must keep at least their current resolutions (6), checked before re-recording.

## Risks / Trade-offs

- [The new priorities make the bot worse elsewhere (hoarding clues in a scenario where it should spend)] -> the hold applies only while a goal location with `moveInClues` is not yet entered; the 6 existing wins stay pinned and must still pass.
- [No seed wins even with the new strategy] -> the user's decision: report what blocks it and close.
- [Corpus churn hides a regression] -> compare resolutions reached per scenario before and after re-recording, in the report.

## Migration Plan

Engine-internal; no save format change, no `ENGINE_VERSION` bump (the bot doesn't change rules). `campaign-the-dunwich-legacy` task 11.3 is narrowed to the six wins and the browser run, and points here.

## Open Questions

- Whether a hint field is needed at all is decided during implementation; the default is none.
