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

#### Scenario: First round skips mythos
- **WHEN** a scenario starts
- **THEN** the first phase is Investigation and no doom is placed

#### Scenario: Upkeep hand size
- **WHEN** an investigator has 10 cards in hand at end of upkeep
- **THEN** they must choose and discard 2 cards


### Requirement: Basic actions
The engine SHALL implement the basic actions: Investigate, Move, Draw, Resource, Play, Activate, Fight, Engage, Evade (and Parley/Resign when granted by cards). Each costs 1 action unless a card says otherwise. Taking any action other than Fight, Evade, Parley or Resign while engaged with a ready non-aloof enemy MUST trigger an attack of opportunity from each such enemy.

#### Scenario: Attack of opportunity
- **WHEN** an investigator engaged with a ready Ghoul takes the Draw action
- **THEN** the Ghoul attacks (deals its damage/horror) before the card is drawn

#### Scenario: Move to connected location
- **WHEN** an investigator moves to a location connected to their current one
- **THEN** they are placed there, unengaged enemies do not follow, engaged enemies move with them, and an unrevealed destination is revealed


### Requirement: Skill tests
The engine SHALL resolve skill tests as: determine skill value and difficulty → commit cards from hand (matching icons, wild icons) → reveal a chaos token → apply token modifier and effects → compare total to difficulty (success if ≥) → apply results and committed cards' effects → discard committed cards. An auto-fail token MUST fail regardless of total; total skill MUST NOT drop below 0. The Elder Sign MUST trigger the investigator's Elder Sign ability.

While an investigator's commit window is open, the engine SHALL offer, for each card that investigator committed to this test, an option to take it back. Taking a card back SHALL return it to its owner's hand and remove its icons from the test value, and the same investigator's commit choice is asked again. Once that investigator chooses Done, their committed cards stay committed. Taking back is an ordinary recorded choice, so saved games and action-log replays stay exact. The bot MUST NOT take cards back.

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


### Requirement: Chaos bag
The engine SHALL hold a chaos bag of tokens defined by the scenario/campaign difficulty, draw tokens at random from the seeded RNG, return revealed tokens after the test, and support adding, removing and sealing tokens. Symbol tokens (skull, cultist, tablet, elder thing) MUST resolve using the current scenario's reference card values for the chosen difficulty.

#### Scenario: Skull resolved by scenario
- **WHEN** a skull is revealed in The Gathering on Standard
- **THEN** the modifier equals −X where X is the number of Ghoul enemies at the investigator's location, per the scenario reference card


### Requirement: Damage, horror and defeat
The engine SHALL assign damage and horror to investigators and their assets with health/sanity (player chooses assignment), defeat an investigator whose damage ≥ health or horror ≥ sanity, record physical/mental trauma, and remove the investigator from the scenario. If all investigators are defeated or resign the scenario MUST end with the matching resolution.

#### Scenario: Investigator defeated
- **WHEN** Daisy (sanity 9) takes her 9th horror
- **THEN** she is defeated, her cards leave play, her clues drop at her location, and she gains 1 mental trauma


### Requirement: Enemies
The engine SHALL implement enemy spawning (at named location or engaging the drawing investigator), engagement, exhaustion on evade, damage and defeat (victory points to victory display), and keywords: Hunter, Retaliate, Aloof, Alert, Massive, Prey. Ready unengaged enemies at an investigator's location MUST engage that investigator.

#### Scenario: Hunter movement
- **WHEN** the enemy phase starts and an unengaged Hunter enemy is 2 locations away from the nearest investigator
- **THEN** it moves one location along the shortest path toward them

#### Scenario: Retaliate
- **WHEN** an investigator fails a Fight test against a ready Retaliate enemy
- **THEN** the enemy attacks that investigator


### Requirement: Locations
The engine SHALL track locations with shroud, clue value (per-investigator values multiplied by player count), revealed/unrevealed state, connections (symbols) and victory points. Revealing a location MUST place its clues.

#### Scenario: Per-investigator clues
- **WHEN** a location with clue value "2 per investigator" is revealed in a 3-player game
- **THEN** 6 clues are placed on it


### Requirement: Act and agenda decks
The engine SHALL advance the agenda when doom in play ≥ the current agenda's threshold (removing all doom) and SHALL let investigators advance the act by spending the required clues as a group (at end of turn / as a free action per the act's text) or when the act's objective is met. Advancing resolves the back side's text.

#### Scenario: Agenda advances
- **WHEN** the mythos phase brings total doom to the agenda's threshold
- **THEN** all doom is removed, the agenda flips and its back side resolves

#### Scenario: Group clue spend
- **WHEN** investigators together hold enough clues for the act and choose to advance
- **THEN** the required clues are spent from any combination of investigators and the act advances


### Requirement: Encounter deck and treacheries
The engine SHALL build the encounter deck from the scenario's encounter sets, draw/resolve treacheries (revelation effects, including Surge and Peril), shuffle the discard back when the deck is empty, and place persistent treacheries in threat areas or on locations.

#### Scenario: Empty encounter deck
- **WHEN** an encounter card must be drawn and the encounter deck is empty
- **THEN** the encounter discard is shuffled into a new encounter deck first


### Requirement: Player cards in play
The engine SHALL support assets (slots: hand×2, arcane×2, accessory, body, ally, tarot; uses such as ammo/charges/secrets/supplies), events, skills, weaknesses (basic random and signature), exhaust/ready, fast cards, and triggered abilities (reaction, forced, free) with timing windows.

#### Scenario: Slot limit
- **WHEN** an investigator with two hand-slot assets in play plays a third hand asset
- **THEN** they must choose an existing hand asset to discard

#### Scenario: Weakness drawn
- **WHEN** an investigator draws a weakness with a revelation effect
- **THEN** its revelation resolves immediately and it does not count toward hand size


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
