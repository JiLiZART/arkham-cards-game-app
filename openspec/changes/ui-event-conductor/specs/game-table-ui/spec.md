## MODIFIED Requirements

### Requirement: One thing at a time

The middle of the screen SHALL be held by at most one of these at a time:

- the card showcase or a deck pick;
- the scenario introduction;
- an encounter card being revealed, or a card being resolved (which shows only while nothing else holds the middle, because it may wait there for a choice);
- a chaos token draw;
- a skill test result;
- a phase title or the paced phase pause;
- an investigator's turn title.

Whatever needs the middle while it is held waits its turn and plays in the order the game produced it, with nothing dropped. While the middle is held, action floats and effect-hit streaks wait, and they play once it is free. The prompt banner and the skill test panel above the middle stay visible throughout. A prompt choice that needs the middle, such as a deck pick, is not offered until the middle is free.

What waits on the middle SHALL wait on one of three named conditions, each decided in one place:

- **free for events**: nothing holds the middle but the skill-test screen. Animated events that don't take the middle themselves (an enemy move, damage, doom) play then, and the step caption stays only while something else holds it.
- **free for prompts**: nothing holds the middle but the skill-test screen or the paced phase pause. Tips, the switch to a teammate who can act, and the investigator choice shown as avatars appear then.
- **empty**: nothing holds the middle at all. Action floats, effect-hit streaks and the encounter card reveal play then.

#### Scenario: Draw during a test result

- **WHEN** a skill test succeeds, its result is on screen, and the success draws Roland a card
- **THEN** the showcase opens only after the result panel has closed

#### Scenario: Encounter during a phase title

- **WHEN** the mythos phase title is shown and an encounter card is drawn right after it
- **THEN** the encounter card flies in only after the title has gone

#### Scenario: Hit waits for the showcase

- **WHEN** a treachery deals Roland 1 horror while drawn cards are still in the showcase
- **THEN** the hit streak and "−1 horror" play after the showcase is sent to the hand

#### Scenario: Damage during a skill test

- **GIVEN** the skill-test screen holds the middle for Roland's Fight test
- **WHEN** a fast ability deals the Ghoul Minion 1 damage before the chaos draw
- **THEN** the enemy damage plays on the table at once, and its "−1" float waits until the test screen has closed

#### Scenario: A tip during the phase pause

- **GIVEN** a paced game holds the enemy phase's pause in the middle
- **WHEN** a tip applies to the situation
- **THEN** the tip shows beside the pause, and it does not show while a phase title without a pause or a turn title holds the middle

### Requirement: Pace setting

The menu SHALL offer a pace setting with three values, saved with the other settings:

- **Normal**: events play on today's timings.
- **Slow**: every animated event holds at least 1.6 times as long.
- **Tap**: each big event (a chaos token, a test result, an attack, a spawn, an enemy move, an enemy defeated, an investigator defeated, an act or agenda advance, a resolution) holds until the player presses Next in the caption, clicks the event's card, or presses Space or Enter. Follow-on events (damage, enemy damage, clues, doom) play on their timers after the event they belong to.

A drawn encounter card or weakness is held at every pace (see "Encounter card showcase"); its Continue is on the showcase, not in the caption, and the pace does not time it.

Whether an event is on screen, whether it waits for the player, and how long it holds SHALL be decided in one place from the event, what holds the middle, whether the cards on screen have landed, the pace and the draw-by-hand setting, so that every channel that follows the event (the table, sound, floats, the spotlight) sees the same answer.

In Tap mode the game is never stuck: a held event always shows the Next button, and undo and the menu stay available. The default is Normal.

#### Scenario: Tap mode in the enemy phase

- **WHEN** the pace is Tap and the Ghoul Minion attacks Roland
- **THEN** the attack holds with "Enemies attack · Next" until the player presses Next or Space, then the damage plays and the next event waits again

#### Scenario: Slow mode

- **WHEN** the pace is Slow and the Ghoul Minion moves
- **THEN** the move stays on screen at least 1.6 times as long as in Normal

#### Scenario: Encounter card at the Tap pace

- **WHEN** the pace is Tap and an encounter card is drawn
- **THEN** the showcase holds it with its own Continue; the caption shows no second Next

#### Scenario: A token drawn by hand

- **GIVEN** the pace is Normal and draw by hand is on
- **WHEN** Roland's test reaches the chaos draw
- **THEN** the token waits for his tap, and the test result then waits for Continue instead of closing by itself
