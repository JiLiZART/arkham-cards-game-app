## ADDED Requirements

### Requirement: Stat bar

The UI SHALL show a stat bar in the bottom-left corner for the investigator whose table is on screen (the one being looked at, else the deciding investigator). It is the bar that existed before the player bar, drawn at 75 % of its former size (`zoom: 0.75`, 315 px wide instead of 420), and it shows:

- a portrait of at least 90 px and the name (at least 27 px);
- the investigator's ability text;
- health and sanity remaining, out of their maximum;
- the four skill values.

Every number in the bar SHALL be at least 28 px tall. Above the bar a row SHALL show resources and clues as stacks of the PNG token images, using the fewest tokens (resources 5, 3 and 1; clues 3 and 1), each with its total, and after them the hand count. Every item SHALL have a tooltip naming it with its value and SHALL flash briefly when it changes. Clicking the portrait SHALL open the investigator card in the card detail modal. Options tied to the investigator card stay on the avatar and its sheet, as the player bar defines. The player bar and the avatar sheet SHALL remain as they are. In the phone layout mode the bar is not drawn; the sheet serves there.

#### Scenario: Back in the corner

- **WHEN** the table is shown at 1600×900 on Roland's turn
- **THEN** a stat bar stands in the bottom-left with Roland's portrait, ability, health 9/9, sanity 5/5 and his four skills, 315 px wide, and above it his resource stack, clue stack and hand count

#### Scenario: Looking at a teammate

- **WHEN** Roland taps Daisy's avatar to look at her
- **THEN** the stat bar shows Daisy's portrait, numbers and token row until he returns

#### Scenario: Resource stack

- **WHEN** the investigator on screen has 9 resources
- **THEN** the row shows one 5-resource token, one 3-resource token and one 1-resource token from the PNG art, labelled 9

### Requirement: Hand count icon

The hand count in the stat bar's token row and in the avatar sheet SHALL be a small image of the player card back (at the token stacks' height, 40 px before the bar's zoom) followed by the number of cards in hand, at the same font size as the clue and resource totals. It MUST NOT render as a text label under any circumstance: it does not depend on the icon sprite. Its tooltip names the count and the hand limit, and the number turns red over the limit.

#### Scenario: Five cards

- **WHEN** Roland holds 5 cards
- **THEN** the row shows the card back image and "5" at the clue total's size, with the tooltip "Cards in hand: 5 (hand limit 8)"

#### Scenario: Sprite without the symbol

- **WHEN** the loaded icon sprite has no `card` symbol
- **THEN** the hand count still shows the card back image and the number, and no word appears

## MODIFIED Requirements

### Requirement: Instruction bar

When a choice is pending for the investigator whose hand is on screen, a bar under the top bar SHALL show that investigator's portrait and name, an instruction in plain words saying what to tap and what it does, and the choice's primary options as buttons inside the bar. Primary options are the ones that stand for no card and no action to take: Done, Pass, Keep hand, Redraw, Take nothing, Resign and End turn. Draw, Gain resource and Investigate stay on the action rail. Options that belong to a card stay on that card.

The instruction is written for a first-time player and names the target: "Tap a card to commit it to the test, then Done", "Tap the room the Ghoul moves to", "Tap a card to discard (2 more)". When no instruction exists for a prompt, the bar shows the prompt's own sentence. The phase pause keeps its title and Continue and shows no bar. While events play, the bar shows no choice.

When the decision belongs to another investigator who can act (a commit to another's test, a reaction) and the table on screen is not theirs, the bar SHALL NOT show that investigator's instruction without its buttons. It SHALL instead show who can act ("Daisy Walker can commit cards") with one button that switches the table to them, the same as tapping their pulsing avatar (with private hands the "Pass to" screen follows). The bar MUST never show an instruction that has no button or tap that answers it.

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

### Requirement: Someone else can act

When the pending decision is a help to another investigator's test (a commit window for a test that is not the decider's own) or a reaction, and the decider is not the active investigator, that investigator's avatar SHALL pulse with a short label naming what they can do ("Daisy can commit cards", "Daisy may react"). Tapping it, or the instruction bar's button, SHALL perform the hand-off (switch the view and, with private hands, show the "Pass to" screen); until then the table stays on the active player's view with the decision's options not offered.

A decision that is the decider's own, including the commit window of their own skill test (a treachery's test in the mythos phase, a forced test at the end of a turn), SHALL NOT use the pulsing hand-off: the table switches to the decider as any decision does (with private hands through the "Pass to" screen), and their choices are offered at once.

#### Scenario: Commit to a teammate's test

- **WHEN** Roland's test opens Daisy's commit window
- **THEN** Daisy's avatar pulses with "Daisy can commit cards"; tapping it shows "Pass to Daisy" (private hands) and then her view with the commit options

#### Scenario: Daisy's own treachery test

- **WHEN** Daisy draws Rotting Remains in the mythos phase while Roland is the active investigator
- **THEN** the skill-test screen opens on Daisy's table with her fan and the bar's Done (after "Pass to Daisy" with private hands); no avatar pulses and nothing waits for a tap on the bar

#### Scenario: Choosing an investigator

- **WHEN** a card asks Roland to choose an investigator at his location and Daisy is eligible
- **THEN** Daisy's avatar is highlighted in the bar and tapping it submits the choice

### Requirement: Title screen and settings

The game SHALL open on a title screen: the title, Continue (only while a game, a campaign or a save exists at that moment), New campaign, How to play, and a gear that opens the settings screen. Settings hold language, private hands, drawing tokens by hand, pace, tips, Reset tips, music and sound effects; Back returns to the title. The campaign log is reached from Continue when a campaign is between scenarios, and from the game's Menu button. Abandon campaign on the title clears the campaign and the save and leaves the title without Continue; it never needs a reload to take effect.

#### Scenario: Cold load

- **WHEN** the app loads with no save
- **THEN** the title shows New campaign and How to play, no Continue, and the gear

#### Scenario: Continue with a save

- **WHEN** the app loads with a saved scenario in progress
- **THEN** Continue is the first button and restores the game

#### Scenario: Abandon

- **WHEN** the player presses Abandon campaign on the title
- **THEN** the campaign and the save are gone and the title shows no Continue, without a reload; pressing New campaign opens the wizard
