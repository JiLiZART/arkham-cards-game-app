## ADDED Requirements

### Requirement: Deck upgrades between scenarios

Between scenarios the campaign log SHALL offer Upgrade decks for each investigator: the deck area of the deck step (Deck configuration) opens on the campaign's deck with the investigator's unspent experience above it, and adding cards costs experience by the rules: a new card costs its level (at least 1), replacing a card with a higher-level version of the same title costs the level difference, an Exceptional card costs double, and Myriad copies come together for one price. The builder SHALL show the experience left, refuse what can't be paid, and keep the deck size and rules. Saving SHALL update the campaign's deck and experience; the next scenario uses the new deck.

#### Scenario: Upgrade a card

- **GIVEN** Roland has 5 experience after The Gathering
- **WHEN** the player replaces .45 Automatic with .45 Automatic (level 2) and adds nothing else
- **THEN** 2 experience is spent, 3 remain, and The Midnight Masks starts with the new card in Roland's deck

#### Scenario: Not enough experience

- **WHEN** Roland has 1 experience and the player tries a level 3 card
- **THEN** the builder refuses and says 3 experience are needed
