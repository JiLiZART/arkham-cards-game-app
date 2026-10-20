# game-engine Specification

## Purpose
The deterministic rules engine: game state, recorded choices that replay exactly, phase flow, and the facts the table UI reads from the log.

## Requirements

### Requirement: Phase pacing
A game whose setup asks for paced phases SHALL pause before each mythos, investigation, enemy and upkeep phase begins. The pause is a pending choice for the lead investigator (the first active investigator if the lead is out), with a single "continue" option. The phase-begins log entry and the phase's own steps come only after it is chosen. A pause after the scenario has ended is skipped.

The choice is recorded like any other, so replaying the same setup and choices gives the same game. The bot chooses "continue". Setups that don't ask for pacing, including the engine tests' default and saves made before this change, never pause, and replay their recorded choices unchanged.

#### Scenario: Enemy phase waits
- **WHEN** in a paced game the last investigator ends their turn
- **THEN** the pending choice is the lead investigator's "continue" for the enemy phase, and no enemy has attacked yet
- **WHEN** "continue" is chosen
- **THEN** the log shows the enemy phase beginning and the enemy phase resolves

#### Scenario: Old save
- **WHEN** a save made without pacing is loaded
- **THEN** its choices replay to the same state as before, with no pauses

### Requirement: Reveal counter
The game state SHALL count every point at which hidden information enters the game:
- a chaos token is drawn;
- a card is drawn or revealed from any deck (player deck, encounter deck);
- deck cards are looked at or searched;
- a deck is shuffled;
- the random generator is used.

A choice whose resolution leaves the counter unchanged revealed nothing, so the UI may undo it.

#### Scenario: Move vs draw
- **WHEN** Roland moves to an adjacent revealed location
- **THEN** the reveal counter is unchanged
- **WHEN** he takes the Draw action
- **THEN** the reveal counter has gone up

#### Scenario: Skill test
- **WHEN** Roland starts a Fight and commits a card
- **THEN** the counter is unchanged
- **WHEN** the commit window closes and the chaos token is drawn
- **THEN** the counter has gone up

### Requirement: Event sources
Log events for an investigator taking damage or horror, or losing resources, clues or actions because of a card's effect SHALL name that card as their source, in `data.source`. Damage from an enemy attack names the enemy. Events with no card behind them, such as a chaos token's effect, have no source.

#### Scenario: Attic
- **WHEN** Roland enters the Attic and takes 1 horror from its forced ability
- **THEN** the damage event's source is the Attic

#### Scenario: Enemy attack
- **WHEN** an engaged Ghoul attacks Roland in the enemy phase
- **THEN** the damage event's source is the Ghoul

### Requirement: Deterministic, serializable game state
The engine SHALL represent the whole game as a plain serializable state object. Applying the same sequence of actions to the same initial state and seed MUST produce an identical state. All randomness (shuffles, chaos token draws) MUST come from a seeded RNG stored in the state.

#### Scenario: Replay produces same result
- **WHEN** a game is started with seed `S` and the recorded action list is replayed on a fresh engine
- **THEN** the final state is deep-equal to the original final state

#### Scenario: Save and resume
- **WHEN** the state is serialized to JSON and later deserialized
- **THEN** play continues from the exact same point with the same pending choices

### Requirement: Action validation
The engine SHALL reject any action that is not legal in the current state (wrong player, wrong phase, insufficient actions/resources, unmet play conditions) without mutating state, and SHALL expose the list of currently legal actions for the active player.

#### Scenario: Illegal action rejected
- **WHEN** an investigator with 0 remaining actions submits a Move action
- **THEN** the engine returns an error and the state is unchanged

#### Scenario: Legal actions listed
- **WHEN** the UI asks for legal actions during the investigation phase
- **THEN** the engine returns every currently legal basic action, playable card and activatable ability for the active investigator

### Requirement: Pending choices
When resolution requires a decision (choose target, choose order of simultaneous effects, choose to commit cards, choose a location, optional triggers), the engine SHALL pause and expose a pending choice naming the deciding player and the valid options, and SHALL resume only when a valid answer is submitted.

#### Scenario: Choose enemy to fight
- **WHEN** an investigator takes Fight while two enemies are engaged with them
- **THEN** the engine exposes a choice of the two enemies to that investigator and waits

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

### Requirement: Chaos bag
The engine SHALL hold a chaos bag of tokens defined by the scenario/campaign difficulty, draw tokens at random from the seeded RNG, return revealed tokens after the test, and support adding, removing and sealing tokens. Symbol tokens (skull, cultist, tablet, elder thing) MUST resolve using the current scenario's reference card values for the chosen difficulty.

#### Scenario: Skull resolved by scenario
- **WHEN** a skull is revealed in The Gathering on Standard
- **THEN** the modifier equals −X where X is the number of Ghoul enemies at the investigator's location, per the scenario reference card

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

### Requirement: Locations
The engine SHALL track locations with shroud, clue value (per-investigator values multiplied by player count), revealed/unrevealed state, connections (symbols) and victory points. Revealing a location MUST place its clues.

#### Scenario: Per-investigator clues
- **WHEN** a location with clue value "2 per investigator" is revealed in a 3-player game
- **THEN** 6 clues are placed on it

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

### Requirement: Event log
The engine SHALL emit an ordered log of game events (card drawn, token revealed, damage dealt, phase change, etc.) that the UI can animate. Each event SHALL carry structured data that describes it without parsing its text:
- the investigator involved (`inv`), if any;
- the card involved (`card`), if any;
- in `data`, every amount and secondary reference the description needs. Examples: `n` for resources, clues, doom, cards and heals; `damage` and `horror` for attacks and damage taken; `skill`, `tokens`, `total`, `difficulty` and `success` for tests; `by` for whoever defeated an enemy; `from` and `at` for moves and spawns.

The text stays as an English fallback. Adding data MUST NOT change game rules, the order of events, or the result of replaying a saved action log.

#### Scenario: Token reveal event
- **WHEN** a chaos token is revealed
- **THEN** an event with the token type, the investigator and the test context is appended to the log

#### Scenario: Resource gain carries its amount
- **WHEN** an effect gives Roland 3 resources
- **THEN** the "resource" event has `inv` Roland and `data.n` = 3

#### Scenario: Attack carries damage and horror
- **WHEN** a Ghoul Minion attacks Daisy for 1 damage and 1 horror
- **THEN** the "attack" event has `inv` Daisy, `card` the Ghoul Minion, and `data` with `damage: 1, horror: 1`

#### Scenario: Replays unchanged
- **WHEN** a saved action log from before this change is replayed
- **THEN** the resulting game state matches the original except for the extra event data

### Requirement: Translatable prompts
Every pending choice SHALL carry a prompt key and the values it needs (for example `turn` with `{ inv, actions }`, `commit` with `{ inv, skill }`, `assign` with `{ inv, kind, left }`), next to its English prompt text. The key and values MUST NOT affect rules or replays.

#### Scenario: Turn prompt
- **WHEN** Roland must choose an action with 3 actions left
- **THEN** the pending choice has prompt key `turn` with `inv` Roland and `actions` 3, and English prompt text "Roland Banks: choose an action (3 left)"

### Requirement: Step events
The engine SHALL log a `step` event at the start of each automated step of a phase, before the step's own events, naming the step and, where one applies, the investigator:
- `doom`: the mythos phase places doom on the agenda;
- `encounter` with the investigator: that investigator draws an encounter card;
- `hunters`: at least one hunter is about to move;
- `attacks`: at least one engaged, ready enemy is about to attack;
- `upkeep`: cards ready and investigators draw and gain resources;
- `handSize` with the investigator: that investigator must discard down to the hand limit.

A step is logged only when it does something: no `hunters` step when no hunter moves, no `attacks` step when no enemy attacks, no `handSize` step for an investigator within the limit. Each step is logged once per phase, however many enemies or investigators it covers. Step events are log entries only: they are not choices, they don't change the reveal counter, and a save made before this change replays its recorded choices to the same state apart from the added log entries.

#### Scenario: Enemy phase with a hunter
- **WHEN** the enemy phase begins with a ready Ghoul Minion two locations from Roland, and a ready Swarm of Rats engaged with Daisy
- **THEN** the log shows `step hunters`, the Ghoul's move, `step attacks`, then the Rats' attack

#### Scenario: Enemy phase with nothing to do
- **WHEN** the enemy phase begins with no enemies in play
- **THEN** no `hunters` or `attacks` step is logged

#### Scenario: Mythos phase
- **WHEN** round 2's mythos phase begins with Roland and Daisy playing
- **THEN** the log shows `step doom`, the doom event, `step encounter` for Roland, his encounter card, `step encounter` for Daisy, her encounter card

#### Scenario: Hand size
- **WHEN** upkeep ends with Roland holding 9 cards and Daisy 5
- **THEN** a `handSize` step is logged for Roland only, before his discard prompt

#### Scenario: Old save
- **WHEN** a save made without step events is loaded
- **THEN** its choices replay to the same cards, counters and pending choice as before

### Requirement: Assets with uses leave play when empty
When an ability's cost spends the last use of an asset (supplies, ammo, charges, secrets) and the asset has no other way to matter in play, the asset SHALL be discarded once the ability has resolved. An asset has no other way to matter when every ability it has is one that spends its uses and it has no constant ability. A card marked `discardWhenEmpty` in its data is discarded the same way. The discard is an engine step, so it is deterministic, replayable and undoable like any other, and the ability's own effects (a Flashlight's shroud modifier for its investigation) resolve with the card still in play. This is a deliberate deviation from the printed rules, which leave the empty card in play.

#### Scenario: Flashlight's last supply
- **WHEN** Roland's Flashlight has 1 supply and he investigates with it
- **THEN** the investigation resolves with the −2 shroud, and afterwards Flashlight is in his discard pile and no longer in his play area

#### Scenario: Uses left
- **WHEN** Roland's .45 Automatic has 2 ammo and he fights with it
- **THEN** it stays in play with 1 ammo

#### Scenario: A card with a constant ability
- **WHEN** an asset with uses also has a constant ability and its last use is spent
- **THEN** it stays in play

#### Scenario: Undo
- **WHEN** the player undoes the investigation that emptied Flashlight
- **THEN** Flashlight is back in play with 1 supply

### Requirement: Tapped draws
A game whose setup asks for tapped decks SHALL wait, before each draw from an investigator's deck or from the encounter deck during play, for a pending choice of the drawing investigator with a single "draw" option that names the deck and the number of cards; the cards leave the deck only when it is chosen. One choice covers a multi-card draw from one effect ("draw 2 cards"). Draws during setup (opening hands, the mulligan redraw) SHALL NOT wait. The choice is recorded like any other, so replaying the same setup and choices gives the same game; the bot chooses "draw". Setups that don't ask for tapped decks, including the engine tests' default and saves made before this change, never wait and replay unchanged. A wait after the scenario has ended is skipped.

#### Scenario: Upkeep draw waits
- **WHEN** in a tapped-decks game the upkeep phase reaches Roland's draw
- **THEN** the pending choice is Roland's "draw" for his deck, 1 card, and his hand is unchanged
- **WHEN** "draw" is chosen
- **THEN** he draws 1 card and the upkeep continues

#### Scenario: Mythos draws in turn
- **WHEN** in a tapped-decks game with Roland and Daisy the mythos phase reaches the encounter draws
- **THEN** Roland's "draw" for the encounter deck is pending; after it, Daisy's

#### Scenario: Two cards, one tap
- **WHEN** an effect has Daisy draw 2 cards
- **THEN** one "draw" for her deck, 2 cards, is pending, and both are drawn when it is chosen

#### Scenario: Old save
- **WHEN** a save made without tapped decks is loaded
- **THEN** its choices replay to the same state as before, with no waits

### Requirement: Final act or agenda ends the scenario
When the last act of the act deck advances, or the last agenda of the agenda deck advances, and no card or scenario script has already ended the game, the scenario SHALL end with the resolution named on that card's back ("→R2" gives R2) when the scenario has it; otherwise the last act gives the scenario's first numbered resolution and the last agenda gives no resolution. Scripted endings keep working as before.

#### Scenario: Unscripted last act
- **GIVEN** a generated scenario on its last act, whose back reads "(→R1)"
- **WHEN** the investigators advance it
- **THEN** the scenario ends with Resolution 1

#### Scenario: Unscripted last agenda
- **GIVEN** a generated scenario whose last agenda's back names no resolution
- **WHEN** doom advances it
- **THEN** the scenario ends with no resolution

#### Scenario: Scripted ending unchanged
- **WHEN** The Gathering's last act advances
- **THEN** its script's resolution is used, as before
