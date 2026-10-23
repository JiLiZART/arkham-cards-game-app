## Purpose

Rules engine for Arkham Horror: The Card Game: holds the full game state and applies player and game actions according to the core rules, independent of any rendering.

## ADDED Requirements

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

#### Scenario: Investigate success

- **WHEN** Roland (intellect 3) investigates a shroud-2 location and reveals a `-1` token
- **THEN** total 2 ≥ 2, the test succeeds and Roland discovers 1 clue from the location

#### Scenario: Auto-fail

- **WHEN** the tentacle token is revealed
- **THEN** the test fails even if skill exceeds difficulty

#### Scenario: Committed icons

- **WHEN** an investigator commits a card with two matching skill icons to their own test
- **THEN** their skill value increases by 2 for that test

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

The engine SHALL emit an ordered log of game events (card drawn, token revealed, damage dealt, phase change, etc.) that the UI can animate, and that includes enough data to describe each event in human-readable text.

#### Scenario: Token reveal event

- **WHEN** a chaos token is revealed
- **THEN** an event with the token type, the investigator and the test context is appended to the log
