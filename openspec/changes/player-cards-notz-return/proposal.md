## Why

The Return to the Night of the Zealot box brings 10 player cards (rtnotz 50001–50010): the five level-2 stat trainers, Hot Streak (2), Dynamite Blast (2), Barricade (3), Mind Wipe (3) and Rabbit's Foot (3). They are in the deck builder and none works: coverage reports rtnotz 10 of 10 player cards left (report `notz-return.md`, section 5). Six are the core cards' text at a higher level, so they are the smallest player-card change in the program and close the box's player side.

## What Changes

- **Every rtnotz player card works**, in `content/packs/return/cards.json` where the vocabulary fits and in `content/packs/return/scripts/<code>.ts` otherwise:
  - data, the core abilities copied: 50001 Physical Training (2), 50003 Hyperawareness (2), 50005 Hard Knocks (2), 50007 Arcane Studies (2), 50009 Dig Deep (2) (as 01017, 01034, 01049, 01062, 01077), 50006 Hot Streak (2) (as 01057: gain 10 resources);
  - script reuse: 50002 Dynamite Blast (2) runs the core Dynamite Blast's `blast` (`content/packs/core/scripts/01024.ts`) with `aoo: false` ("does not provoke attacks of opportunity");
  - script: 50008 Mind Wipe (3) extends the core Mind Wipe's `wipe` (`01068.ts`) with −1 to the enemy's damage and horror for the phase (the `enemyDamage`/`enemyHorror` modifiers exist);
  - 50004 Barricade (3): the core Barricade's data (attach, `nonEliteCannotMoveInto`, discard when an investigator leaves) plus a spawn redirect: a non-Elite enemy that would spawn at the attached location spawns at a connecting location of the player's choice instead, if able;
  - 50010 Rabbit's Foot (3): a reaction after a failed test that searches the top X cards, X the amount failed by: `searchDeck.top` accepts an `Amount` and the `skillTestFailed` window carries the margin as its X.
- **Vocabulary**: a `cannotSpawnAt` flag with scope `attachedLocation` whose redirect is a connecting location chosen by the player (Barricade (3); the same line is on later Barricades and on locations that forbid spawning); `searchDeck.top` as an `Amount` (Rabbit's Foot (3); Rabbit's Foot (0) and later "top X" searches).
- Coverage: rtnotz player cards 10 of 10; `docs/campaign-program.md` rtnotz player column at 0 left; `ENGINE_VERSION` bump.

Not in this change: the box's encounter cards and scenarios (`campaign-return-to-the-night-of-the-zealot`); By the Book's parallel Roland and the Directives (`player-cards-investigator-decks`, `campaign-side-by-the-book`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `card-content`: the 10 rtnotz player cards declared; the two vocabulary entries; the pack reported complete on the player side.

## Impact

- `content/packs/return/cards.json` (8 cards), `content/packs/return/scripts/50002.ts`, `50008.ts`; `content/i18n/{en,ru}/ui.json` ability labels.
- `src/content/schema.ts` (`cannotSpawnAt` flag, `searchDeck.top: Amount`), `src/engine/rules/enemies.ts` (spawn redirect under the flag), `src/engine/effects/search.ts` (`top` as an amount), `src/engine/index.ts` (`ENGINE_VERSION`).
- `content/coverage.json`, `docs/campaign-program.md`.
- No dependency on other changes: the core scripts and modifiers it reuses exist.

## Decided (assumed)

- The level-2 trainers and Hot Streak copy the core entries verbatim: same text, same abilities, no new labels beyond the card name.
- Dynamite Blast (2) and Mind Wipe (3) import the core script and reuse its `fns` rather than copy it, as Dynamite Blast (3) does in `content/packs/nat/scripts/60129.ts`.
- Barricade (3)'s "if able": with no connecting location the enemy spawns at the attached location after all (the card's own wording); the flag's redirect is a choice when two or more connecting locations exist.
- Rabbit's Foot (3) with X = 0 (a test failed by 0 cannot happen; a failure is at least 1) searches nothing and still exhausts: the reaction is offered only when the margin is at least 1.

## Decided (user)

- Parallel investigators (90024 Roland "The Fed", the Directives 90025–90029, 90030, 90031) are `player-cards-investigator-decks`', not this change's.
- A Permanent card already starts in play (`src/engine/index.ts`, the Permanent check in `createGame`); none of the 10 cards is Permanent, so nothing is needed here.

## Open questions

- None.
