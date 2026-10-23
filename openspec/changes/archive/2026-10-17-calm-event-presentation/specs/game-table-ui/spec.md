## ADDED Requirements

### Requirement: Floats for big moments only

Text floating up over the map SHALL be shown only for consequential events:

- an investigator taking damage or horror, or being defeated;
- an enemy attacking, taking damage, spawning or being defeated;
- clues gained, discovered or dropped;
- doom placed;
- the act or agenda advancing.

Every other entry, such as resources gained or lost, cards drawn, played or discarded, moves, engagements, commits and readying, SHALL appear only in the feed and the Journal. A phase change keeps its chapter title and gets no float.

#### Scenario: Gain resource

- **WHEN** Roland takes the Resource action
- **THEN** a line appears in the feed and no text floats over the map

#### Scenario: Enemy attack

- **WHEN** the Ghoul Minion attacks Roland in the enemy phase
- **THEN** the attack line floats up from the Ghoul Minion, and also appears in the feed

### Requirement: Merged feed bursts

When one player choice or one phase step produces several routine feed entries of the same kind, the live feed SHALL show them as one merged line. Routine kinds are cards drawn, resources gained and enemy moves (readying is never shown in the feed). Entries are merged as follows:

- for one investigator, the line sums them, for example "Roland drew 3 cards";
- for every playing investigator receiving the same amount, the line reads "each investigator drew 1 card";
- different kinds from the same burst are joined into one sentence when they follow each other, for example "Each investigator drew a card and took 1 resource";
- several enemy moves are joined into one line, separated by semicolons.

A consequential entry (see "Floats for big moments only") is never merged and breaks a run. The live feed shows at most 4 lines at once. The Journal SHALL keep listing every log entry separately, in order, unmerged.

#### Scenario: Upkeep with two investigators

- **WHEN** upkeep readies cards, then Roland and Daisy each draw 1 card and gain 1 resource
- **THEN** the live feed shows one line, "Each investigator drew a card and took 1 resource", and the Journal shows all four entries

#### Scenario: Attack between draws

- **WHEN** a burst contains a draw, an enemy attack, then another draw by the same investigator
- **THEN** the feed shows three lines in that order, because the attack breaks the run

### Requirement: One thing at a time

The middle of the screen SHALL be held by at most one of these at a time:

- the card showcase or a deck pick;
- the scenario introduction;
- an encounter card being revealed, or a card being resolved (which shows only while nothing else holds the middle, because it may wait there for a choice);
- a chaos token draw;
- a skill test result;
- a phase title or the paced phase pause.

Whatever needs the middle while it is held waits its turn and plays in the order the game produced it, with nothing dropped. While the middle is held, action floats and effect-hit streaks wait, and they play once it is free. The prompt banner and the skill test panel above the middle stay visible throughout. A prompt choice that needs the middle, such as a deck pick, is not offered until the middle is free.

#### Scenario: Draw during a test result

- **WHEN** a skill test succeeds, its result is on screen, and the success draws Roland a card
- **THEN** the showcase opens only after the result panel has closed

#### Scenario: Encounter during a phase title

- **WHEN** the mythos phase title is shown and an encounter card is drawn right after it
- **THEN** the encounter card flies in only after the title has gone

#### Scenario: Hit waits for the showcase

- **WHEN** a treachery deals Roland 1 horror while drawn cards are still in the showcase
- **THEN** the hit streak and "−1 horror" play after the showcase is sent to the hand

### Requirement: Event spotlight

While an animated event plays (an attack, a spawn, enemy damage, an enemy defeated, damage taken, clues, doom, an encounter reveal or an act/agenda advance), the map SHALL dim everything except what the event is about: the enemy, location or card involved, and the investigator's mini-portrait on the map when the event names one. The spotlit card is outlined and lifted slightly above the table. The HUD panels are not dimmed.

The dim fades in and out over at most 200 ms and clears when the event ends. It never takes the pointer and never delays input. An event that names nothing on the map dims nothing. Under reduced motion, the spotlit card is outlined without the dim or the lift.

#### Scenario: Enemy attack spotlight

- **WHEN** the Ghoul Minion at the Study attacks Roland
- **THEN** during the attack the rest of the map is dimmed, while the Ghoul Minion and Roland's mini-portrait stay bright, with the Ghoul Minion outlined and lifted
- **WHEN** the attack event ends
- **THEN** the map returns to full brightness

#### Scenario: Event with no map card

- **WHEN** the agenda advances
- **THEN** the map is not dimmed
