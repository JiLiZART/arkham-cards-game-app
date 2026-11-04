## ADDED Requirements

### Requirement: Card faces and story cards

A card instance SHALL have a face. Flipping a double-sided card SHALL show its other printed side (the card whose code is the first face's code followed by `b`, or the base code from a `b` face), keep its damage, horror, clues, doom, resources, named tokens, attachments, position and controller, and move it to the zone the new face's type lives in: a story card that becomes an enemy is an enemy at that location, an act that becomes a location is a location in play connected as its text says, an asset that becomes a story card leaves the play area. A card whose face is a story card SHALL be resolvable: its text is shown, its abilities run, and it then does what the card says (flip back, leave the game, or stay as it is). A `b` face SHALL never be built into an encounter deck, a side deck or a set-aside pile as a card of its own.

#### Scenario: A story card becomes an enemy

- **GIVEN** a Sickening Reality story card (03065) in play
- **WHEN** its text flips it
- **THEN** the same instance is the enemy 03065b at the location the story card named, with its clues kept

#### Scenario: A VIP keeps her tokens across a flip

- **GIVEN** Ashleigh Clarke (03078) with 2 clues on her
- **WHEN** her last clue is removed and she flips to her story side
- **THEN** the instance shows 03078b with the same attachments and is no longer in the asset area

#### Scenario: Story side resolved

- **WHEN** an investigator at a Dim Carcosa location with no clues takes the act's flip action
- **THEN** the location's story side is shown, its abilities resolve, and the location flips back or is replaced as that story says

#### Scenario: A b face is not a deck card

- **WHEN** a scenario whose encounter set holds 03076a and 03076b is set up
- **THEN** one instance exists, showing 03076a, and no card of code 03076b is in any pile

### Requirement: Cards beneath cards

The engine SHALL keep an ordered pile of facedown cards beneath any card instance (a location, an enemy, an act, an agenda, an investigator, the scenario reference card). Effects SHALL be able to put a card beneath another, draw or reveal the top card beneath, shuffle the pile, and move all of them elsewhere. Cards beneath a card SHALL be out of play, follow the card they are beneath when it moves, and be discarded as the scenario says when it leaves play. Conditions and token X sources SHALL be able to count them.

#### Scenario: Potential sacrifices beneath the agenda

- **GIVEN** Blood on the Altar's agenda with two potential sacrifices beneath it
- **WHEN** the agenda advances and puts a third beneath
- **THEN** the pile beneath the agenda holds three cards in order, out of play, and the X source counting them reads 3

#### Scenario: Draw the card beneath

- **GIVEN** a location with one encounter card beneath it and no clues
- **WHEN** an investigator uses the location's draw-beneath ability
- **THEN** that card is drawn as an encounter card and the pile beneath the location is empty

#### Scenario: Beneath the scenario card

- **WHEN** a Brotherhood enemy is placed beneath the scenario reference card
- **THEN** it is out of play, and an effect that spawns a random card from beneath the scenario card can take it

### Requirement: The void

The engine SHALL keep an out-of-play zone, the void, in which a card keeps its attachments, damage and tokens. A card leaving play to the void SHALL not be discarded; a search of the encounter deck and discard pile SHALL also search the void when the effect says so; a card returning from the void SHALL re-enter play with what it kept.

#### Scenario: Hunting Horror enters the void

- **GIVEN** the Hunting Horror with Shadow-spawned attached and 2 damage
- **WHEN** it leaves play to the void
- **THEN** it is not in the encounter discard, and when a cultist token's effect searches the deck, the discard and the void for it, it is found and spawns with Shadow-spawned attached and its 2 damage

### Requirement: Vehicles

An asset with the `vehicle` keyword SHALL be at a location; each investigator SHALL be either in a vehicle or not. Entering a vehicle at your location and leaving it SHALL be fast actions, each at most once per round per investigator; when the vehicle moves, the investigators in it move with it, and enter-location windows open for them; an investigator in a vehicle SHALL still be at the vehicle's location for every other rule. A scenario or card SHALL be able to forbid entering vehicles.

#### Scenario: The vehicle moves

- **GIVEN** two investigators in the Fishing Vessel at Churning Waters
- **WHEN** the vessel moves to a connecting location
- **THEN** both investigators are at the new location without having taken a move action, and the location's enter window opens for each

#### Scenario: Leave once per round

- **WHEN** an investigator leaves a vehicle and then tries to leave again in the same round
- **THEN** the second leave is not offered

### Requirement: Named tokens

The engine SHALL hold named counters (resource tokens used as a named thing: seals, scrap, kindling, wards, charges) on any card instance or investigator. Effects SHALL place and remove them; amounts and conditions SHALL read them by name; the counter SHALL be shown on the card.

#### Scenario: Place and count

- **WHEN** an effect places 2 tokens named `ward` on a location and a condition asks for at least 2 `ward` tokens there
- **THEN** the location holds 2 `ward` tokens and the condition holds

### Requirement: Interludes and checkpoints

A scenario SHALL be able to read an interlude in the middle of play: the game pauses on a story page with the choices the guide offers, each answer is a recorded choice, and what the interlude records goes into the scenario's notes for the campaign log. A scenario SHALL be able to end at a checkpoint: a resolution that records the table (locations in play with their clues and named tokens, story assets and their controllers, per-investigator counters, cards beneath the scenario card) into the campaign log so that the next part's setup can rebuild it. Checkpoint resolutions SHALL award no experience and run no deck upgrade.

#### Scenario: A mid-scenario interlude

- **GIVEN** an agenda back that says to read an interlude
- **WHEN** the agenda advances
- **THEN** the story page is shown before play resumes, its choice is a recorded option, and replaying the game's choices reproduces the same answer

#### Scenario: The Stakeout ends at the checkpoint

- **WHEN** Fortune and Folly part I ends with Resolution 2
- **THEN** the log records each investigator's alarm level, the Wellspring's clues and the stash, no experience is awarded, and part II's setup reads those entries

## MODIFIED Requirements

### Requirement: Act and agenda decks

The engine SHALL advance the agenda when doom in play ≥ the current agenda's threshold (removing all doom) and SHALL let investigators advance the act by spending the required clues as a group (at end of turn / as a free action per the act's text) or when the act's objective is met. Advancing resolves the back side's text.

The investigators SHALL be able to spend the clues to advance an act whose advancement has no other timing in any player window, not only during an investigator's turn.

A scenario SHALL be able to define several act decks and several agenda decks, each named, each a pile with its own current card whose text is active. Doom SHALL be checked against every agenda deck's current card; when a card says to place doom "on the agenda" and there are several, the lead investigator chooses which; each deck advances on its own. An entry of an act or agenda deck SHALL be able to name several versions, the one chosen by a campaign-log condition, else at random; a scenario SHALL be able to reset a deck to its first card. The scenario reference card SHALL be a card instance of its own so that cards can be placed beneath it.

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

#### Scenario: Two agenda decks

- **GIVEN** Black Stars Rise with agendas 03275 and 03278 as two decks
- **WHEN** the mythos phase places its doom
- **THEN** the lead chooses which agenda takes it, and when doom in play reaches 03278's threshold only that deck advances, 03275 staying as it is

#### Scenario: Three act decks

- **GIVEN** Threads of Fate with three act decks
- **WHEN** the investigators spend clues to advance deck 2
- **THEN** deck 2's next card is current, decks 1 and 3 are unchanged, and all three fronts' abilities are offered

#### Scenario: A version chosen by the log

- **WHEN** The Unspeakable Oath is set up and the log says Daniel is an enemy
- **THEN** act 2 is version II (03165), and without the entry version I (03164); the other version is not in the deck

### Requirement: Locations

The engine SHALL track locations with shroud, clue value (per-investigator values multiplied by player count), revealed/unrevealed state, connections (symbols) and victory points. Revealing a location MUST place its clues.

Revealing a location SHALL open a window after its clues are placed, in which that location's "after you reveal this location" abilities resolve for the investigator who revealed it. A location SHALL be removable from play: investigators there are defeated unless the removing card moves them, enemies and attachments there are discarded, the location goes to the victory display when it has Victory X and no clues, else to the encounter discard, and a scenario hook is told it left. A single-sided location SHALL be able to sit in the encounter deck or a side deck: drawn as an encounter card, its revelation puts it into play, connected as its text says, and a discard-until effect SHALL be able to stop at a location.

#### Scenario: Per-investigator clues

- **WHEN** a location with clue value "2 per investigator" is revealed in a 3-player game
- **THEN** 6 clues are placed on it

#### Scenario: After you reveal this location

- **WHEN** Roland enters the unrevealed Trap Room (03058) and it is revealed
- **THEN** after its clues are placed its reveal ability runs for Roland and the Swarm of Rats it names is put into play engaged with him

#### Scenario: The leftmost car leaves

- **GIVEN** the Essex County Express with an investigator in the leftmost car and a Victory 1 car with no clues behind it
- **WHEN** the agenda removes the leftmost car
- **THEN** that investigator is defeated, the car is no longer a location, and the scenario's hook sees it leave

#### Scenario: A location from the encounter deck

- **GIVEN** Lost in Time and Space with the single-sided locations in the encounter deck
- **WHEN** an investigator draws one
- **THEN** it enters play as a location connected to the investigator's location and its clues are placed; the act's "discard until a location" puts the next one into play the same way

### Requirement: Enemies

The engine SHALL implement enemy spawning (at named location or engaging the drawing investigator), engagement, exhaustion on evade, damage and defeat (victory points to victory display), and keywords: Hunter, Retaliate, Aloof, Alert, Massive, Prey. Ready unengaged enemies at an investigator's location MUST engage that investigator.

When an investigator deals damage to an enemy (an attack, or a card's effect), the engine SHALL open a window before the damage is placed, naming the investigator, the enemy, the amount and the card dealing it. An effect in that window SHALL be able to add to the amount; a forced ability can react to it. An enemy whose card says it takes at most 1 damage at a time SHALL take 1, after any additions. When the damage placed exceeds the enemy's remaining health, the engine SHALL open a window naming the excess before the enemy is defeated.

After an enemy attacks an investigator, the engine SHALL open the attacked window even when the attack was cancelled, so cards that play "after an enemy attacks you, even if that attack was canceled" can.

In the enemy phase each enemy SHALL exhaust as soon as its own attack (and every ability the attack triggered) has resolved, before the next enemy attacks; a massive enemy exhausts after its last attack.

A spawn instruction SHALL be an expression the engine resolves: a location by name, any location with a trait, an empty location, the location nearest or farthest to the drawing investigator or to a card, a location connected to the drawing investigator's, unrevealed if able, or a choice among several of these, with the drawing investigator (or the lead, when the rules say) choosing among ties. Prey SHALL also be definable as the investigator nearest to a card matching a filter. Before an enemy would be defeated, the engine SHALL open a window in which a replacement ability on the enemy or a scenario hook can cancel the defeat and do something else instead.

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

#### Scenario: Spawn at any empty location with a trait

- **GIVEN** three Arkham locations of which two are empty
- **WHEN** Waterfront Civilian (13027, "any empty Arkham location") is drawn
- **THEN** the drawing investigator chooses between the two empty Arkham locations

#### Scenario: Spawn nearest to a card

- **WHEN** an enemy whose spawn is "the nearest Prison location" is drawn by an investigator two moves from the nearest Prison
- **THEN** it spawns at that Prison

#### Scenario: Prey nearest to another Cultist

- **GIVEN** Narôgath (50026b) and a Cultist enemy at Daisy's location, Roland elsewhere
- **WHEN** Narôgath spawns engaged with prey
- **THEN** it engages Daisy

#### Scenario: An enemy that would be defeated is shuffled away

- **GIVEN** The Thing That Follows (03042) with 1 health left
- **WHEN** an attack deals it 2 damage
- **THEN** it is not placed in the victory display or discarded; its replacement shuffles it into its bearer's deck

### Requirement: Damage, horror and defeat

The engine SHALL assign damage and horror to investigators and their assets with health/sanity (player chooses assignment), defeat an investigator whose damage ≥ health or horror ≥ sanity, record physical/mental trauma, and remove the investigator from the scenario. If all investigators are defeated or resign the scenario MUST end with the matching resolution.

When an enemy attack deals damage or horror to an investigator, the engine SHALL open a reaction window for that investigator before any point is assigned, naming the attacking enemy and how much damage and horror were dealt. An effect SHALL be able to prevent part of what was dealt: a number of points of damage, of horror, or of either (the player choosing which when both were dealt). Prevented points are not assigned to anyone; when every point is prevented, nothing is assigned.

Each option of the assignment prompt SHALL say what it does: "Assign 1 damage to <card>" (or horror), for the investigator and for each asset that can soak it, and for an asset that point would defeat, "(defeated)" after it. The labels SHALL be in the game's language.

When an investigator must draw from an empty deck and their discard pile is empty, they SHALL be defeated at once and suffer 1 mental trauma. When an investigator is eliminated, each weakness they own that is in play (or in their hand) and has a "when the game ends" ability SHALL resolve that ability, then leave the game.

Before an investigator is defeated, the engine SHALL open a window naming the cause (damage, horror, both, or an effect) in which a replacement ability on a card they control or a scenario hook can cancel the defeat and do something else instead. The scenario SHALL record at its end which investigators resigned and which were defeated, so the campaign flow does not have to ask.

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

#### Scenario: Dim Carcosa's sanity rule

- **GIVEN** Dim Carcosa's scenario hook that replaces defeat by horror while horror is below twice sanity
- **WHEN** Daisy's horror reaches her sanity
- **THEN** she is not defeated and keeps playing; when it reaches twice her sanity she is

#### Scenario: St. Hubert's Key

- **GIVEN** St. Hubert's Key (03269) in play
- **WHEN** its controller would be defeated by horror
- **THEN** the key's replacement is offered, and taking it discards the key and heals the horror instead of defeating them

#### Scenario: Resigned and defeated recorded

- **WHEN** a scenario ends with Roland resigned and Daisy defeated
- **THEN** the scenario facts list Roland under resigned and Daisy under defeated, and the flow's "was anyone resigned" condition reads them

### Requirement: Chaos bag

The engine SHALL hold a chaos bag of tokens defined by the scenario/campaign difficulty, draw tokens at random from the seeded RNG, return revealed tokens after the test, and support adding, removing and sealing tokens. Symbol tokens (skull, cultist, tablet, elder thing) MUST resolve using the current scenario's reference card values for the chosen difficulty, and a hand-written scenario SHALL define its token effects for all four difficulties (Easy, Standard, Hard, Expert), from the front and the back of its reference card. A token effect SHALL be able to search the encounter deck and the encounter discard pile for an enemy matching a filter and have the investigator taking the test draw it, shuffling the encounter deck after, and to reveal another token when a condition holds (such as an enemy with a trait being in play, or none being in play).

A token line SHALL be able to give a different modifier when a condition holds ("−1 (−3 instead if you have 3 or more horror)"), the condition read at the moment the token resolves; a token's X SHALL be able to count the cards beneath a card or the locations without a card beneath them.

#### Scenario: Skull resolved by scenario

- **WHEN** a skull is revealed in The Gathering on Standard
- **THEN** the modifier equals −X where X is the number of Ghoul enemies at the investigator's location, per the scenario reference card

#### Scenario: Skull on Hard

- **GIVEN** The Gathering on Hard, with a Ghoul enemy in the encounter discard pile
- **WHEN** an investigator reveals a skull and fails the test
- **THEN** the modifier is −2, and after the test that investigator draws the Ghoul enemy from the discard pile and the encounter deck is shuffled

#### Scenario: Reveal another when no Cultist is in play

- **GIVEN** The Midnight Masks on Expert with no Cultist enemy in play
- **WHEN** a cultist token is revealed
- **THEN** its modifier is −2, no doom is placed, and another token is revealed

#### Scenario: Every difficulty defined

- **WHEN** the content is checked
- **THEN** each of Night of the Zealot's three scenarios has token effects for Easy, Standard, Hard and Expert

#### Scenario: A modifier that changes on a condition

- **GIVEN** Curtain Call on Standard (skull: −1, −3 instead if you have 3 or more horror)
- **WHEN** an investigator with 3 horror reveals a skull
- **THEN** the modifier is −3; with 2 horror it is −1

### Requirement: Encounter deck and treacheries

The engine SHALL build the encounter deck from the scenario's encounter sets, draw/resolve treacheries (revelation effects, including Surge and Peril), shuffle the discard back when the deck is empty, and place persistent treacheries in threat areas or on locations.

After a treachery with Victory X has resolved, it SHALL be placed in the victory display instead of a discard pile, unless its abilities put it elsewhere (a threat area, attached to a location).

A scenario SHALL be able to list encounter sets whose locations go into the encounter deck or into a named side deck rather than being set aside, and a side deck SHALL be able to hold locations (the Miskatonic Museum's Exhibit deck). A search of the encounter deck and its discard pile SHALL extend to the void when the effect says so.

#### Scenario: Empty encounter deck

- **WHEN** an encounter card must be drawn and the encounter deck is empty
- **THEN** the encounter discard is shuffled into a new encounter deck first

#### Scenario: A treachery worth victory

- **GIVEN** a treachery with Victory 1 and a revelation that does not keep it in play
- **WHEN** it has resolved
- **THEN** it is in the victory display and counts toward the experience earned

#### Scenario: The Exhibit deck

- **WHEN** The Miskatonic Museum is set up with its Exhibit Halls as a side deck
- **THEN** the five Exhibit Halls are in that side deck, not set aside, and an effect that reveals the top card of the Exhibit deck puts that location into play
