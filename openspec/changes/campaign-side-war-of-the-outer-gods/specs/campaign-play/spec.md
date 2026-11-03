## ADDED Requirements

### Requirement: War of the Outer Gods plays as printed

The campaign `side-war-of-the-outer-gods` SHALL be hand-written under `content/campaigns/` and its scenario SHALL set up, play and resolve as the printed Single Group rules say (ADR-0082). Setup: every investigator at Arkham (86014); one Cultist of Paradise (86025), one Hierophant of the Swarm (86027) and one Priest of Dying Stars (86029) at their spawn locations; the three faction sets, Pocket Portal (86052) and Hub Dimension (86024) set aside; the encounter deck of the remaining cards. Three agenda decks SHALL run at once: green (86005, 86006, 86007), blue (86002, 86003, 86004) and red (86008, 86009, 86010), each advancing when its own doom reaches its threshold, keeping excess doom, shuffling its faction's set-aside enemies into the encounter deck, adding its symbol token to the bag in standalone play, and the third agenda deck to advance flipping Hub Dimension. The campaign's chaos bag SHALL be the printed one on each difficulty: Easy `+1 +1 0 0 0 −1 −1 −1 −2 −2` with three skulls; Standard `+1 0 0 −1 −1 −1 −2 −2 −3 −4`; Hard `0 0 −1 −1 −2 −2 −3 −4 −5 −6`; Expert `0 −1 −2 −3 −4 −5 −6 −7 −8`; each with three skulls, auto-fail and elder sign, and cultist, tablet and elder thing only when an agenda back adds them.

#### Scenario: Setup

- **WHEN** War of the Outer Gods starts on Standard with two investigators
- **THEN** both are at Arkham, Cultist of Paradise, Hierophant of the Swarm and Priest of Dying Stars are each at their printed location, three agendas are face up (86005, 86002, 86008), Hub Dimension and Pocket Portal are set aside, the encounter deck holds no card of the three faction sets, and the bag holds no cultist, tablet or elder thing

#### Scenario: One faction advances

- **GIVEN** the blue agenda 86002 at its threshold with one doom over it
- **WHEN** doom is checked
- **THEN** 86003 is face up with 1 doom, the `swarm_of_assimilation` cards are shuffled into the encounter deck, a tablet token is in the bag, and the green and red agendas are unchanged

#### Scenario: The third advance flips the Hub

- **WHEN** each of the three agenda decks has advanced once and Hub Dimension is in play
- **THEN** Hub Dimension is on its other face and connected to the four Ritual Sites (86014, 86016, 86020, 86022)

### Requirement: War of the Outer Gods token effects

The reference card 86001 SHALL have real token effects on all four difficulties. Easy/Standard: skull −1 per clue the investigator has; cultist −3, on failure a mutation on the nearest Mutated enemy; tablet −3, on failure draw the top Hex of the encounter discard; elder thing −4, on failure one committed card goes beneath an Insect enemy as a swarm card. Hard/Expert: skull −2 per clue; cultist −4 and a mutation on each Mutated enemy; tablet −4 and the Hex drawn whether or not the test fails; elder thing −5 and every committed card beneath an Insect.

#### Scenario: Skull on Hard

- **GIVEN** an investigator with 3 clues on Hard
- **WHEN** the skull is revealed
- **THEN** the modifier is −6

#### Scenario: Elder thing on Standard

- **GIVEN** a test with two committed cards and Droning Horde (86048) in play
- **WHEN** the elder thing is revealed and the test fails
- **THEN** the player chooses one committed card and it is placed beneath Droning Horde as a swarm card

### Requirement: War of the Outer Gods resolutions

The scenario SHALL end in R1–R4 by the act and the faction defeated, earning the printed asset for the investigators' decks (86051–86055) and 2 bonus experience on R1; in R5–R7, each of which kills every investigator; and, when no resolution is reached, in the resolution of the faction in the lead, computed from the agendas' doom without asking. Offered as a side story by a host campaign the scenario SHALL cost 3 experience; started on its own it SHALL cost nothing.

#### Scenario: No resolution

- **GIVEN** the green agenda deck furthest advanced
- **WHEN** the investigators are all eliminated
- **THEN** the campaign screen shows the green faction's resolution without asking which faction led

#### Scenario: Resolution 1

- **WHEN** the scenario ends in R1
- **THEN** each investigator earns 2 bonus experience and the printed asset is added as an earnable card
