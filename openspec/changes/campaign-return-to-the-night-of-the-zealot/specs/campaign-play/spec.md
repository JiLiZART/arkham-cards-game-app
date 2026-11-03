## ADDED Requirements

### Requirement: Return to the Night of the Zealot content

The content SHALL hold Return to the Night of the Zealot as a hand-written campaign under `content/campaigns/return-to-the-night-of-the-zealot/` with Return to The Gathering, Return to The Midnight Masks and Return to The Devourer Below in that order. Each SHALL set up as its base scenario does and then as its setup card (50011, 50025, 50032a) says, use the box's replacement sets (Ghouls of Umôrdhoth for Ghouls, The Devourer's Cult for Dark Cult), play the full act and agenda decks with their Return-to versions, use its base scenario's chaos token table on all four difficulties, run its base scenario's script extended by the box's rules, and end in the base scenario's resolutions with the base campaign's log keys, so a later Return scenario reads what an earlier one recorded. The campaign flow SHALL be empty as the base one is.

#### Scenario: Return to The Gathering sets up

- **WHEN** Return to The Gathering starts
- **THEN** the Study (50013) is in play with every investigator there, exactly one Attic and one Cellar are set aside and the other two are out of the game with 01108, 01111 and 01112, the Hallway, Parlor, Field of Graves, Ghoul Pits, Ghoul Priest and Lita Chantler are set aside, and act 50012 is on the table with 01109 and 01110 beneath it

#### Scenario: Through the Hole in the Wall

- **GIVEN** three clues spent on act 50012 by investigators in the Guest Hall
- **WHEN** the act advances
- **THEN** the Hallway (50017) enters play, the chosen investigator moves there and reveals it, the set-aside Attic, Cellar and Parlor enter play connected to the Hallway, and act 01109 later advances on the Hallway as in the base scenario

#### Scenario: Return to The Gathering to Resolution 1

- **GIVEN** the Ghoul Priest defeated and the Parlor's resign used
- **WHEN** the players burn the house
- **THEN** the log records `houseBurned`, the lead earns Lita Chantler and 1 mental trauma, and everyone earns victory plus 2 experience, as in the base campaign

#### Scenario: Return to The Midnight Masks reads the log

- **GIVEN** a Return campaign whose log has `houseBurned` and `ghoulPriestAlive`, with three players
- **WHEN** Return to The Midnight Masks starts
- **THEN** Your House is out of play, the investigators start at Rivertown, the Ghoul Priest is in the encounter deck, the cultist side deck holds 5 of the 8 cultists, agenda 1 is 01121a or 50026a, one Downtown, Southside, Easttown, Northside, Rivertown and Miskatonic University are each one of their two versions, and a Disciple of the Devourer is at Southside and one at Downtown

#### Scenario: Return to The Midnight Masks resolutions

- **WHEN** the agenda's doom ends Return to The Midnight Masks
- **THEN** the log records the unique Cultists in the victory display under `cultistsInterrogated`, the rest under `cultistsGotAway` and `pastMidnight`, crosses out `ghoulPriestAlive` when the Ghoul Priest is in the victory display, and ending with no resolution goes to Resolution 1 as in the base campaign

#### Scenario: Return to The Devourer Below sets up

- **WHEN** Return to The Devourer Below starts with 3 cultists who got away
- **THEN** the Main Path and four of the ten woods are in play, one Agents set is in the deck, the agenda has 2 doom, and the Vault of Earthly Demise is attached to the set-aside Umôrdhoth

#### Scenario: Return to The Devourer Below ends the campaign

- **WHEN** Umôrdhoth is defeated
- **THEN** Resolution 2 records `umordhothRepelled`, gives 2 physical and 2 mental trauma to each investigator and victory plus 10 experience, and the campaign ends won

#### Scenario: Chosen without the partly-implemented note

- **WHEN** Return to the Night of the Zealot is selected on the new-game screen
- **THEN** no partly-implemented note is shown and its chaos bags are the Night of the Zealot ones

### Requirement: Return to the Night of the Zealot connections

Return to The Gathering SHALL connect the Guest Hall (50014) to the Study (50013), Bedroom (50015), Bathroom (50016) and Hallway (50017); the Hallway to the Attic in play (01113 or 50018), the Cellar in play (01114 or 50020) and the Parlor (01115); Attic 50018 to Field of Graves (50019); and Cellar 50020 to Ghoul Pits (50021); every connection two-way. Return to The Midnight Masks SHALL use the base scenario's connections with each Return location (50027, 50028, 50029, 50030) connected as the location it replaces. Return to The Devourer Below SHALL connect the Main Path to every woods in play and to the Ritual Site, the Ritual Site to the Main Path only, and each woods to its printed partner woods when both are in play: Great Willow 50033 with Lakeside 50034, Corpse-Ridden Clearing 50035 with Wooden Bridge 50036, and the base woods in their printed ring (Unhallowed Ground 01150 with Old House 01152 and Cliffside 01153; Twisting Paths 01151 with Old House 01152 and Tangled Thicket 01154; Tangled Thicket 01154 with Quiet Glade 01155; Quiet Glade 01155 with Cliffside 01153).

#### Scenario: The base Attic in Return to The Gathering

- **GIVEN** the base Attic (01113) kept at setup
- **WHEN** the Hallway is revealed
- **THEN** the Attic connects to the Hallway only, and Field of Graves never enters play

#### Scenario: The Return Attic in Return to The Gathering

- **GIVEN** Attic 50018 kept at setup
- **WHEN** an investigator moves from the Hallway to the Attic and reveals it
- **THEN** Field of Graves enters play connected to the Attic, and moving to it from the Attic is a move action

#### Scenario: Woods in Return to The Devourer Below

- **GIVEN** Great Willow, Lakeside and two base woods in play
- **WHEN** an investigator at Great Willow lists their move options
- **THEN** they are the Main Path and Lakeside; from the Ritual Site, once in play, the only move is to the Main Path

### Requirement: Replacement encounter sets as a Night of the Zealot option

A new Night of the Zealot campaign SHALL offer the option to use the Return to the Night of the Zealot replacement encounter sets, chosen when the campaign is created, off by default and unchanged for the rest of the campaign. With the option on, each scenario SHALL gather Ghouls of Umôrdhoth in place of Ghouls and The Devourer's Cult in place of Dark Cult; Cult of Umôrdhoth is not part of the option.

#### Scenario: Option on

- **GIVEN** a Night of the Zealot campaign created with the replacement sets option on
- **WHEN** The Gathering starts
- **THEN** the encounter deck holds Grave-Eater, Acolyte of Umôrdhoth and Chill from Below and no card of Ghouls; The Midnight Masks then draws its Acolytes from The Devourer's Cult's 1-health Cultists

#### Scenario: Option off

- **GIVEN** a Night of the Zealot campaign created with the option off
- **WHEN** any of its scenarios starts
- **THEN** the encounter deck holds the base sets and no card of the two replacement sets
