## Purpose

Defines playable investigators and their decks: stats, abilities, signature cards and weaknesses, deck validation, and the five core-set starter decks.

## ADDED Requirements

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

#### Scenario: Weakness in opening hand
- **WHEN** an investigator draws a weakness in the opening hand
- **THEN** it is set aside, replaced with a new card, and shuffled back after the mulligan

### Requirement: Core starter decks
The system SHALL ship ready-to-play decks for Roland Banks, Daisy Walker, "Skids" O'Toole, Agnes Baker and Wendy Adams using the core-set starter deck lists, all passing validation.

#### Scenario: Pick a starter
- **WHEN** a player selects Wendy Adams
- **THEN** her starter deck including Wendy's Amulet and Abandoned and Alone is loaded
