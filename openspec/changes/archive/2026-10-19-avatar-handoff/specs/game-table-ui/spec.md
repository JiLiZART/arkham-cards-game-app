## MODIFIED Requirements

### Requirement: Hot-seat play

The UI SHALL support 1–4 investigators on one device. The deciding investigator's view (hand, play area, choices) is the default; any investigator can be looked at from the player bar. No screen SHALL stand between players: when the decision passes to another investigator, their view is shown at once, with the turn title (see Turn title) announcing them, and their hand is visible.

#### Scenario: Turn handoff

- **WHEN** Roland ends his turn and Agnes is next
- **THEN** "Agnes's turn" plays across the middle and Agnes's hand and play area are shown with her avatar marked in the bar, with nothing to press

### Requirement: Viewing another investigator

Tapping another investigator's avatar SHALL switch the table to that investigator's view: the play strip shows their assets and threats, their marker is lit on the map, and their hand is shown. Choices stay reachable only while the deciding player's view is on screen. A control in the bar returns to the deciding player's view, and the view SHALL return by itself when the decision passes to another investigator.

#### Scenario: Look at a teammate

- **WHEN** it is Roland's turn and he taps Daisy's avatar
- **THEN** the strip shows Daisy's assets and threats, her marker is lit, her hand is shown, and Roland's choices are not offered until he returns to his view

#### Scenario: Snap back

- **WHEN** Roland is viewing Daisy and his turn ends, making Daisy the deciding player
- **THEN** the view returns to the deciding player's rules (Daisy's view, her hand shown)

### Requirement: Someone else can act

When the pending decision is a help to another investigator's test (a commit window for a test that is not the decider's own) or a reaction, and the decider is not the active investigator, that investigator's avatar SHALL pulse with a short label naming what they can do ("Daisy can commit cards", "Daisy may react") and, after about a second with no turn title, the table SHALL switch to their view by itself with the decision's options offered. Tapping the avatar or the instruction bar's button switches sooner.

A decision that is the decider's own, including the commit window of their own skill test (a treachery's test in the mythos phase, a forced test at the end of a turn), SHALL NOT pulse: the table switches to the decider as any decision does, and their choices are offered at once.

#### Scenario: Commit to a teammate's test

- **WHEN** Roland's test opens Daisy's commit window
- **THEN** Daisy's avatar pulses with "Daisy can commit cards", no title plays, and about a second later her view is shown with the commit options, with nothing pressed

#### Scenario: Daisy's own treachery test

- **WHEN** Daisy draws Rotting Remains in the mythos phase while Roland is the active investigator
- **THEN** the skill-test screen opens on Daisy's table with her fan and the bar's Done; no avatar pulses and nothing waits for a tap on the bar

#### Scenario: Choosing an investigator

- **WHEN** a card asks Roland to choose an investigator at his location and Daisy is eligible
- **THEN** Daisy's avatar is highlighted in the bar and in the middle of the screen, and tapping either submits the choice

### Requirement: Turn title

When an investigator's turn begins, or a decision of their own begins for an investigator who wasn't deciding (their own test or choice, in any phase), a short title with the investigator's portrait and name ("Roland's turn") SHALL play in the middle of the screen, in the style of the phase titles, holding the middle like one and waiting its turn behind whatever holds it. The first turn after the investigation phase's own title gets no turn title when it belongs to the lead investigator who just continued. A help to another investigator's test (a commit window) or a reaction plays no title: the table switches quietly (see Someone else can act).

#### Scenario: Two investigators, hands shown

- **WHEN** Roland ends his turn
- **THEN** "Daisy's turn" plays in the middle, then her options are offered

#### Scenario: Private hands

- **WHEN** Roland ends his turn with any settings
- **THEN** no pass screen appears; the turn title is the only transition

#### Scenario: A help plays no title

- **WHEN** Roland's test opens Daisy's commit window
- **THEN** no title plays; Daisy's avatar pulses and the table switches to her

### Requirement: Instruction bar

When a choice is pending for the investigator whose hand is on screen, a bar under the top bar SHALL show that investigator's portrait and name, an instruction in plain words saying what to tap and what it does, and the choice's primary options as buttons inside the bar. Primary options are the ones that stand for no card and no action to take: Done, Pass, Keep hand, Redraw, Take nothing, Resign and End turn. Draw, Gain resource and Investigate stay on the action rail. Options that belong to a card stay on that card.

The instruction is written for a first-time player and names the target: "Tap a card to commit it to the test, then Done", "Tap the room the Ghoul moves to", "Tap a card to discard (2 more)". When no instruction exists for a prompt, the bar shows the prompt's own sentence. The phase pause keeps its title and Continue and shows no bar. While events play, the bar shows no choice.

When the decision belongs to another investigator who can act (a commit to another's test, a reaction) and the table on screen is not theirs, the bar SHALL NOT show that investigator's instruction without its buttons. It SHALL instead show who can act ("Daisy Walker can commit cards") with one button that switches the table to them, the same as tapping their pulsing avatar, until the table switches by itself. The bar MUST never show an instruction that has no button or tap that answers it.

#### Scenario: Commit

- **WHEN** Roland starts an investigate test
- **THEN** the bar reads "Tap a card to commit it to the test, then Done" with a Done button in it, and the rail shows no Done

#### Scenario: End turn

- **WHEN** it is Roland's turn
- **THEN** the bar reads his actions-left instruction with End turn as its button, and the rail shows Draw, Resource and Investigate

#### Scenario: No translation

- **WHEN** a card script asks a question with no instruction string
- **THEN** the bar shows the engine's sentence without the investigator's name prefix, as the banner does today

#### Scenario: Another can act

- **WHEN** Roland's test opens Daisy's commit window while Roland's table is on screen
- **THEN** the bar reads "Daisy Walker can commit cards" with a button that switches to Daisy's table, where the bar shows her commit instruction with Done

### Requirement: Phase pacing on screen

When a phase begins in a paced game, its title SHALL stay across the middle of the screen with the round under it and the lead investigator's avatar ringed by a countdown. When the ring closes (3 seconds) the phase begins by itself; a tap on the avatar, or Space or Enter, begins it sooner. A phase with nothing to show SHALL begin at once, with no title and no avatar: an enemy phase in which no enemy in play is ready and either engaged or a hunter. The pause is an ordinary choice of the lead investigator, made by itself when it isn't made sooner, so saves, replays and Undo see it like any other.

Titles never stack: the next phase's title can appear only after the previous phase has begun and resolved, and after the chaos draws, test results and encounter reveals it waits for.

Games that aren't paced, such as old saves or imported logs that have no pauses, keep the timed title that fades by itself.

#### Scenario: End of the investigation phase

- **WHEN** the last investigator ends their turn in round 1 with an enemy engaged with them
- **THEN** "Enemy phase · Round 1" stays on screen with Roland's avatar and its countdown, and no enemy attacks yet
- **WHEN** the countdown closes, or Roland's avatar is tapped
- **THEN** the title goes and the enemy phase resolves

#### Scenario: Private hands

- **WHEN** Daisy's hand was last on screen while Roland is the lead investigator
- **THEN** the phase title with Roland's avatar shows without any hand-off screen

#### Scenario: Nothing in the enemy phase

- **WHEN** the investigation phase ends with no enemy in play
- **THEN** no enemy phase title shows and the upkeep phase's title follows at once

## ADDED Requirements

### Requirement: Investigator choices as avatars

When every option of the pending choice is an investigator, the choice SHALL be shown as a row of large avatars with names across the middle of the screen, lit as the bar lights them, with the prompt above; tapping one submits it, as does the bar. When exactly one investigator is eligible, the overlay SHALL show that avatar for about a second and then submit the choice by itself, a tap submitting sooner; the choice is made through an ordinary action, so undo and replay see it like any other.

#### Scenario: Who takes the damage

- **WHEN** an effect asks the lead investigator which of two investigators takes 1 damage
- **THEN** both avatars appear large in the middle and tapping Daisy's gives her the damage

#### Scenario: One eligible investigator

- **WHEN** a card asks Roland to choose an investigator and only Daisy is eligible
- **THEN** Daisy's avatar is shown in the middle for about a second and the choice is made without a tap

#### Scenario: Undo

- **WHEN** the player presses Undo after an automatic single-investigator choice
- **THEN** the choice is taken back like any other action
