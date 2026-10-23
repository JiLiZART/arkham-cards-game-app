## ADDED Requirements

### Requirement: Step captions

While the events of an automated step play, a caption under the top bar SHALL name the step, with the investigator's portrait and name when the step has one: "Doom", "Roland draws an encounter card", "Hunters move", "Enemies attack", "Upkeep", "Roland discards down to 8 cards". The caption appears with the step's first event and stays until its last event has played, then gives way to the next caption or to the prompt of the next choice. The caption never takes the middle of the screen and never blocks input. Step entries are not shown in the live feed; the Journal shows them as section lines between the entries they introduce.

#### Scenario: Enemy phase

- **WHEN** the lead investigator continues into an enemy phase where a Ghoul Minion hunts and then a Swarm of Rats attacks Daisy
- **THEN** "Hunters move" is shown while the Ghoul moves, then "Enemies attack" while the Rats attack and Daisy takes damage, then the upkeep title

#### Scenario: Caption gives way to the prompt

- **WHEN** Roland's encounter card is a treachery that asks him to choose
- **THEN** "Roland draws an encounter card" shows while the card flies in, and the prompt replaces it when the choice is offered

### Requirement: The camera follows the event

While an animated event plays, the map camera SHALL pan to what the event is about: the enemy that moves or attacks, the location a card spawns at, or the investigator the event names, when any of these is on the map. The pan is eased and never faster than the event's own duration. When no event plays, the camera returns to the deciding investigator's location, as before. Dragging the map during an event stops the pan for that event. Under reduced motion the camera jumps instead of panning.

#### Scenario: Hunter moves off screen

- **WHEN** the Ghoul Minion moves from the Attic to the Hallway while the camera is on Roland in the Cellar
- **THEN** the camera pans to the Ghoul for its move, then back to Roland when his turn comes

#### Scenario: Agenda advances

- **WHEN** the agenda advances
- **THEN** the camera doesn't move, because nothing on the map is involved

### Requirement: Enemy moves are a beat

An enemy moving on its own (a hunter, or an effect that moves an enemy) SHALL play as an animated event: the map spotlights the enemy, its card travels to the new location over the event's duration, and the feed line appears with it. Enemy moves are not floated.

#### Scenario: Ghoul hunts

- **WHEN** in the enemy phase the Ghoul Minion moves one location toward Roland
- **THEN** the map dims around the Ghoul while it travels, the feed shows "Ghoul Minion moves to Hallway", and the next event starts only after the move

### Requirement: Pace setting

The menu SHALL offer a pace setting with three values, saved with the other settings:

- **Normal**: events play on today's timings.
- **Slow**: every animated event holds at least 1.6 times as long.
- **Tap**: each big event (an encounter reveal, a chaos token, a test result, an attack, a spawn, an enemy move, an enemy defeated, an investigator defeated, an act or agenda advance, a resolution) holds until the player presses Next in the caption, clicks the event's card, or presses Space or Enter. Follow-on events (damage, enemy damage, clues, doom) play on their timers after the event they belong to.

In Tap mode the game is never stuck: a held event always shows the Next button, and undo and the menu stay available. The default is Normal.

#### Scenario: Tap mode in the enemy phase

- **WHEN** the pace is Tap and the Ghoul Minion attacks Roland
- **THEN** the attack holds with "Enemies attack · Next" until the player presses Next or Space, then the damage plays and the next event waits again

#### Scenario: Slow mode

- **WHEN** the pace is Slow and an encounter card flies in
- **THEN** it stays in the middle at least 1.6 times as long as in Normal
