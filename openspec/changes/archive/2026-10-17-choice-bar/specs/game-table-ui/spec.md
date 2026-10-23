## ADDED Requirements

### Requirement: Instruction bar

When a choice is pending for the investigator whose hand is on screen, a bar under the top bar SHALL show that investigator's portrait and name, an instruction in plain words saying what to tap and what it does, and the choice's primary options as buttons inside the bar. Primary options are the ones that stand for no card and no action to take: Done, Pass, Keep hand, Redraw, Take nothing, Resign and End turn. Draw, Gain resource and Investigate stay on the action rail. Options that belong to a card stay on that card.

The instruction is written for a first-time player and names the target: "Tap a card to commit it to the test, then Done", "Tap the room the Ghoul moves to", "Tap a card to discard (2 more)". When no instruction exists for a prompt, the bar shows the prompt's own sentence. The phase pause keeps its title and Continue and shows no bar. While events play, the bar shows no choice.

#### Scenario: Commit

- **WHEN** Roland starts an investigate test
- **THEN** the bar reads "Tap a card to commit it to the test, then Done" with a Done button in it, and the rail shows no Done

#### Scenario: End turn

- **WHEN** it is Roland's turn
- **THEN** the bar reads his actions-left instruction with End turn as its button, and the rail shows Draw, Resource and Investigate

#### Scenario: No translation

- **WHEN** a card script asks a question with no instruction string
- **THEN** the bar shows the engine's sentence without the investigator's name prefix, as the banner does today

### Requirement: Choice spotlight

When the pending choice is about particular things, everything that isn't an option SHALL dim: cards on the map through the same dim as the event spotlight, and cards in the strip, the hand and the fan, portraits and the act, agenda and piles through a dimmed style. The options stay bright and outlined, wherever they are. This applies to choices that pick a target, cards to commit, where to assign damage or horror, a card to discard, a location or an investigator, or an enemy. Choosing an action on your turn, the mulligan, the phase pause and deck picks in the showcase dim nothing. The dim appears when the choice is offered, after the events before it have played, and clears when it is answered. It never takes the pointer. While an event plays, the event's spotlight wins.

#### Scenario: Assign damage

- **WHEN** Roland must assign 1 damage with Guard Dog in play
- **THEN** the map, the hand, the act and the piles dim while Roland's portrait and Guard Dog in the strip stay bright and outlined
- **WHEN** he taps Guard Dog
- **THEN** the dim clears

#### Scenario: Turn choice

- **WHEN** it is Roland's turn with every action available
- **THEN** nothing dims

#### Scenario: Commit

- **WHEN** Roland is asked to commit cards to his test
- **THEN** his hand cards with matching icons stay bright, the rest of the fan dims, and the map dims except the tested location
