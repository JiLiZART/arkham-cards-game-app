## MODIFIED Requirements

### Requirement: Basic actions

The engine SHALL implement the basic actions: Investigate, Move, Draw, Resource, Play, Activate, Fight, Engage, Evade (and Parley/Resign when granted by cards). Each costs 1 action unless a card says otherwise. Taking any action other than Fight, Evade, Parley or Resign while engaged with a ready non-aloof enemy MUST trigger an attack of opportunity from each such enemy.

An event whose play ability carries an action designator (Fight, Evade, Engage, Investigate, Move, Parley) SHALL be that action when played: it counts as it for abilities that count actions by kind, and a Fight, Evade or Parley event provokes no attack of opportunity. An ability declared as provoking no attack of opportunity SHALL provoke none, whatever its designator. An investigator's first action of their turn SHALL be known to conditions ("play only as your first action").

When an investigator fails an attack against an enemy that is engaged with exactly one other investigator, the engine SHALL deal that enemy's attack damage (not its horror) to the investigator engaged with it, assigned as damage dealt by the enemy; an enemy with the massive keyword is the exception and deals nothing. An aloof enemy that is not engaged with an investigator SHALL NOT be attacked: the Fight action and fight effects do not offer it.

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

#### Scenario: A failed attack hits the engaged investigator

- **GIVEN** Daisy engaged with a Ghoul Minion (1 damage) at Roland's location
- **WHEN** Roland fights the Ghoul Minion and fails
- **THEN** Daisy is dealt 1 damage, which she may assign to her assets, and Roland takes nothing

#### Scenario: Not when the enemy is engaged with the attacker

- **WHEN** Roland fails an attack on a Ghoul Minion engaged with him
- **THEN** nobody is dealt damage by the failure

#### Scenario: An unengaged aloof enemy

- **GIVEN** an aloof enemy at Roland's location, engaged with nobody
- **WHEN** Roland chooses an action
- **THEN** he is offered to engage it but not to fight it

### Requirement: Skill tests

The engine SHALL resolve skill tests as: determine skill value and difficulty → commit cards from hand (matching icons, wild icons) → reveal a chaos token → apply token modifier and effects → compare total to difficulty (success if ≥) → apply results and committed cards' effects → discard committed cards. An auto-fail token MUST fail regardless of total; total skill MUST NOT drop below 0. The Elder Sign MUST trigger the investigator's Elder Sign ability.

While an investigator's commit window is open, the engine SHALL offer, for each card that investigator committed to this test, an option to take it back. Taking a card back SHALL return it to its owner's hand and remove its icons from the test value, and the same investigator's commit choice is asked again. Once that investigator chooses Done, their committed cards stay committed. Taking back is an ordinary recorded choice, so saved games and action-log replays stay exact. The bot MUST NOT take cards back.

The investigator performing the test MAY commit any number of eligible cards; each other investigator at that location MAY commit at most one, after which their window offers only Done and taking that card back. When a test automatically fails, the investigator's skill value for it counts as 0; when it automatically succeeds, its difficulty counts as 0; "succeeded by" and "failed by" are measured from those values. When an automatic result is known before the chaos token is revealed, no token is revealed and its effects do not resolve. Automatically evading an enemy exhausts and disengages it and counts as evading it, but is not a successful evasion: abilities that trigger after an enemy is evaded resolve, abilities that trigger after a successful evasion do not.

#### Scenario: Investigate success

- **WHEN** Roland (intellect 3) investigates a shroud-2 location and reveals a `-1` token
- **THEN** total 2 ≥ 2, the test succeeds and Roland discovers 1 clue from the location

#### Scenario: Auto-fail

- **WHEN** the tentacle token is revealed
- **THEN** the test fails even if skill exceeds difficulty

#### Scenario: Committed icons

- **WHEN** an investigator commits a card with two matching skill icons to their own test
- **THEN** their skill value increases by 2 for that test

#### Scenario: Take a committed card back

- **WHEN** Roland commits Vicious Blow to a fight test and then takes it back before choosing Done
- **THEN** Vicious Blow is in Roland's hand again, the test value no longer counts its icon, and Roland is asked again what to commit, with Vicious Blow among the options

#### Scenario: No take-back after Done

- **WHEN** Roland commits Vicious Blow and chooses Done
- **THEN** no later choice in that test offers to take Vicious Blow back

#### Scenario: Another investigator's card

- **WHEN** Roland commits Vicious Blow to his test and chooses Done, and Daisy, at his location, is then asked to commit
- **THEN** Daisy is not offered to take back Roland's Vicious Blow

#### Scenario: A helper commits one card

- **GIVEN** Daisy at Roland's location with two cards bearing a combat icon
- **WHEN** Roland fights and Daisy commits one of them
- **THEN** Daisy is offered only Done and taking her card back, not the second card

#### Scenario: Failing by the whole difficulty

- **WHEN** Roland reveals the auto-fail token on a willpower (3) test of Rotting Remains
- **THEN** he failed by 3 and takes 3 horror

#### Scenario: Succeeding by the whole value

- **WHEN** Nathaniel (combat 5) attacks with One-Two Punch (level 5) and commits Overpower (level 2)
- **THEN** no chaos token is revealed, the attack succeeds by 8 (5 + 3 icons against 0) and Overpower draws 2 cards

#### Scenario: Cunning Distraction is not a successful evasion

- **WHEN** Wendy plays Cunning Distraction against two enemies at her location
- **THEN** both are exhausted and disengaged; with Pickpocketing in play she may draw a card (it triggers after evading an enemy), but no ability that triggers after a successful evasion is offered

### Requirement: Round structure

The engine SHALL run rounds in order Mythos → Investigation → Enemy → Upkeep, skipping the Mythos phase in the first round. Mythos: place 1 doom on the agenda, check doom threshold, each investigator draws an encounter card. Investigation: investigators take turns in an order chosen by the players, each with 3 actions. Enemy: hunter enemies move, then each engaged enemy attacks. Upkeep: ready exhausted cards, each investigator draws 1 card and gains 1 resource, discard down to 8 cards in hand.

The engine SHALL open a player window at each point the rules' flow chart marks one: after the encounter draws of the mythos phase, when the investigation phase begins, when an investigator's turn begins, after hunter enemies move, after each investigator's engaged enemies have attacked, and when the upkeep phase begins. In a player window any investigator MAY play a fast event printed as playable during any fast window, paying its cost; its effects resolve before the round goes on. A window in which no investigator holds such a card asks nothing. During their own turn an investigator plays such a card as any fast card.

In the upkeep phase the player window comes when the phase begins, before exhausted cards are readied. Lasting effects that last "until the end of the round" SHALL expire when the round ends, before abilities that resolve "at the end of the round".

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

#### Scenario: The upkeep window comes before readying

- **GIVEN** Nathaniel with an exhausted Boxing Gloves and a fast card in hand playable in any player window
- **WHEN** the upkeep phase begins
- **THEN** the player window is offered while Boxing Gloves is still exhausted, and it readies afterwards

#### Scenario: Until the end of the round

- **GIVEN** Skids played On the Lam this round and Dissonant Voices is in his threat area
- **WHEN** the round ends
- **THEN** On the Lam's effect has expired before Dissonant Voices' "at the end of the round" ability resolves

### Requirement: Enemies

The engine SHALL implement enemy spawning (at named location or engaging the drawing investigator), engagement, exhaustion on evade, damage and defeat (victory points to victory display), and keywords: Hunter, Retaliate, Aloof, Alert, Massive, Prey. Ready unengaged enemies at an investigator's location MUST engage that investigator.

When an investigator deals damage to an enemy (an attack, or a card's effect), the engine SHALL open a window before the damage is placed, naming the investigator, the enemy, the amount and the card dealing it. An effect in that window SHALL be able to add to the amount; a forced ability can react to it. An enemy whose card says it takes at most 1 damage at a time SHALL take 1, after any additions. When the damage placed exceeds the enemy's remaining health, the engine SHALL open a window naming the excess before the enemy is defeated.

After an enemy attacks an investigator, the engine SHALL open the attacked window even when the attack was cancelled, so cards that play "after an enemy attacks you, even if that attack was canceled" can.

In the enemy phase each enemy SHALL exhaust as soon as its own attack (and every ability the attack triggered) has resolved, before the next enemy attacks; a massive enemy exhausts after its last attack.

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

#### Scenario: Exhausted after its own attack

- **GIVEN** Roland engaged with a Ghoul Minion and an Acolyte
- **WHEN** the Ghoul Minion's attack in the enemy phase has resolved
- **THEN** the Ghoul Minion is exhausted while the Acolyte has not yet attacked

### Requirement: Damage, horror and defeat

The engine SHALL assign damage and horror to investigators and their assets with health/sanity (player chooses assignment), defeat an investigator whose damage ≥ health or horror ≥ sanity, record physical/mental trauma, and remove the investigator from the scenario. If all investigators are defeated or resign the scenario MUST end with the matching resolution.

When an enemy attack deals damage or horror to an investigator, the engine SHALL open a reaction window for that investigator before any point is assigned, naming the attacking enemy and how much damage and horror were dealt. An effect SHALL be able to prevent part of what was dealt: a number of points of damage, of horror, or of either (the player choosing which when both were dealt). Prevented points are not assigned to anyone; when every point is prevented, nothing is assigned.

Each option of the assignment prompt SHALL say what it does: "Assign 1 damage to <card>" (or horror), for the investigator and for each asset that can soak it, and for an asset that point would defeat, "(defeated)" after it. The labels SHALL be in the game's language.

When an investigator must draw from an empty deck and their discard pile is empty, they SHALL be defeated at once and suffer 1 mental trauma. When an investigator is eliminated, each weakness they own that is in play (or in their hand) and has a "when the game ends" ability SHALL resolve that ability, then leave the game.

#### Scenario: Investigator defeated

- **WHEN** Daisy (sanity 9) takes her 9th horror
- **THEN** she is defeated, her cards leave play, her clues drop at her location, and she gains 1 mental trauma

#### Scenario: Flesh Ward cancels a point

- **GIVEN** Nathaniel Cho with Flesh Ward in play, ready, with 4 charges
- **WHEN** a Ghoul Minion's attack deals him 1 damage and 1 horror
- **THEN** before anything is assigned he may use Flesh Ward; he chooses horror; Flesh Ward exhausts and keeps 3 charges; only the 1 damage is assigned

#### Scenario: Not from an attack

- **GIVEN** Flesh Ward in play, ready
- **WHEN** a treachery's revelation deals Nathaniel 1 horror
- **THEN** no window for Flesh Ward opens and the horror is assigned as usual

#### Scenario: Soaking says it defeats the asset

- **GIVEN** Flesh Ward in play (health 1) and an enemy attack dealing 1 damage that Flesh Ward did not prevent
- **WHEN** the assignment prompt asks who takes the damage
- **THEN** the options read "Assign 1 damage to Nathaniel Cho" and "Assign 1 damage to Flesh Ward (defeated)"

#### Scenario: Nothing left to draw

- **GIVEN** Roland with no cards in his deck or his discard pile
- **WHEN** he must draw a card
- **THEN** he is defeated and gains 1 mental trauma, without taking horror first

#### Scenario: Cover Up at elimination

- **GIVEN** Roland's Cover Up in his threat area with 2 clues on it
- **WHEN** Roland is defeated
- **THEN** Cover Up's "when the game ends" ability gives him 1 mental trauma, and it leaves the game

### Requirement: Act and agenda decks

The engine SHALL advance the agenda when doom in play ≥ the current agenda's threshold (removing all doom) and SHALL let investigators advance the act by spending the required clues as a group (at end of turn / as a free action per the act's text) or when the act's objective is met. Advancing resolves the back side's text.

The investigators SHALL be able to spend the clues to advance an act whose advancement has no other timing in any player window, not only during an investigator's turn.

#### Scenario: Agenda advances

- **WHEN** the mythos phase brings total doom to the agenda's threshold
- **THEN** all doom is removed, the agenda flips and its back side resolves

#### Scenario: Group clue spend

- **WHEN** investigators together hold enough clues for the act and choose to advance
- **THEN** the required clues are spent from any combination of investigators and the act advances

#### Scenario: Advancing in the enemy phase

- **GIVEN** the investigators hold the clues the current act asks for
- **WHEN** the enemy phase's player window after hunters move is offered
- **THEN** advancing the act is among the options

### Requirement: Player cards in play

The engine SHALL support assets (slots: hand×2, arcane×2, accessory, body, ally, tarot; uses such as ammo/charges/secrets/supplies), events, skills, weaknesses (basic random and signature), exhaust/ready, fast cards, and triggered abilities (reaction, forced, free) with timing windows.

An asset whose data says its uses replenish SHALL have them restored to its printed count at the start of each round. An ability cost that spends a resource "from your resource pool or from the card" SHALL be payable from either, spending the card's first. A cost that places damage on the asset itself SHALL defeat and discard the asset when its damage reaches its health, after the ability resolves. An effect SHALL be able to grant an additional action usable only for one kind of action (Galvanize: fight), and to ready an asset the investigator controls chosen by filter.

A unique card SHALL NOT be played or put into play while a card with the same title is in play; when a unique encounter card enters play, a player card in play with the same title SHALL be discarded. A "limit X per period" on a card's ability SHALL count uses of that copy since it last entered play: a card that leaves play and re-enters starts with its limit unused.

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

### Requirement: Encounter deck and treacheries

The engine SHALL build the encounter deck from the scenario's encounter sets, draw/resolve treacheries (revelation effects, including Surge and Peril), shuffle the discard back when the deck is empty, and place persistent treacheries in threat areas or on locations.

After a treachery with Victory X has resolved, it SHALL be placed in the victory display instead of a discard pile, unless its abilities put it elsewhere (a threat area, attached to a location).

#### Scenario: Empty encounter deck

- **WHEN** an encounter card must be drawn and the encounter deck is empty
- **THEN** the encounter discard is shuffled into a new encounter deck first

#### Scenario: A treachery worth victory

- **GIVEN** a treachery with Victory 1 and a revelation that does not keep it in play
- **WHEN** it has resolved
- **THEN** it is in the victory display and counts toward the experience earned
