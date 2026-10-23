## ADDED Requirements

### Requirement: Keyword glossary

The card details column and the card detail modal SHALL explain, below the card text, each keyword the card has (Hunter, Retaliate, Alert, Aloof, Massive, Surge, Peril, Fast, Patrol, Elusive, Swarming, Concealed, Exceptional, Myriad, Bonded, Permanent, Seal, Uses, Victory), in one or two sentences worded after the rules reference, in the game's locale (English, or Russian after the Russian rules reference). A keyword is found in the card's keyword list or as a keyword line of its text. Cards without keywords show no glossary.

#### Scenario: Hunter enemy

- **WHEN** the details of the Ghoul Priest are shown in Russian
- **THEN** below its text, "Охотник", "Мститель" and "Победа" are each explained in a sentence

#### Scenario: No keywords

- **WHEN** the details of the Machete are shown
- **THEN** no glossary appears
