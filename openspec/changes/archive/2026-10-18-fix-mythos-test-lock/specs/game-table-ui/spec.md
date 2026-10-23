## ADDED Requirements

### Requirement: Skill-test line alignment

The skill-test screen's line ("Willpower test · 3 vs 4") SHALL be centred on the screen's vertical axis, the same axis as the calculation strip, at every window width; the subject on the left and the placed cards on the right keep their places.

#### Scenario: Line over strip

- **WHEN** the skill-test screen is open at 1600×900
- **THEN** the horizontal centre of the line and the horizontal centre of the strip are within 2 px of each other and of the screen's centre

### Requirement: Game report

The Debug panel SHALL offer **Copy report**, which puts one JSON on the clipboard holding everything needed to recreate the table: the scenario setup and the action list (the replay log), the campaign, the settings (language, private hands, draw by hand, pace), the view (the investigator being looked at), the pending prompt's kind and investigator, and the app version. When the clipboard is refused, the report SHALL be shown selected in a text box so the player can copy it by hand. The panel SHALL also offer **Paste report…**: a text box and a Load button that replays a pasted report and shows its table, with a plain error when it can't be replayed. A report pasted into a later build that still replays SHALL give the same table.

#### Scenario: Copy and paste

- **WHEN** the player presses Copy report in a stuck game and, in a fresh page, pastes it into Paste report… and presses Load
- **THEN** the same scenario, round, pending choice and hands are on the table

#### Scenario: Clipboard refused

- **WHEN** the browser refuses clipboard access
- **THEN** the report appears selected in a text box, ready to copy

## MODIFIED Requirements

### Requirement: Step captions

While the events of an automated step play, a caption under the top bar SHALL name the step, with the investigator's portrait and name when the step has one: "Doom", "Roland draws an encounter card", "Hunters move", "Enemies attack", "Upkeep", "Roland discards down to 8 cards". The caption appears with the step's first event and stays until its last event has played, then gives way to the next caption or to the prompt of the next choice. The caption never takes the middle of the screen and never blocks input. Step entries are not shown in the live feed; the Journal shows them as section lines between the entries they introduce.

The caption SHALL give way to the instruction bar as soon as a choice waits for the player and nothing plays, including while the skill-test screen holds the middle (a commit window of a test drawn in the mythos phase). It stays only while events play or while something other than the test screen holds the middle (drawn cards in the showcase after an upkeep draw). The bar with its Done MUST be reachable in every commit window, whatever phase it opens in.

#### Scenario: Enemy phase

- **WHEN** the lead investigator continues into an enemy phase where a Ghoul Minion hunts and then a Swarm of Rats attacks Daisy
- **THEN** "Hunters move" is shown while the Ghoul moves, then "Enemies attack" while the Rats attack and Daisy takes damage, then the upkeep title

#### Scenario: Caption gives way to the prompt

- **WHEN** Roland's encounter card is a treachery that asks him to choose
- **THEN** "Roland draws an encounter card" shows while the card flies in, and the prompt replaces it when the choice is offered

#### Scenario: Mythos test with a card to commit

- **WHEN** Roland draws Crypt Chill in the mythos phase while holding Guts (with a Ghoul engaged in his strip)
- **THEN** after the card is tapped in the showcase the skill-test screen opens with the instruction bar reading "Tap a card to commit it to the test, then Done" and a Done button; Done closes the window and the chaos draw follows
