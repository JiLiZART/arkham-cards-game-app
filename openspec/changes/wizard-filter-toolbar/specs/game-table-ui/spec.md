## MODIFIED Requirements

### Requirement: New game wizard

Starting a campaign SHALL be a sequence of full-screen steps, one decision each, with a Back control on every step and the choices kept when going back: campaign, investigators, decks, difficulty, ready. Every control SHALL be at least 44 px tall. The investigators step shows the investigators as avatar tiles (the round class-ringed portrait, the name, the class); tapping adds one, up to four, and the order tapped is the turn order, shown as P1 to P4 badges on the tiles; tapping again removes it. The decks step shows, for each chosen investigator, the decks available as cards (the starter decks and any saved custom decks), one selected. The ready step shows the chosen investigators in order as avatars, the chosen bag, and the first scenario's name and icon, with a Begin control that starts the campaign.

The campaign and investigators steps' filters SHALL be a toolbar of one row: the search, the step's inline filter (the campaign kind as a segmented control; the class icons) and a Filters control that says how many filters are set. On the desktop the Filters control opens the filter panel as a popover anchored under it, closed by a tap outside, by Escape or by the control again; the filters set in the panel show as removable pills under the toolbar.

On the phone layout the wizard SHALL keep the same steps and controls in a shape that leaves the step's body most of a 393 px tall screen: the step's title and its dots on one row of at most 40 px, with no hint line; the filter toolbar as one row of 44 px holding only the search and the Filters control, every filter (the kind or the class included) in a bottom sheet the Filters control opens, with the pills under the toolbar as on the desktop; a sticky footer of 48 px with Back and Continue; tiles in a grid of three columns; the campaign sheet and the investigator card opened as a bottom sheet from a tile's details control instead of a sidebar; on the decks step the chosen investigators' avatars and the deck tabs on one horizontal scrolling row, the deck's editing area taking the rest of the body, and the card pool opening full-screen with its own Close; the ready step as one sheet in two columns (the campaign, the investigators and the first scenario beside the bag) that fits the body without scrolling, with up to four investigators. The search field SHALL not be covered by the on-screen keyboard: the body scrolls it into view.

#### Scenario: Two investigators in order

- **WHEN** the player taps Daisy then Roland on the investigators step
- **THEN** Daisy shows P1 and Roland P2, and the campaign starts with Daisy as the lead

#### Scenario: Going back keeps the picks

- **WHEN** the player chose two investigators, moved to the decks step, and goes back
- **THEN** the two investigators are still selected in the same order

#### Scenario: Begin

- **WHEN** the player taps Begin on the ready screen
- **THEN** the campaign starts with the chosen investigators, decks and difficulty, as the old form did

#### Scenario: Filters panel on the desktop

- **WHEN** the player taps Filters on the investigators step at 1440×900
- **THEN** a popover opens under the control with the cycle, the rules, the stat minimums, the sort, Clear all and the match count, and Escape closes it with the filters it set still applied

#### Scenario: Campaign step on a phone

- **WHEN** the wizard opens at 852×393
- **THEN** the title row is at most 40 px, the only filter controls are the search and a Filters control on one row of 44 px with the Complete pill under them, the tiles fill the body in three columns, and Back and Continue sit in a 48 px footer at the bottom edge

#### Scenario: Filters on a phone

- **WHEN** the player taps Filters on the campaign step at 852×393
- **THEN** a bottom sheet rises with the kind, the rules, the length, Clear all and the match count; choosing "Side scenarios" shows the grid behind it change, and closing the sheet leaves a "Side scenarios" pill under the toolbar

#### Scenario: Investigator details on a phone

- **WHEN** the player taps the details control on Roland's tile at 852×393
- **THEN** his card and text rise in a bottom sheet, and the tile grid stays where it was when the sheet closes

#### Scenario: Deck step on a phone

- **WHEN** the deck step opens with two investigators at 852×393
- **THEN** their avatars and the deck tabs share one horizontal row that scrolls sideways, the editing area fills the body beneath, and the card pool opens full-screen with a Close control
