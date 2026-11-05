## ADDED Requirements

### Requirement: The Path to Carcosa plays start to end

The Path to Carcosa SHALL be a hand-kept campaign in `content/campaigns/the-path-to-carcosa/` with a scenario script for each of its eight scenarios. Its order SHALL be the printed one: prologue, Curtain Call, The Last King, Interlude I (Lunacy's Reward, read after The Last King's Resolution 1 and skipped after its Resolutions 2 and 3), Echoes of the Past, The Unspeakable Oath, Interlude II (Lost Soul, skipped after The Unspeakable Oath's Resolution 1), A Phantom of Truth, The Pallid Mask, Black Stars Rise, Dim Carcosa, Epilogue. Each scenario SHALL set up as its guide page says, including what depends on the campaign log and on the number of investigators, SHALL end with the resolution its cards name, and SHALL route a game that reached no resolution as the guide does. Coverage SHALL report every scenario of the campaign complete.

#### Scenario: Curtain Call setup and the random act

- **WHEN** Curtain Call starts with two investigators, one of them Lola Hayes
- **THEN** Theatre, Lobby, Balcony and Backstage are in play, the six Doorways, The Man in the Pallid Mask and Royal Emissary are set aside, Lola starts at Backstage and the others at the Theatre, and one of the three act 2 versions is chosen at random as the game begins, the other two never entering the game

#### Scenario: The Last King's Bystanders

- **WHEN** The Last King starts with three investigators
- **THEN** each of the five locations other than the Foyer holds one random Bystander with 4 clues, the five Sickening Reality cards are beneath the scenario reference card, Dianne Devine is set aside, and parleying with Jordan Perry is offered only to an investigator with 10 or more resources

#### Scenario: Echoes of the Past by floor

- **GIVEN** a log in which Sebastien Moreau was interviewed
- **WHEN** Echoes of the Past starts with two investigators
- **THEN** Entry Hall, both Quiet Halls and two Historical Societies per floor are in play, Entry Hall holds 2 clues, one Seeker of Carcosa is at a third-floor Historical Society, Mr. Peabody, The Tattered Cloak, Clasp of Black Onyx, Hidden Library, Possessed Oathspeaker and Sebastien are set aside, and the encounter deck holds the five Midnight Masks treacheries and none of its locations

#### Scenario: The Unspeakable Oath's piles and version

- **GIVEN** a log in which the Clasp of Black Onyx was taken
- **WHEN** The Unspeakable Oath starts on Hard
- **THEN** one Western and one Eastern Asylum Halls are in play, seven Monsters and seven Possessed or Lunatics are set aside out of the deck, act 2 is version I, and a −4 token is in the chaos bag for the rest of the campaign

#### Scenario: A Phantom of Truth by Conviction

- **GIVEN** a log with 3 Conviction and 1 Doubt and Jordan Perry interviewed
- **WHEN** A Phantom of Truth starts
- **THEN** act 1 is version II, Black Stars Rise and False Lead are out of the deck, one of each paired location is in play, the investigators start at Montparnasse with 3 extra resources, and each has a Lost Soul shuffled into their deck

#### Scenario: The Pallid Mask's catacombs

- **GIVEN** a log in which the investigators did not escape the gaze
- **WHEN** The Pallid Mask starts
- **THEN** a random Catacombs other than Tomb of Shadows and Blocked Passage is revealed as the start, the Catacombs deck has those two among its bottom five, and revealing a Catacombs puts the next cards of the deck into play in the directions it names

#### Scenario: Black Stars Rise's two decks

- **WHEN** Black Stars Rise starts
- **THEN** agenda 1a and agenda 1c are both in play, one of Flood Below or Vortex Above is removed at random with its locations, each investigator has a random basic weakness added, the difficulty token is in the bag, and doom placed by the mythos phase is placed on the agenda the players choose

#### Scenario: Dim Carcosa to its ending

- **GIVEN** a log with 7 Conviction, 2 Doubt, 4 Chasing the Stranger tallies and the path above opened
- **WHEN** Dim Carcosa starts and Hastur is later defeated
- **THEN** the investigators started at Dark Spires with 2 doom on agenda 1a and half their sanity in horror, act 2 was version III, an investigator with horror at their sanity was not defeated, and the scenario ends with Resolution 3

#### Scenario: No resolution routes

- **WHEN** Echoes of the Past, Black Stars Rise or Dim Carcosa ends with every investigator defeated
- **THEN** the campaign runs Resolution 4, Resolution 3, or Resolution 4 or 5 by Conviction against Doubt, respectively, and The Last King runs Resolution 1 if anyone resigned, else Resolution 2

### Requirement: Real token tables for The Path to Carcosa

Each of the eight scenarios SHALL carry the token effects its reference card prints for Easy, Standard, Hard and Expert, including the X sources (horror on you, shroud or base shroud of your location, highest doom on an enemy or agenda, doom on enemies or agendas, doom in play with a cap, distance from the start) and the results (place a Monster beneath the act, cancel committed skill cards, move Byakhee, lose resources by the amount failed, an enemy attacks you, doom on each agenda, automatic failure instead, a clue from the bank, lose an action).

#### Scenario: Curtain Call skull on Hard

- **GIVEN** an investigator with 2 horror on Hard
- **WHEN** the skull is revealed
- **THEN** the modifier is −2, and on Standard it would be −1

#### Scenario: The Unspeakable Oath elder thing

- **WHEN** the elder thing is revealed
- **THEN** the player chooses between placing a random set-aside Monster beneath the act deck and failing the test

#### Scenario: Black Stars Rise cultist on Expert

- **GIVEN** an enemy with 1 doom at the investigator's location
- **WHEN** the cultist is revealed during any test
- **THEN** the test automatically fails

### Requirement: The flow asks only what the table can't tell

A flow prompt whose answer the scenario knows SHALL be answered by the scenario script's record and not asked: which act 2 Curtain Call played and whether the box office was robbed, The Last King's interviewed and slain VIPs and clues on the act, Sebastien in the victory display, Daniel's state after The Unspeakable Oath, The Pallid Mask's Conviction or Doubt, and each investigator with a Possession in hand. "Remove all" of a token SHALL remove every copy.

#### Scenario: The Last King's experience

- **GIVEN** The Last King ended with 5 clues on the act and two investigators
- **WHEN** the resolution runs
- **THEN** 2 bonus experience is split as evenly as possible without a prompt for the count

#### Scenario: Possessed investigators

- **GIVEN** Dim Carcosa ends with Roland holding a Possession and Daisy none
- **WHEN** the epilogue runs
- **THEN** the Campaign Log lists Roland alone as possessed, and the epilogue is shown for him to read; with no one possessed it shows nothing
