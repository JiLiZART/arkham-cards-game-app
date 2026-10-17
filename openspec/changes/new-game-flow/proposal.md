## Why

The menu is one long desktop form: a campaign select, a difficulty select that hides two of the four bags, a grid of investigator cards with a deck dropdown, settings under it. A phone player gets no introduction and no sense of what a difficulty means. Card games open with a wizard: one decision per screen, big tap targets, the choice shown rather than named.

## What Changes

- **A new-game wizard.** Title screen (Continue, New campaign, How to play, a gear for settings), then one screen per decision: campaign (a large art card per campaign, a carousel when more than one), investigators (avatar tiles, tap to add up to four, the order tapped is the turn order shown as P1 to P4 badges), decks (per investigator, the starter decks and any saved custom decks as cards; "Edit" opens the deck configuration from the `deck-configuration` change when it lands, otherwise the picker alone), difficulty, and a ready screen (the chosen avatars in order, the bag, the first scenario's name and icon, Begin). Back on every step; the state survives going back.
- **Difficulty shown as the bag.** Four cards, easy to expert, each drawing its tokens as chaos tokens grouped by kind with counts, plus one derived line: the average modifier. Hard and expert are shown; nothing is hidden.
- **Avatars everywhere a character is chosen.** The investigator tiles, the ready screen and the campaign log use the round portrait with the class ring, the same as the location markers.
- **Settings behind the gear**: language, privacy, draw by hand, pace, tips, reset tips, music and effects. The campaign log screen keeps its content and takes the wizard's visual style.

Out of scope: deck editing (its own change), the in-game player bar, the phone layout of the table (the wizard is built phone-first, so it needs no second pass).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-table-ui`: the menus become a wizard; difficulty is shown as its bag.

## Impact

- `src/ui/Screens.tsx` split into `src/ui/menu/` (Title, CampaignStep, InvestigatorsStep, DecksStep, DifficultyStep, ReadyStep, Settings, HowTo, CampaignLog) with a `wizard.ts` (pure step state: picks, order, validation); `src/ui/store.ts` (`screen` values for the steps; `newCampaign` unchanged); `src/ui/chaos.ts` (`groupTokens` reused, an `averageModifier` added); `Portrait` reused for avatars; `styles.css` (`.wizard`); `content/i18n/{en,ru}/ui.json` (step titles, hints, difficulty blurbs).
- `MenuScreen` consumers: `App.tsx`; the drive scripts start games through the store and are unaffected.
