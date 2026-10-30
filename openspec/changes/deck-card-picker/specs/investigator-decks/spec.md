## MODIFIED Requirements

### Requirement: Deck configuration

The new-game deck step SHALL show, in three rows: the picked investigators as avatars with their class and whether their deck is ready (a click switches to that investigator); that investigator's decks as tabs like a browser's (their starter decks, then their saved decks, then a "+" tab that starts a new deck holding only the signature cards and the weakness slot); and the deck of the tab on show, which is the deck that investigator brings. The deck area SHALL show the deck across the whole width as a grid of card images, at least 150 px wide, grouped by type with the copies of each, the signature cards and weaknesses apart. Hovering a card of the deck offers Replace and Remove.

The cards the investigator may take SHALL open in a card picker: a dialog over a scrim on the desktop, the whole screen on the phone, with a title, a search, filters by class (icons), type and level, and a Close control; Escape closes it, and so does a tap on the scrim on the desktop. The picker's cards SHALL be bigger than the deck's: at least 200 px wide on the desktop and 150 px on the phone. The deck's **Add cards** control opens the picker with every card the investigator may take; each offers Add, disabled with the reason when it can't go in, and the picker stays open so several can be added. A deck card's **Replace** opens the picker titled "Replace <card> with…", listing only the cards that may stand in for one copy of it (the swap adds no deckbuilding problem; the card itself is not listed); a tap on one, or its Replace, swaps one copy and closes the picker. When no card can stand in, the picker says so.

The basic weakness is chosen there or left random. The deck's problems SHALL be shown in plain words as it changes, and Continue SHALL wait while a picked investigator's deck has any. A starter deck is never modified: the first change to it makes a new saved deck, named "<investigator> · <date>" (numbered when the name is taken), whose tab opens; a saved deck is kept as it is edited.

#### Scenario: Build Zoey from empty

- **WHEN** the player opens a "+" tab for Zoey Samaras and adds 30 Guardian and neutral cards of level 0 with at most two copies each from the picker
- **THEN** the deck is valid with her signatures and a basic weakness, it is saved as a deck of hers, and Continue is enabled

#### Scenario: A card she can't take

- **WHEN** the player looks at a level 0 Mystic card in Zoey's picker after adding five off-class cards
- **THEN** its Add is disabled with "up to 5 other level 0 cards"

#### Scenario: Replace a card

- **WHEN** the player chooses Replace on a Flashlight of Roland's starter deck and taps Extra Ammunition in the picker
- **THEN** the picker closes, a new tab "Roland · <date>" opens with Extra Ammunition in place of one Flashlight, still 30 cards and valid, and the starter deck tab is unchanged

#### Scenario: Only what can stand in

- **WHEN** the player chooses Replace on a Machete of Roland's starter deck
- **THEN** the picker is titled "Replace Machete with…", lists the cards that keep the deck legal in its place, and lists neither Machete itself nor Flashlight, which already has two copies

#### Scenario: The deck takes the width

- **WHEN** the deck step opens at 1440×900
- **THEN** the deck's grid spans the whole width of the step, no card pool is shown beside it, and its cards are at least 150 px wide

#### Scenario: Swap two cards

- **WHEN** Roland's starter deck has Flashlight ×2 removed and Physical Training ×2 added
- **THEN** the deck stays at 30 cards and valid, in a new saved deck's tab, and the starter deck is unchanged

#### Scenario: Too many swaps

- **WHEN** the player has removed 5 cards from a starter deck and removes a sixth
- **THEN** the deck step allows it: there is no swap limit, only the deckbuilding rules

#### Scenario: Invalid deck

- **WHEN** the player adds a third copy of a card
- **THEN** Add is disabled with "three copies of Machete; the limit is two"
