## Why

A player with Flesh Ward in play was hit by an enemy, picked the "Flesh Ward" button, and the card was discarded with its 4 charges unused. The button was the damage-assignment prompt: any asset with health or sanity can soak a point, Flesh Ward has health 1, so one point defeated it. Flesh Ward's own ability (exhaust and spend a charge to cancel 1 damage or horror from an enemy attack) isn't written, and the engine has no moment at which damage can be prevented before it is assigned, so it can't be written yet. The button also said only the card's name, so soaking looked like using the card.

A scan of all 5,859 generated cards found that the data fields the engine needs are already read: `uses` becomes tokens on the card, an ability's `cost.uses` spends them, `health` and `sanity` make an asset a soak target, and so on. What is missing on the 322 cards with uses is the abilities that spend them: 8 are written, all in the core set. The healing ones are the ones a player feels at once: the supplies or charges sit on the card and nothing can spend them.

## What Changes

- **Damage can be prevented when it is dealt.** When an enemy attack deals damage or horror to an investigator, a reaction window opens before the points are assigned, and a new effect prevents some of it (damage, horror, or either, the player choosing). Flesh Ward is written with it: exhaust, spend 1 charge, cancel 1 damage or horror just dealt by that attack.
- **The assignment prompt says what it does.** Each soak option reads "Assign 1 damage to Flesh Ward" (or horror), with "(defeated)" when that point would defeat the asset, in English and Russian, on the instruction bar and on the card's button in the strip.
- **The healing uses-cards are written**, in data, with tests: Clarity of Mind (level 0 and 3), Smoking Pipe, Painkillers, Strange Solution, First Aid (level 3), Healing Words (level 0 and 3), Sinha's Medical Kit, Extra Rations and Canteen. Each card's whole ability is "spend uses (with exhaust, or taking damage or horror, where printed): heal". Two small engine additions they need: an ability cost that takes damage (as one that takes horror exists), and a heal that can target an Ally asset as well as an investigator.
- **Left out and listed**, because their abilities carry more than a heal: Liquid Courage (a test), Book of Psalms (bless tokens), Thermos (trauma condition), Kerosene (an enemy defeated this round), Bandages (a reaction to another card's damage), Occult Records (a test and a random discard), Expedition Gear and Laudanum (a second ability), Grimm's Fairy Tales, Earthly Serenity, Surgical Kit, Archive of Conduits, Lucky Charm, Do No Harm, and the Edge of the Earth partners.
- Coverage moves for their packs (`npm run coverage`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: Damage, horror and defeat: a reaction window when an enemy attack deals damage or horror, before assignment, in which damage or horror can be prevented; soak options labelled with what they do and whether the asset would be defeated.
- `card-content`: Data-driven card effects: an ability cost can take damage; a heal can target an Ally asset at the location or one you control; the listed healing and warding cards have their abilities.

## Impact

- `src/engine/rules/investigators.ts` (`AssignDamage`: the window for enemy attacks, the prevented points, the option labels), `src/engine/effects.ts` (`preventDamage`, `heal` on an Ally asset), `src/engine/rules/cards.ts` (`cost.takeDamage`), `src/content/schema.ts` (the trigger, the effect, the cost, the heal target).
- `content/packs/{investigator,dwl,return,ptc,tde,eoe}/cards.json`: the 12 cards' abilities; `content/i18n/{en,ru}/ui.json`: the assignment labels and the abilities' labels.
- `content/coverage.json` regenerated; `docs/campaign-program.md` counts for the packs touched.
- `ENGINE_VERSION` 2 → 3: a saved game replays its actions, and the new window and abilities add prompts a replay of an older save wouldn't expect; as for every rules change, a save from version 2 keeps its campaign and restarts the scenario in progress.
