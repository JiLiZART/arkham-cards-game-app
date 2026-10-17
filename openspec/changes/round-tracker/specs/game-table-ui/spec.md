## ADDED Requirements

### Requirement: Phase ribbon
The top of the screen SHALL show a ribbon with the round number and the four phases of a round in order: Mythos, Investigation, Enemy, Upkeep. The current phase is lit (during the lead investigator's pause before a phase, that coming phase); the ones already played this round are marked done; the ones to come are plain. Round 1 has no mythos phase and the ribbon shows its Mythos segment as skipped. During setup and the mulligan the ribbon shows "Setup". When the scenario has ended it shows "End". The ribbon is a single row and never covers the map's middle.

#### Scenario: Enemy phase
- **WHEN** the enemy phase of round 2 begins
- **THEN** the ribbon reads round 2 with Mythos and Investigation done, Enemy lit and Upkeep plain

#### Scenario: First round
- **WHEN** round 1's investigation phase begins
- **THEN** the Mythos segment is shown as skipped and Investigation is lit

### Requirement: Turn order and action pips
During the investigation phase the ribbon's Investigation segment SHALL list the playing investigators in turn order, each as a portrait with action pips. The active investigator is lit and their pips show the actions left: one filled pip per action, three pips by default, more when extra actions apply. Investigators whose turn is done are dimmed with empty pips; those still to play show full pips. A pip empties with a short animation when an action is spent. Outside the investigation phase the segment shows the portraits only. The stat dock no longer shows an action count.

#### Scenario: Roland acts
- **WHEN** it is Roland's turn with 3 actions and he investigates
- **THEN** Roland's portrait is lit in the ribbon and his third pip empties as the test starts

#### Scenario: Second investigator
- **WHEN** Roland ends his turn and Daisy's begins
- **THEN** Roland is dimmed with empty pips and Daisy is lit with three filled pips

### Requirement: End turn stands out when nothing is left
When the active investigator has no actions left (counting extra actions restricted to some cards), the End turn button SHALL glow; actions that cost an action are no longer offered, while free actions and cards that cost no action stay as they are. The glow goes when an action is regained.

#### Scenario: Three actions spent
- **WHEN** Roland has spent his three actions
- **THEN** End turn glows and Draw, Resource and Investigate are gone from the rail, while a fast event in his hand still glows as playable

### Requirement: Enemy intents
Every enemy in play SHALL carry an intent badge, on the map and in the play strip, telling what it will do in the coming enemy phase:
- **attack**, with its damage and horror, when it is engaged and ready;
- **hunt**, when it has the hunter keyword, is ready, is not engaged and no investigator is at its location;
- **rest**, when it is exhausted;
- **wait**, otherwise.

The badge reflects the current state at once: evading an enemy turns its badge to rest, engaging it turns it to attack. Hovering a badge, or the enemy, explains the intent in words.

#### Scenario: Engaged Ghoul
- **WHEN** a ready Ghoul Minion is engaged with Roland
- **THEN** its badge shows attack 1 damage 1 horror
- **WHEN** Roland evades it
- **THEN** its badge shows rest

#### Scenario: Hunter afar
- **WHEN** a ready Swarm of Rats stands at Downtown with nobody there
- **THEN** its badge shows hunt

### Requirement: Turn title
When the active investigator changes during the investigation phase and no hand-off screen is shown for them, a short title with the investigator's portrait and name ("Roland's turn") SHALL play in the middle of the screen, in the style of the phase titles, holding the middle like one and waiting its turn behind whatever holds it. The first turn after the investigation phase's own title gets no turn title when it belongs to the lead investigator who just continued. With private hands the hand-off screen is the turn's beginning and no title plays.

#### Scenario: Two investigators, hands shown
- **WHEN** hands aren't private and Roland ends his turn
- **THEN** "Daisy's turn" plays in the middle, then her options are offered

#### Scenario: Private hands
- **WHEN** hands are private and Roland ends his turn
- **THEN** the hand-off screen for Daisy appears and no turn title plays
