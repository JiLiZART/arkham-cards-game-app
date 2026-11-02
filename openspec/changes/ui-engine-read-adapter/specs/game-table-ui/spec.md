## ADDED Requirements

### Requirement: The stat bar and the player bar agree

The stat bar, the player bar's avatars and the avatar sheet SHALL take an investigator's health and sanity remaining, their maximums, resources, clues and hand size from one summary of that investigator, so that the same numbers show everywhere at the same moment.

#### Scenario: Damage seen twice

- **GIVEN** Roland Banks is on screen with 2 damage
- **WHEN** the table shows his stat bar and the player bar
- **THEN** both show health 7 of 9

#### Scenario: A raised maximum

- **GIVEN** an effect raises Daisy Walker's maximum sanity by 1
- **WHEN** the table shows her avatar and her stat bar
- **THEN** both show the raised maximum
