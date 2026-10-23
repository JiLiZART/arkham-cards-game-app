## MODIFIED Requirements

### Requirement: Basic actions

The engine SHALL implement the basic actions: Investigate, Move, Draw, Resource, Play, Activate, Fight, Engage, Evade (and Parley/Resign when granted by cards). Each costs 1 action unless a card says otherwise. Taking any action other than Fight, Evade, Parley or Resign while engaged with a ready non-aloof enemy MUST trigger an attack of opportunity from each such enemy.

An event whose play ability carries an action designator (Fight, Evade, Engage, Investigate, Move, Parley) SHALL be that action when played: it counts as it for abilities that count actions by kind, and a Fight, Evade or Parley event provokes no attack of opportunity. An ability declared as provoking no attack of opportunity SHALL provoke none, whatever its designator. An investigator's first action of their turn SHALL be known to conditions ("play only as your first action").

#### Scenario: Attack of opportunity

- **WHEN** an investigator engaged with a ready Ghoul takes the Draw action
- **THEN** the Ghoul attacks (deals its damage/horror) before the card is drawn

#### Scenario: A Fight event provokes none

- **GIVEN** Nathaniel engaged with a ready Ghoul Minion
- **WHEN** he plays Clean Them Out
- **THEN** he gains 2 resources, attacks the Ghoul Minion, and the Ghoul Minion makes no attack of opportunity

#### Scenario: Only as the first action

- **GIVEN** Mano a Mano in Nathaniel's hand, engaged with a ready enemy
- **WHEN** his turn begins
- **THEN** Mano a Mano is playable; after he takes any action it is not; playing it deals 2 damage to the engaged enemy and provokes no attack of opportunity

#### Scenario: Move to connected location

- **WHEN** an investigator moves to a location connected to their current one
- **THEN** they are placed there, unengaged enemies do not follow, engaged enemies move with them, and an unrevealed destination is revealed

### Requirement: Round structure

The engine SHALL run rounds in order Mythos → Investigation → Enemy → Upkeep, skipping the Mythos phase in the first round. Mythos: place 1 doom on the agenda, check doom threshold, each investigator draws an encounter card. Investigation: investigators take turns in an order chosen by the players, each with 3 actions. Enemy: hunter enemies move, then each engaged enemy attacks. Upkeep: ready exhausted cards, each investigator draws 1 card and gains 1 resource, discard down to 8 cards in hand.

The engine SHALL open a player window at each point the rules' flow chart marks one: after the encounter draws of the mythos phase, when the investigation phase begins, when an investigator's turn begins, after hunter enemies move, after each investigator's engaged enemies have attacked, and when the upkeep phase begins. In a player window any investigator MAY play a fast event printed as playable during any fast window, paying its cost; its effects resolve before the round goes on. A window in which no investigator holds such a card asks nothing. During their own turn an investigator plays such a card as any fast card.

#### Scenario: First round skips mythos

- **WHEN** a scenario starts
- **THEN** the first phase is Investigation and no doom is placed

#### Scenario: Upkeep hand size

- **WHEN** an investigator has 10 cards in hand at end of upkeep
- **THEN** they must choose and discard 2 cards

#### Scenario: Taunt before the enemies attack

- **GIVEN** Nathaniel with Taunt (3) in hand and 2 resources, two ready enemies at his location engaged with Daisy, at the start of the enemy phase
- **WHEN** the hunter enemies have moved
- **THEN** Nathaniel is offered to play Taunt; he engages both enemies, each takes 1 damage and he draws 2 cards, and the enemies then attack him, not Daisy

#### Scenario: Nothing to play

- **GIVEN** no investigator holds a card playable during any fast window
- **WHEN** the enemy phase begins
- **THEN** the hunter moves and the attacks follow with no new prompt

### Requirement: Enemies

The engine SHALL implement enemy spawning (at named location or engaging the drawing investigator), engagement, exhaustion on evade, damage and defeat (victory points to victory display), and keywords: Hunter, Retaliate, Aloof, Alert, Massive, Prey. Ready unengaged enemies at an investigator's location MUST engage that investigator.

When an investigator deals damage to an enemy (an attack, or a card's effect), the engine SHALL open a window before the damage is placed, naming the investigator, the enemy, the amount and the card dealing it. An effect in that window SHALL be able to add to the amount; a forced ability can react to it. An enemy whose card says it takes at most 1 damage at a time SHALL take 1, after any additions. When the damage placed exceeds the enemy's remaining health, the engine SHALL open a window naming the excess before the enemy is defeated.

After an enemy attacks an investigator, the engine SHALL open the attacked window even when the attack was cancelled, so cards that play "after an enemy attacks you, even if that attack was canceled" can.

#### Scenario: Hunter movement

- **WHEN** the enemy phase starts and an unengaged Hunter enemy is 2 locations away from the nearest investigator
- **THEN** it moves one location along the shortest path toward them

#### Scenario: Retaliate

- **WHEN** an investigator fails a Fight test against a ready Retaliate enemy
- **THEN** the enemy attacks that investigator

#### Scenario: Nathaniel's extra damage by an event

- **GIVEN** Nathaniel engaged with a Ghoul Minion (health 2)
- **WHEN** he plays Monster Slayer and the attack succeeds
- **THEN** before the damage is placed he may use his reaction; the Ghoul Minion takes 3 damage (1 + 1 Monster Slayer + 1 Nathaniel) and is defeated; the reaction is not offered again this phase

#### Scenario: Not by an event

- **WHEN** Nathaniel attacks with Boxing Gloves and succeeds
- **THEN** his reaction is not offered and the enemy takes 1 damage

#### Scenario: Tommy Malloy takes 1

- **GIVEN** Tommy Malloy engaged with Nathaniel
- **WHEN** Nathaniel plays Monster Slayer, succeeds and uses his reaction
- **THEN** Tommy Malloy takes 1 damage

#### Scenario: Excess damage

- **GIVEN** Relentless ready and a Ghoul Minion with 1 health left
- **WHEN** Nathaniel's attack deals it 3 damage
- **THEN** he may exhaust Relentless to place the 2 excess damage on it; discarding Relentless later gains him 2 resources

#### Scenario: Counterpunch after a cancelled attack

- **GIVEN** Counterpunch (0) and Dodge in Nathaniel's hand
- **WHEN** an enemy attacks him and he plays Dodge
- **THEN** he is still offered Counterpunch, and playing it attacks that enemy

### Requirement: Player cards in play

The engine SHALL support assets (slots: hand×2, arcane×2, accessory, body, ally, tarot; uses such as ammo/charges/secrets/supplies), events, skills, weaknesses (basic random and signature), exhaust/ready, fast cards, and triggered abilities (reaction, forced, free) with timing windows.

An asset whose data says its uses replenish SHALL have them restored to its printed count at the start of each round. An ability cost that spends a resource "from your resource pool or from the card" SHALL be payable from either, spending the card's first. A cost that places damage on the asset itself SHALL defeat and discard the asset when its damage reaches its health, after the ability resolves. An effect SHALL be able to grant an additional action usable only for one kind of action (Galvanize: fight), and to ready an asset the investigator controls chosen by filter.

#### Scenario: Slot limit

- **WHEN** an investigator with two hand-slot assets in play plays a third hand asset
- **THEN** they must choose an existing hand asset to discard

#### Scenario: Weakness drawn

- **WHEN** an investigator draws a weakness with a revelation effect
- **THEN** its revelation resolves immediately and it does not count toward hand size

#### Scenario: Physical Training replenishes

- **GIVEN** Physical Training (4) with 0 of its 2 resources left
- **WHEN** the next round starts
- **THEN** it has 2 resources, and it was never discarded for being empty

#### Scenario: Grete Wagner's last point

- **GIVEN** Grete Wagner (health 3) with 2 damage
- **WHEN** Nathaniel defeats an enemy and uses her reaction
- **THEN** he discovers 1 clue and Grete Wagner is discarded

#### Scenario: Galvanize's fight action

- **GIVEN** Galvanize played with Boxing Gloves exhausted
- **WHEN** it resolves
- **THEN** Boxing Gloves is ready, Nathaniel has one more action this turn, and that action can be spent on a Fight (basic, Boxing Gloves, or a Fight event) but not on Draw or Move
