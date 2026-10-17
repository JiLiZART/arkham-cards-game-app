## ADDED Requirements

### Requirement: New game wizard
Starting a campaign SHALL be a sequence of full-screen steps, one decision each, with a Back control on every step and the choices kept when going back: campaign, investigators, decks, difficulty, ready. Every control SHALL be at least 44 px tall. The investigators step shows the investigators as avatar tiles (the round class-ringed portrait, the name, the class); tapping adds one, up to four, and the order tapped is the turn order, shown as P1 to P4 badges on the tiles; tapping again removes it. The decks step shows, for each chosen investigator, the decks available as cards (the starter decks and any saved custom decks), one selected. The ready step shows the chosen investigators in order as avatars, the chosen bag, and the first scenario's name and icon, with a Begin control that starts the campaign.

#### Scenario: Two investigators in order
- **WHEN** the player taps Daisy then Roland on the investigators step
- **THEN** Daisy shows P1 and Roland P2, and the campaign starts with Daisy as the lead

#### Scenario: Going back keeps the picks
- **WHEN** the player chose two investigators, moved to the decks step, and goes back
- **THEN** the two investigators are still selected in the same order

#### Scenario: Begin
- **WHEN** the player taps Begin on the ready screen
- **THEN** the campaign starts with the chosen investigators, decks and difficulty, as the old form did

### Requirement: Difficulty shown as the bag
The difficulty step SHALL show every difficulty the campaign defines (easy, standard, hard, expert) as a card drawing the bag's tokens as chaos token icons grouped by kind with their counts, and a derived line with the average modifier of the numeric tokens. Tapping a card selects it; the selection is shown on the ready screen as the same bag card.

#### Scenario: Standard bag
- **WHEN** the difficulty step shows Night of the Zealot
- **THEN** the standard card shows +1, 0 ×2, −1 ×3, −2 ×2, −3, −4, skull ×2, cultist, tablet, auto-fail and elder sign as token icons, and "average −1.3"

#### Scenario: Expert available
- **WHEN** the difficulty step is shown
- **THEN** hard and expert cards are present and selectable

### Requirement: Title screen and settings
The app SHALL open on a title screen with Continue (when a game or campaign is saved), New campaign, How to play and a settings control. Settings (language, privacy, draw by hand, pace, tips, reset tips, music and effects) SHALL be on their own screen reached from the settings control, with Back.

#### Scenario: Continue
- **WHEN** a saved game exists and the app opens
- **THEN** the title screen offers Continue first, and it resumes the game

## MODIFIED Requirements

### Requirement: Game menus
The UI SHALL provide screens for: the title screen, a new-campaign wizard (campaign, investigators, decks, difficulty, ready), continue saved game, campaign log between scenarios, how to play, and settings including language selection. Wherever an investigator is chosen or shown in these screens, they SHALL appear as their avatar: the round portrait with the class ring, as on the map.

#### Scenario: Continue game
- **WHEN** a saved game exists and the player opens the app
- **THEN** a "Continue" option resumes it

#### Scenario: Avatars in the campaign log
- **WHEN** the campaign log lists the investigators between scenarios
- **THEN** each is shown with their avatar, trauma and experience beside it
