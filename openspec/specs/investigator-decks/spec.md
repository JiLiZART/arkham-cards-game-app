# investigator-decks Specification

## Purpose
Defines playable investigators and their decks: stats, abilities, signature cards and weaknesses, deck validation, and the five core-set starter decks.

## Requirements

### Requirement: Investigator definition
Each investigator SHALL be defined in data with willpower, intellect, combat, agility, health, sanity, traits, a reaction/free ability, an Elder Sign effect, deckbuilding rules, signature card(s) and signature weakness.

#### Scenario: Roland stats
- **WHEN** Roland Banks is loaded
- **THEN** he has willpower 3, intellect 3, combat 4, agility 2, health 9, sanity 5


### Requirement: Deck lists as files
Decks SHALL be stored as files listing investigator code and card codes with quantities. A deck MUST also be importable from an ArkhamDB deck JSON export.

#### Scenario: Import ArkhamDB deck
- **WHEN** a user provides an ArkhamDB deck export JSON
- **THEN** it is converted to the deck format and validated


### Requirement: Deck validation
The system SHALL validate a deck against the investigator's deckbuilding rules: deck size, faction/level access, copies limit, required signature cards and weaknesses. Invalid decks MUST be rejected with the reasons listed.

#### Scenario: Too many copies
- **WHEN** a deck contains three copies of a card with deck limit 2
- **THEN** validation fails naming that card


### Requirement: Starting a scenario with a deck
At scenario start each investigator SHALL shuffle their deck with signature cards and one random basic weakness (selected at campaign start), draw 5 cards, set aside drawn weaknesses and redraw them, gain 5 resources, and may take one mulligan.

During the mulligan the investigator picks cards to redraw one at a time. Until they confirm the redraw, each picked card SHALL be offered to be taken back, which un-picks it; it is then offered for picking again. Only confirming redraws the picked cards. Picking and taking back are ordinary recorded choices, so saved games and action-log replays stay exact. The bot MUST NOT take back a pick.

#### Scenario: Weakness in opening hand
- **WHEN** an investigator draws a weakness in the opening hand
- **THEN** it is set aside, replaced with a new card, and shuffled back after the mulligan

#### Scenario: Take back a pick
- **WHEN** Roland picks Machete and Flashlight for redraw, then takes Machete back, then confirms
- **THEN** only Flashlight is redrawn and Machete stays in his hand

#### Scenario: Picked card offered again
- **WHEN** Roland takes back a picked card
- **THEN** the mulligan choice is asked again, with that card among the cards he can pick and the confirm option counting one fewer card


### Requirement: Core starter decks
The system SHALL ship ready-to-play decks for Roland Banks, Daisy Walker, "Skids" O'Toole, Agnes Baker and Wendy Adams using the core-set starter deck lists, all passing validation.

#### Scenario: Pick a starter
- **WHEN** a player selects Wendy Adams
- **THEN** her starter deck including Wendy's Amulet and Abandoned and Alone is loaded


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
