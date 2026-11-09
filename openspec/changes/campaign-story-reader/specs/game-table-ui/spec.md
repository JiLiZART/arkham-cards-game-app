## MODIFIED Requirements

### Requirement: Scenario introduction

When the last investigator's mulligan is confirmed in a new scenario, the game SHALL introduce the scenario before play starts:

1. The agenda card is shown large in the centre of the dimmed screen, at least 300 px wide at 1080p, with the scenario name above it. The scenario's intro text is not shown here: it is read in the story reader before the scenario is set up (see story-reader).
2. After the player clicks Continue (or presses Space or Enter), the agenda flies to its place in the act/agenda panel.
3. The act card is shown the same way, without the intro text.
4. After Continue, the act flies to its place.
5. The starting locations are then dealt onto the table (see Location dealing and flips).

The introduction SHALL fit the screen at every size the game supports: the card shrinks on short screens; Continue and Skip stay within the screen. During the introduction, no game option can be chosen. The introduction plays once per scenario. A game loaded from a save, or imported from a log, after the mulligan doesn't play it. While a scenario is in its mulligan, the act/agenda panel is empty and the table has no locations; both appear through the introduction. The texts are in the player's language.

#### Scenario: The Gathering begins

- **WHEN** Roland keeps his hand in The Gathering
- **THEN** "The Gathering" and the agenda "What's Going On?!" appear large in the centre, without the intro text. After Continue, the agenda flies to the panel and the act "Trapped" appears. After Continue, it flies to the panel and the Study is dealt onto the table.

#### Scenario: Two investigators

- **WHEN** Roland and Daisy both finish their mulligans
- **THEN** the introduction plays once, after Daisy's mulligan, and then play continues with the first turn

#### Scenario: Loaded game

- **WHEN** a player reloads the page during round 1
- **THEN** no introduction plays; the act, agenda and locations are in place

#### Scenario: A long intro

- **WHEN** Machinations Through Time is introduced at 1600×900, and again on a phone at 852×393
- **THEN** the Continue and Skip buttons are on screen, no intro text is shown, and the card is at least 300 px wide at 1600×900

#### Scenario: Guide markup rendered

- **WHEN** a scenario whose intro contains `<center><fancy>June 1926</fancy></center>` is introduced
- **THEN** the introduction shows the agenda and act only; the intro, with its markup rendered, was read in the story reader before setup
