## MODIFIED Requirements

### Requirement: Scenario and deck panels

The act and the agenda SHALL be shown as small landscape cards, the right way up, in a fixed panel at the top-left of the screen. Doom on the agenda, clues needed for the act, and any other tokens on them SHALL show on these cards.

Below them, a fixed column on the left side SHALL show these piles, each with its count:

- encounter deck, face down;
- encounter discard, top card face up;
- victory display;
- any scenario side decks;
- the viewing investigator's deck and discard.

Piles SHALL stay at their size and position while the map moves. Cards with a pending option tied to them SHALL be highlighted. A deck with a pending option that draws from it (the Draw action on the investigator's deck, a waiting draw on the investigator's deck or the encounter deck) SHALL be highlighted the same way, and tapping it chooses that option; the rest of the table dims as for any choice.

#### Scenario: Panels visible while panning

- **WHEN** the player zooms into the far corner of the map
- **THEN** the act, agenda and piles are still at the top-left and left of the screen

#### Scenario: Act ready to advance

- **WHEN** the act can be advanced
- **THEN** the act card in the top-left panel is highlighted

#### Scenario: Deck ready to draw

- **WHEN** it is Roland's turn with an action left
- **THEN** his deck pile is highlighted, and tapping it draws a card as the rail's Draw does

#### Scenario: Encounter deck waits

- **WHEN** the mythos phase waits for Roland's encounter draw
- **THEN** the encounter deck is highlighted, the map and hand dim, the instruction bar reads "Tap the encounter deck to draw", and tapping the pile draws the card, which then shows in the showcase as before

## ADDED Requirements

### Requirement: Tap decks to draw setting

The settings SHALL offer "Tap decks to draw", on by default and saved with the other settings; a new scenario starts with tapped decks when it is on. On the phone layout, where the piles are in the left drawer, the drawer's handle SHALL glow while a deck waits for a tap and the instruction bar SHALL offer a Draw button that chooses the same option, so the drawer needn't be opened. The bar's instruction, its Draw button ("Draw" or "Draw an encounter card") and the piles' names are in the player's language.

#### Scenario: Setting off

- **WHEN** "Tap decks to draw" is off and a scenario starts
- **THEN** draws happen without waiting, as before

#### Scenario: Phone

- **WHEN** a draw waits on a phone
- **THEN** the left drawer's handle glows and the instruction bar's Draw button draws the card
