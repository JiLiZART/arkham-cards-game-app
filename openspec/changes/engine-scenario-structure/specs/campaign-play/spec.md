## MODIFIED Requirements

### Requirement: Data-defined scenario setup

Each scenario SHALL define in data: encounter sets, set-aside cards, starting locations in play, starting location for investigators, act and agenda decks, chaos token effects per difficulty, and setup steps that may depend on the campaign log. The engine MUST perform setup from this data alone.

Setup data SHALL be able to say: several named act or agenda decks; an act or agenda entry with versions chosen by a log condition or at random; a random choice from a list (into play, set aside, as an act or agenda, the rest removed or set aside); N cards removed at random from a pile or a side deck; set-aside cards shuffled; N random set-aside cards into play; a side deck of locations; an encounter set whose locations go into the encounter deck; cards placed beneath a card; and the table rebuilt from a checkpoint's log entries.

#### Scenario: The Gathering setup

- **WHEN** The Gathering starts
- **THEN** only the Study is in play, all investigators start there, and the set-aside locations and Ghoul Priest are out of the encounter deck

#### Scenario: Log-dependent setup

- **WHEN** The Midnight Masks starts and the log records "Your house has burned to the ground"
- **THEN** the Rivertown setup variant is used instead of Your House

#### Scenario: One of two at random

- **WHEN** Return to The Gathering starts with "one of 01113 and 50018 set aside at random, the other removed"
- **THEN** exactly one of the two is set aside, the other is out of the game, and the same seed picks the same one on replay

#### Scenario: Three cultists removed at random

- **WHEN** Return to The Midnight Masks builds its cultist side deck of 8 with "3 removed at random"
- **THEN** the side deck holds 5 cultists

#### Scenario: Agenda 1 at random

- **WHEN** Return to The Midnight Masks starts with agenda 1 as one of 01121a and 50026a
- **THEN** the chosen card is the agenda, the other's back is set aside, and the rest of the agenda deck follows

### Requirement: Resolutions

Each scenario SHALL define its resolutions (including "no resolution was reached") in data: the story text and the flow steps that follow it (log entries to record, cards added to decks, experience bonuses, trauma, choices for the players, and the next scenario). When the scenario ends the engine MUST apply the matching resolution by running its steps through the campaign flow on the campaign screen: the text is read, each prompt answered, and the flow then reaches the next scenario or the campaign's end. A hand-written scenario may keep its resolution's effects as a plain list; they run as one `effects` step.

A resolution SHALL be able to be a checkpoint: it records the table into the campaign log, awards no experience and runs no upgrade, and the flow continues to the next part. The facts the scenario hands the flow SHALL include which investigators resigned and which were defeated.

#### Scenario: Resolution applied

- **WHEN** The Gathering ends with Resolution 1
- **THEN** the log records the house was burned, Lita Chantler is added as an earnable card, and play proceeds to The Midnight Masks

#### Scenario: A resolution with a choice

- **WHEN** The House Always Wins ends with Resolution 2 and the players are asked who Dr. Francis Morgan joins
- **THEN** the campaign screen shows the resolution text, then the investigators as a choice, and the chosen investigator's deck gains the card

#### Scenario: A checkpoint between two parts

- **WHEN** a two-part scenario's first part ends at its checkpoint
- **THEN** the log holds what the table had, the investigators keep their experience unspent, and the next part is the flow's next scenario

#### Scenario: Resigned or defeated

- **WHEN** a scenario ends with no resolution because every investigator resigned or was defeated
- **THEN** the flow's "resigned" and "defeated" branches read the scenario's facts, without asking the players
