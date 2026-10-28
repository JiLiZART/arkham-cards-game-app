## MODIFIED Requirements

### Requirement: Undo

The HUD SHALL offer an Undo button, and Ctrl/Cmd+Z, whenever the last recorded choice can be taken back. Undo removes the last choice and rebuilds the game from the scenario setup and the remaining choices, so the result is identical to never having made it. Pressing it again takes back the choice before that, and so on.

Undo cannot go past a choice that revealed hidden information: drawing a chaos token, drawing or revealing a card from any deck, looking at or searching a deck, shuffling, or anything else random. It also cannot go into the mulligan or the scenario introduction. When nothing can be undone the button is disabled, and its tooltip says why ("hidden information was revealed").

In an online room, Undo is enabled only on the browser of the player whose choice is the last move, and only until another move follows it. On every other browser it is disabled, and its tooltip names the player who can undo. The undo travels as a move, so every browser takes the choice back (see online-play).

After an undo:

- cards that changed place fly back, for example a committed card to the hand or a played asset to the fan;
- the action feed and journal drop the undone entries;
- event animations still waiting are dropped;
- when hands are private and the undo hands the choice to another investigator, the hand-off screen appears.

Undo is also recorded in the save, because the save holds the shortened list of choices.

#### Scenario: A committed card by mistake

- **WHEN** Roland fights the Ghoul and commits Vicious Blow
- **THEN** Undo is enabled
- **WHEN** he presses Undo
- **THEN** Vicious Blow is back in his hand and the commit window is still open

#### Scenario: Undoing the action itself

- **WHEN** Roland presses Undo again
- **THEN** the Fight action is not taken and his action count is restored

#### Scenario: Another investigator still to commit

- **WHEN** Daisy is still to commit to Roland's test after Roland pressed Done
- **THEN** Undo reopens Roland's commit window

#### Scenario: After the token

- **WHEN** the last commit window closes (the chaos token is drawn by that same choice, even while the draw animation is still to play)
- **THEN** Undo is disabled, and the tooltip says hidden information was revealed

#### Scenario: Online, another player's choice

- **GIVEN** an online room where Ben's Agnes made the last choice
- **WHEN** Ana looks at her Undo button
- **THEN** it is disabled, and its tooltip says only Ben can undo it

### Requirement: Hot-seat play

The UI SHALL support 1–4 investigators on one device. The deciding investigator's view (hand, play area, choices) is the default; any investigator can be looked at from the player bar. No screen SHALL stand between players: when the decision passes to another investigator, their view is shown at once, with the turn title (see Turn title) announcing them, and their hand is visible.

In an online room, a device holds only its own seats. The decision passing to an investigator held on this device behaves as above. When it passes to one held elsewhere, the device shows that investigator's table with "Waiting for <investigator>" in the instruction bar and offers no choices (see online-play). A device holding every seat plays exactly as hot-seat.

#### Scenario: Turn handoff

- **WHEN** Roland ends his turn and Agnes is next
- **THEN** "Agnes's turn" plays across the middle and Agnes's hand and play area are shown with her avatar marked in the bar, with nothing to press

#### Scenario: Turn passes to another device

- **GIVEN** an online room where Ana holds Roland and Ben holds Agnes
- **WHEN** Roland ends his turn
- **THEN** "Agnes's turn" plays on both devices; Ben's device offers Agnes's choices and Ana's shows "Waiting for Agnes"
