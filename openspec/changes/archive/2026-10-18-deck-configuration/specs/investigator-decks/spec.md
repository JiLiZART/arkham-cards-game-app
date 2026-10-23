## ADDED Requirements

### Requirement: Deck configuration

From the new-game deck step, the player SHALL be able to edit a chosen deck into a custom deck: the deck is shown as a list grouped by type (assets, events, skills) with each card's cost, copies and glance chips, and the signature cards and weakness slot apart; the player may remove up to 5 cards and add cards from the pool of level-0 cards of the investigator's classes and neutral that the loaded packs contain and the deck rules allow, keeping the investigator's deck size. The editor SHALL show the deck's validation result in plain words as it changes and MUST NOT save an invalid deck. A starter deck is never modified; saving creates a custom deck.

#### Scenario: Swap two cards

- **WHEN** Roland's starter deck is edited: Flashlight ×2 removed and Physical Training ×2 added
- **THEN** the deck stays at 30 cards, the editor shows it valid, and saving creates a custom deck with the change

#### Scenario: Too many swaps

- **WHEN** the player has removed 5 cards and tries to remove a sixth
- **THEN** the editor refuses and says the limit is 5

#### Scenario: Invalid deck

- **WHEN** the player adds a third copy of a card
- **THEN** the editor shows "three copies of Machete; the limit is two" and Save is disabled

### Requirement: Choosing the basic weakness

The editor SHALL let the player choose the deck's basic weakness from the loaded basic weaknesses, or leave it random. A chosen weakness is used at campaign start instead of the random one.

#### Scenario: Chosen weakness

- **WHEN** a custom deck names Paranoia as its weakness and a campaign starts with it
- **THEN** Paranoia is the deck's basic weakness, and no random one is added

### Requirement: Custom decks saved

Custom decks SHALL be saved on the device under a name (default "<investigator> · <date>") and offered beside the starter decks in later new games; the deck step SHALL allow renaming and deleting them. A saved deck SHALL be validated again when offered, and one that no longer validates (a pack removed) SHALL be shown with the reason and not selectable.

#### Scenario: Reuse a custom deck

- **WHEN** the player saved "Roland · 17 Oct" and starts another campaign
- **THEN** the deck step offers "Roland · 17 Oct" next to Roland's starter deck
