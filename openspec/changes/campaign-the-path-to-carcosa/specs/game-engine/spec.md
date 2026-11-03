## ADDED Requirements

### Requirement: Parley with costs and a window

A Parley action SHALL be able to require a condition on the investigator (resources at least N, cards in hand at least N), to cost 2 actions, resources or cards discarded from hand, and to resolve without a test. After a parley resolves the engine SHALL open a `parleyed` window naming the investigator and the card, so cards may react ("after you parley at this location").

#### Scenario: A gated parley

- **GIVEN** Jordan Perry with 2 clues at an investigator's location who has 9 resources
- **WHEN** they look at their actions
- **THEN** Jordan's parley is not offered; with 10 resources it is, and taking it moves his clues to the investigator

#### Scenario: After you parley

- **GIVEN** an investigator in the Ballroom
- **WHEN** they parley with a Bystander there
- **THEN** the Ballroom's reaction is offered after the parley resolves

### Requirement: Clues on enemies and assets

Clues SHALL be placeable on enemies and on assets in play, readable by conditions and amounts, convertible to doom on the same card, and takeable: an effect SHALL move all clues from a card to an investigator ("take control of the clues") and defeating an enemy with clues SHALL give them to the investigator who defeated it when the card says so. The X sources "highest doom on an enemy" and "doom on enemies" SHALL count enemies only.

#### Scenario: Fanatic

- **GIVEN** a Fanatic spawned at a location with 2 clues
- **WHEN** it spawns
- **THEN** 1 clue moves from the location onto it, it fights at +1 per clue, and defeating it gives its clues to the investigator

#### Scenario: Clues become doom

- **GIVEN** Echoes of the Past's agenda and a Cultist with 2 clues
- **WHEN** the mythos phase begins
- **THEN** no doom is placed on the agenda, the Cultist's clues become 2 doom, and the agenda's threshold counts them

### Requirement: Costs and limits keyed to a location

A location SHALL be able to raise the cost of cards in the hand of investigators there, SHALL be able to require a flat number of clues from the entering investigator alone, SHALL be able to forbid entering while unrevealed unless an act lifts it, and an enemy SHALL be able to be in play at no location, attacking from there as its card says.

#### Scenario: Lighting Box

- **GIVEN** an investigator at the Lighting Box with a 2-cost event
- **WHEN** they look at what they can play
- **THEN** the event costs 4 there and 2 after they leave

#### Scenario: Patient Confinement

- **GIVEN** an investigator with 1 clue next to an unrevealed Patient Confinement
- **WHEN** they move there
- **THEN** they spend their clue; with none they cannot move there

#### Scenario: The King in Yellow

- **GIVEN** Hastur as The King in Yellow in play
- **WHEN** the enemy phase begins
- **THEN** he attacks every investigator, is at no location, and no investigator can fight him

### Requirement: Damage sources, victory spawns and remembered facts

An enemy SHALL be able to accept damage only from cards of named traits or from encounter effects; an enemy SHALL be able to spawn from the victory display; a scenario SHALL record facts the cards call "remember" and count them for objectives; a script SHALL be told whether an act advanced by clues, by its objective or by doom; the agenda deck SHALL be resettable to its first card with its doom cleared.

#### Scenario: Poltergeist

- **GIVEN** a Poltergeist engaged with an investigator holding a Machete
- **WHEN** they fight with the Machete
- **THEN** no damage is dealt; a Spell asset's attack damages it

#### Scenario: Encore

- **GIVEN** Royal Emissary in the victory display and Curtain Call's agenda 2
- **WHEN** the agenda advances
- **THEN** the agenda deck returns to 1a with 3 doom and Royal Emissary spawns again

#### Scenario: Four of six remembered

- **GIVEN** The Unspeakable Oath's act 3 and three remembered actions
- **WHEN** an investigator performs a fourth
- **THEN** the act's objective is met
