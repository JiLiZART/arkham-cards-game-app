## Why

Players live in three places: the viewer's stat dock bottom-left, the other investigators' tokens down the right edge, and the turn portraits in the ribbon. There is no way to look at a teammate on purpose, and when a teammate may act (commit to your test, play a fast card) the whole screen is taken by the hand-off box. A card game keeps every player in one bar, lets you tap one to look, and tells you when someone else has a move.

## What Changes

- **One player bar at the top.** Every investigator as an avatar in turn order, with health and sanity under it, action pips during their turn, the active one ringed, defeated or resigned greyed. The ribbon's phase pills stay beside it. The stat dock and the right-edge tokens go; the viewer's details (ability text, skills, resources, clues, hand count) open as a sheet when their own avatar is tapped.
- **Tap an avatar to look.** Tapping another investigator's avatar switches the table to their view: their play area in the strip, their markers lit, their hand only if hands are not private or it is their decision and they have taken the device. The deciding player's choices stay reachable only while viewing the deciding player; a "back to Roland" control returns, and the view snaps back when the decision passes to someone else.
- **"Someone else can act."** When the pending decision belongs to a player other than the one whose turn it is (a commit to another's test, a reaction with a fast card), that avatar pulses with a short label ("Daisy can commit cards", "Daisy may react"); tapping it is the hand-off. The full-screen "Pass to" box remains the way a hidden hand is revealed.
- **Avatars wherever an investigator is an option**: choosing an investigator (next turn, a card's target, spawn engaged) lights the avatars in the bar, and tapping one answers.

Out of scope: the phone layout of the bar (phone-landscape keeps it as the one bar), the new-game wizard's avatars (new-game-flow).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-table-ui`: hot-seat play and the investigators' display become the player bar with view switching and the "can act" signal; the stat bar and the right-edge tokens are removed.

## Impact

- New `src/ui/hud/PlayerBar.tsx` (avatars, counts, pips, can-act, sheet), `src/ui/players.ts` (pure: bar model, who can act, view rules); `view.ts` gains `viewing`; `viewerOf` stays the decider; `HandFan.tsx`, `Panels.tsx` (`PlayStrip`), `Table.tsx` (markers) read the viewed investigator; `Stats.tsx` and `Investigators.tsx` reduced to the sheet and the modal; `Ribbon.tsx` loses the turn portraits; `optionHome.ts` (`portrait`/`invModal` homes become `bar`); `Hud.tsx` (`HandOff` tied to the can-act tap), `styles.css`, strings.
- Depends on `hand-cards-glance` landing first if both are applied: the hand count it adds to the stat bar moves into the sheet here.
