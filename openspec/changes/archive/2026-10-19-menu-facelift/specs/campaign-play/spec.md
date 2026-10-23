## ADDED Requirements

### Requirement: Campaign tiles

Each campaign on the new-game screen SHALL show its first scenario's reference card art as a preview, the campaign name, a description, the number of scenarios and, for a generated campaign, the partly-implemented note. The description SHALL be the campaign's prologue from the campaign guide in the game's language (an epigraph for most campaigns) followed by the names of its scenarios, with a "More" control that shows the whole prologue when it is longer than a paragraph; a campaign without a prologue (a side scenario) SHALL use its scenario's intro. The text SHALL be available before the campaign's scenarios are loaded.

#### Scenario: The Dunwich Legacy in Russian

- **WHEN** the locale is Russian and the new-game screen is open
- **THEN** The Dunwich Legacy's tile shows the Extracurricular Activity card art, "Наследие Данвича", the Russian epigraph from "Ужас Данвича", the names of its 8 scenarios, and the number 8

#### Scenario: Read the whole prologue

- **WHEN** the player taps "More" on the tile of a campaign whose prologue is several paragraphs
- **THEN** the full prologue is shown, and the tile is not selected by that tap
