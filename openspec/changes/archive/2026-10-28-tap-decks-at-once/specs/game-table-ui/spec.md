## MODIFIED Requirements

### Requirement: Tap decks to draw setting

The settings SHALL offer "Tap decks to draw", on by default and saved with the other settings, with a hint under it saying what off does (cards are drawn by themselves, nothing to tap). Every scenario the UI starts SHALL ask the engine for tapped decks, so a draw in play is always a recorded "draw" choice; the setting decides who answers it:

- while it is on, the deck waits for the drawing investigator's tap as today: the deck glows, the instruction bar says which deck to tap, and on the phone the drawer's handle glows and the bar offers a Draw button;
- while it is off, the UI SHALL answer the choice itself as soon as it appears, in the same update that produced it: nothing glows, no instruction or Draw button is shown, the table does not switch to the drawing investigator for it, and the cards leave the deck and fly as they do after a tap.

The setting SHALL apply at once in the running game: turning it off while a deck is waiting draws at once; turning it on makes the next draw wait. The automatic answer is recorded like a tap, so saves, bug reports and replays give the same game, and Undo's limits are unchanged (a draw reveals hidden information). A save or imported log whose setup never asked for tapped decks keeps drawing without a choice, whatever the setting.

On the phone layout, where the piles are in the left drawer, the drawer's handle SHALL glow while a deck waits for a tap and the instruction bar SHALL offer a Draw button that chooses the same option, so the drawer needn't be opened. The bar's instruction, its Draw button ("Draw" or "Draw an encounter card") and the piles' names are in the player's language.

#### Scenario: Setting off

- **WHEN** "Tap decks to draw" is off and Roland's upkeep draw comes
- **THEN** the card flies from his deck to his hand without any deck glowing, no "Tap your deck" instruction and no Draw button, and the game's recorded choices hold the draw

#### Scenario: Turned off while a deck waits

- **GIVEN** the setting is on and the encounter deck is waiting for Roland's tap in the mythos phase
- **WHEN** he turns the setting off in the menu and returns to the table
- **THEN** the encounter card is drawn at once and shows in the showcase, with no tap

#### Scenario: Turned on mid-game

- **GIVEN** the setting was off when the scenario started
- **WHEN** the player turns it on and Roland's next upkeep draw comes
- **THEN** his deck glows and waits for the tap

#### Scenario: Save with a waiting draw

- **GIVEN** a save made with the setting on while Roland's deck waited for a tap
- **WHEN** it is loaded with the setting off
- **THEN** the draw happens on load and the table shows the card in his hand

#### Scenario: Replay

- **WHEN** a game played with the setting off is replayed from its setup and recorded choices
- **THEN** it reaches the same state, draws included

#### Scenario: Phone

- **WHEN** a draw waits on a phone with the setting on
- **THEN** the left drawer's handle glows and the instruction bar's Draw button draws the card
