## ADDED Requirements

### Requirement: Patrol

At the start of the enemy phase, before hunters move, each ready unengaged enemy with the Patrol keyword SHALL move to a connecting location along the shortest path toward its designated target, the target being resolved as a spawn expression against the locations in play (a location with a trait, the nearest card of a kind, the location with the most investigators), or by the scenario's `patrolTarget` hook when the card's words cannot be written as an expression. When several locations qualify, the lead investigator SHALL choose which the enemy patrols toward; when the enemy is already at its target's location or every step is blocked by a card ability, it SHALL NOT move. An effect SHALL be able to give an enemy Patrol for the scenario.

#### Scenario: Patrol toward the nearest Key Locus

- **GIVEN** a Patrol (nearest location with a Key Locus) enemy two moves from the only Key Locus
- **WHEN** the enemy phase starts
- **THEN** it moves one step along the shortest path before any hunter moves

#### Scenario: A tie goes to the lead

- **GIVEN** a Patrol enemy equally far from two qualifying locations
- **WHEN** the enemy phase starts
- **THEN** the lead investigator is asked which it patrols toward

#### Scenario: Blocked

- **GIVEN** a non-Elite Patrol enemy whose only step toward its target is a location non-Elite enemies cannot enter
- **WHEN** the enemy phase starts
- **THEN** it does not move

### Requirement: Relentless

After an enemy with the Relentless keyword attacks during the enemy phase, it SHALL ready and attack again once that phase.

#### Scenario: Two attacks

- **GIVEN** a Relentless enemy engaged with Roland
- **WHEN** enemies attack
- **THEN** it attacks Roland, readies, attacks again, and is exhausted after the second attack

### Requirement: Predator

After enemies attack in the enemy phase, each ready unengaged enemy with the Predator keyword at a location holding a non-Elite enemy of the trait the keyword names SHALL attack that enemy: the prey takes the predator's damage, and when it is defeated it is defeated "via the predator keyword", so abilities that trigger on that resolve.

#### Scenario: A predator feeds

- **GIVEN** Julia Stern (Predator, Civilian) ready and unengaged at a location with a Waterfront Civilian
- **WHEN** the enemy phase's attacks are done
- **THEN** Julia attacks the Civilian; it takes her damage; if defeated, a card that triggers on a defeat via the predator keyword triggers

### Requirement: Swarming

When an enemy with Swarming X enters play, the top X cards of the drawing investigator's deck (the lead's when no investigator drew it) SHALL be placed facedown beneath it as swarm cards. Each swarm card SHALL attack as an enemy with the host's fight, evade, damage and horror, and SHALL be attackable: damage to the host while it has swarm cards goes to a swarm card first, a defeated swarm card returns to the bottom of its owner's deck, and excess damage carries over to the next swarm card or the host. The host SHALL NOT be defeated while it has swarm cards. Host and swarm SHALL move, engage, exhaust and be evaded together. An effect SHALL be able to add swarm cards to a Swarming enemy.

#### Scenario: Swarming 2 enters play

- **WHEN** Daisy draws an enemy with Swarming 2
- **THEN** the top 2 cards of her deck are facedown beneath it, and in the enemy phase it attacks three times (host and two swarm cards)

#### Scenario: Damage goes to the swarm first

- **GIVEN** a host (health 3) with one swarm card
- **WHEN** an attack deals it 4 damage
- **THEN** the swarm card is defeated to the bottom of its owner's deck, the 3 excess go to the host and it is defeated

### Requirement: Hidden

A card with the Hidden keyword SHALL be added by its revelation to the drawing investigator's hand without being shown to the others. While there it SHALL count toward that investigator's hand size, its constant abilities SHALL be active, its forced abilities SHALL trigger and its actions SHALL be offered, as if it were in their threat area. It SHALL NOT be discarded from hand by any effect other than its own text; when discarded it goes to the encounter discard pile. A location SHALL be able to count hidden cards as more than one card for hand size.

#### Scenario: Whispers in Your Head

- **WHEN** Roland draws Whispers in Your Head (03084a)
- **THEN** it is in his hand, its constant ability applies, a discard-from-hand effect does not take it, and his hand size counts it

#### Scenario: Discarded by its own action

- **WHEN** Roland takes the hidden card's own discard action
- **THEN** it goes to the encounter discard pile

### Requirement: Veiled

At a location with the Veiled keyword and no clues, an investigator there SHALL be able to take an action to flip it and resolve its story side.

#### Scenario: Flip a veiled location

- **GIVEN** Roland at a Veiled Kadath location with no clues
- **WHEN** he takes its flip action
- **THEN** the location shows its story side, the story resolves, and the location then does what the story says

## MODIFIED Requirements

### Requirement: Player cards in play

The engine SHALL support assets (slots: hand×2, arcane×2, accessory, body, ally, tarot; uses such as ammo/charges/secrets/supplies), events, skills, weaknesses (basic random and signature), exhaust/ready, fast cards, and triggered abilities (reaction, forced, free) with timing windows.

An asset whose data says its uses replenish SHALL have them restored to its printed count at the start of each round. An ability cost that spends a resource "from your resource pool or from the card" SHALL be payable from either, spending the card's first. A cost that places damage on the asset itself SHALL defeat and discard the asset when its damage reaches its health, after the ability resolves. An effect SHALL be able to grant an additional action usable only for one kind of action (Galvanize: fight), and to ready an asset the investigator controls chosen by filter.

A unique card SHALL NOT be played or put into play while a card with the same title is in play; when a unique encounter card enters play, a player card in play with the same title SHALL be discarded. A "limit X per period" on a card's ability SHALL count uses of that copy since it last entered play: a card that leaves play and re-enters starts with its limit unused.

An effect SHALL be able to exile a card: it leaves the game and its owner's campaign deck. A card bonded to a card in an investigator's deck SHALL be created set aside for that investigator at setup, outside their deck, and effects SHALL be able to search those bonded cards and put one into play or into the hand.

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

#### Scenario: One copy of a unique card

- **GIVEN** Nathaniel with Grete Wagner (level 0) in play and Grete Wagner (level 3) in hand
- **WHEN** he chooses an action
- **THEN** playing the level 3 Grete Wagner is not offered

#### Scenario: A limit after leaving play

- **GIVEN** an asset whose ability is limited once per round, used this round, then returned to hand
- **WHEN** it is played again the same round
- **THEN** its ability can be used again

#### Scenario: Exiled

- **WHEN** Roland plays Devil's Luck (03157) and its effect exiles it
- **THEN** the card is out of the game, and the scenario's facts list it as exiled for Roland

#### Scenario: Bonded cards at setup

- **GIVEN** Hallowed Mirror (05313) in Daisy's deck
- **WHEN** the scenario starts
- **THEN** three Soothing Melody (05314) are set aside for Daisy, not in her deck, and Hallowed Mirror's ability can put one into her hand
