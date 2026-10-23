## ADDED Requirements

### Requirement: Tapped draws

A game whose setup asks for tapped decks SHALL wait, before each draw from an investigator's deck or from the encounter deck during play, for a pending choice of the drawing investigator with a single "draw" option that names the deck and the number of cards; the cards leave the deck only when it is chosen. One choice covers a multi-card draw from one effect ("draw 2 cards"). Draws during setup (opening hands, the mulligan redraw) SHALL NOT wait. The choice is recorded like any other, so replaying the same setup and choices gives the same game; the bot chooses "draw". Setups that don't ask for tapped decks, including the engine tests' default and saves made before this change, never wait and replay unchanged. A wait after the scenario has ended is skipped.

#### Scenario: Upkeep draw waits

- **WHEN** in a tapped-decks game the upkeep phase reaches Roland's draw
- **THEN** the pending choice is Roland's "draw" for his deck, 1 card, and his hand is unchanged
- **WHEN** "draw" is chosen
- **THEN** he draws 1 card and the upkeep continues

#### Scenario: Mythos draws in turn

- **WHEN** in a tapped-decks game with Roland and Daisy the mythos phase reaches the encounter draws
- **THEN** Roland's "draw" for the encounter deck is pending; after it, Daisy's

#### Scenario: Two cards, one tap

- **WHEN** an effect has Daisy draw 2 cards
- **THEN** one "draw" for her deck, 2 cards, is pending, and both are drawn when it is chosen

#### Scenario: Old save

- **WHEN** a save made without tapped decks is loaded
- **THEN** its choices replay to the same state as before, with no waits
