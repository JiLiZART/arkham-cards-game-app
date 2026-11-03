## ADDED Requirements

### Requirement: The Dunwich Legacy content

The content SHALL hold The Dunwich Legacy as a hand-written campaign under `content/campaigns/the-dunwich-legacy/` (`generated: false`) with its prologue, 8 scenarios in play order (Extracurricular Activity, The House Always Wins, The Miskatonic Museum, The Essex County Express, Blood on the Altar, Undimensioned and Unseen, Where Doom Awaits, Lost in Time and Space), Armitage's Fate and The Survivors as interludes, and the epilogue. Each scenario SHALL set up as the campaign guide and its setup card print (including choices made at random and by the campaign log), carry the chaos token effects of all four difficulties from its printed scenario card, connect its locations as the printed connection symbols say, have a scenario script, and end in each resolution the guide names, with "no resolution" routed where the guide routes it. The campaign log entries the guide records from the state of the table (Brood escaped, the sacrificed, the Necronomicon stolen, who cheated, the act reached, investigators killed) SHALL come from the scenario, not from a question to the player.

#### Scenario: Extracurricular Activity sets up by the log

- **GIVEN** a campaign in which The House Always Wins was completed first
- **WHEN** Extracurricular Activity starts
- **THEN** the Faculty Offices in play are "The Hour is Late" and "The Night is Still Young" is not in the game, the Quad, Orne Library, Humanities, Science Building, Student Union and Administration are in play, everyone starts at the Quad, and the Quad connects to all five others

#### Scenario: The House Always Wins with no resolution

- **WHEN** The House Always Wins ends because the agenda deck ran out
- **THEN** the campaign plays Resolution 1: the log records "bone to pick", "Dr. Francis Morgan was kidnapped" and, if the cheat ability was used, "cheated"

#### Scenario: Museum setup draws one office of each kind

- **WHEN** The Miskatonic Museum starts
- **THEN** exactly one Administration Office (02130 or 02131) and one Security Office (02128 or 02129) are in play beside the Entrance and the Halls, and the Exhibit deck holds the Restricted Hall among the bottom three of six halls

#### Scenario: The Essex County Express adds a difficulty token for the campaign

- **GIVEN** a Hard campaign
- **WHEN** The Essex County Express starts
- **THEN** a −4 token is added to the chaos bag, the leftmost of six random train cars is revealed with every investigator there, and the −4 is still in the bag in Blood on the Altar

#### Scenario: A defeated investigator on the train

- **WHEN** an investigator is defeated in The Essex County Express while holding the Necronomicon (02140) and the scenario reaches Resolution 1
- **THEN** their deck gains Across Space and Time, they earn 1 bonus experience, and the log records that the Necronomicon was stolen

#### Scenario: Blood on the Altar reads the kidnapped

- **GIVEN** a log where Dr. Henry Armitage and Dr. Francis Morgan were kidnapped
- **WHEN** Blood on the Altar starts and the first agenda advances
- **THEN** one of Armitage, Morgan, Zebulon Whateley or Earl Sawyer is placed beneath the agenda deck at random, and at the end the log lists everyone beneath the agenda deck as sacrificed to Yog-Sothoth

#### Scenario: Undimensioned and Unseen counts the Brood

- **GIVEN** three names sacrificed to Yog-Sothoth
- **WHEN** Undimensioned and Unseen starts
- **THEN** one Brood of Yog-Sothoth is in play and two are set aside, and when the scenario ends the log's Brood-escaped count equals the Brood in play plus set aside, without asking

#### Scenario: Where Doom Awaits picks its act by the log

- **GIVEN** the Necronomicon was recovered and not stolen, and Silas Bishop was not restored
- **WHEN** Where Doom Awaits starts
- **THEN** the act deck holds Act 2 version III, the Base of the Hill connects to the Ascending Path and to each Diverging Path and not to Sentinel Peak, and one Diverging and one Altered Path are out of the game

#### Scenario: Lost in Time and Space ends the campaign

- **WHEN** Lost in Time and Space ends with no resolution while act 2 is current
- **THEN** the campaign plays Resolution 4, and every investigator defeated during the scenario is killed

#### Scenario: The epilogue reads the townsfolk

- **GIVEN** the players chose to calm the townsfolk before Undimensioned and Unseen
- **WHEN** the epilogue runs
- **THEN** it shows the calmed-townsfolk branch
