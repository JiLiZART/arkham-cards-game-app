## Why

Playing the table after the last five changes (svg-icons, skill-test-screen, hand-cards-glance, player-bar, new-game-flow) turned up six regressions and one rules gap that make a game stall or look wrong: a treachery's test can leave the screen with instructions and no button, the bottom-left stat bar is gone, the hand count shows a word instead of an icon, the clue and resource tokens lost their cardboard art, an empty Flashlight sits in play forever, and abandoning a campaign leaves a dead Continue button. They are fixed together because they were reported together and each is small.

## What Changes

- **Stat bar back in the bottom-left** for the investigator on screen, at 75 % of its former size: the token row (resources, clues, hand count) above it, portrait, ability, health, sanity and skills in it. The player bar and its avatar sheet stay.
- **Hand count as an icon plus number**: a small player card back and the count, at the clue and resource totals' size, never a text label. It no longer depends on the icon sprite having the symbol.
- **Clue and resource icons return to the PNG token art** wherever they appear: the 5/3/1 resource and 3/1 clue stacks in the stat bar, clue piles on locations, the rail, the feed, the glance chips and the hand details. The chaos bag and every other icon stay in the sprite.
- **A test by someone other than the active investigator opens on their table.** The pulsing avatar hand-off is only for helping another's test or a reaction. When another investigator can act, the instruction bar carries a button that switches to them, so the bar never shows an instruction with no way to answer it.
- **An asset whose only abilities need its uses leaves play when the last use is spent** (Flashlight's supplies, .45 Automatic's ammo, Shrivelling's charges), after the ability resolves. **Rules deviation**, chosen on purpose: the printed rules keep the empty card in play, where it can do nothing.
- **Abandoning a campaign hides Continue**: the title offers Continue only while there is a game, a campaign or a save at that moment.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: the stat bar returns (smaller) with the hand count; the test screen for a non-active investigator; the instruction bar when another can act; the title after abandoning. Deltas: ADDED "Stat bar" (it is REMOVED by the unarchived player-bar change, so this change re-adds it), MODIFIED "Instruction bar", MODIFIED "Someone else can act" (from player-bar), MODIFIED "Title screen and settings" (from new-game-flow).
- `game-iconography`: clue and resource icons are PNG token art again, with stacks. Deltas: MODIFIED "Stats and tokens use icons", MODIFIED "Icon sprite" (from svg-icons).
- `game-engine`: ADDED "Assets with uses leave play when empty".

Several modified requirements live in finished but unarchived changes (svg-icons, hand-cards-glance, player-bar, new-game-flow). Archive those before this one, in their order, so the deltas apply to the merged specs.

## Impact

- UI: `src/ui/hud/Stats.tsx` (StatBar returns, HandCount), `Hud.tsx`, `fan.ts` (`STAT_BAR_W`), `styles.css`, `src/ui/players.ts` (`canAct`, `landingView`), `src/ui/hud/ActionRail.tsx` (instruction bar), `src/ui/menu/Title.tsx`, `src/ui/TokenPile.tsx`, `src/ui/hud/tokenStack.ts` (restored), `src/ui/icons.ts`.
- Assets: `public/icons/{resource,resource-3,resource-5,clue,clue-3}.png` restored from git history; `scripts/extract-assets.sh` map lines; icon tests and `check:content` expectations.
- Engine: `src/engine/rules/cards.ts` (uses exhausted → a trailing discard step, also covering `discardWhenEmpty`). Deterministic and replayable as before; no save format change.
- Scripts and docs: `check-players.js`, a new `check-treachery-test.js`, `check-wizard.js` (abandon), README play notes.
