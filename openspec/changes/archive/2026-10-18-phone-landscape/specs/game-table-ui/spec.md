## ADDED Requirements

### Requirement: Phone layout mode

On a viewport under 500 px tall, or under 900 px wide in landscape, the table SHALL use the phone layout: the map fills the screen under a single top bar of at most 36 px (the player bar with the phase initials, a journal icon and the chaos bag icon); the act, agenda and piles in a left drawer and the Journal in a right drawer, each opened from an edge handle or a swipe and closed by a tap outside; the hand as a bottom drawer (see Hand drawer); the instruction bar above the hand drawer holding its buttons together with Draw, Resource and Investigate; the play strip as a column of thumbnails along the right edge that expands on tap. Every overlay (skill test, showcase, hand-off, titles, tips, modals) SHALL fit the short screen with no scrolling and no element off screen. The map camera SHALL frame locations within the phone insets. Nothing in the rules or the sequence of screens changes between the layouts.

#### Scenario: iPhone in landscape

- **WHEN** the game is opened at 852×393
- **THEN** the map fills the screen under a 36 px bar, no panel overlaps another, the instruction bar with Draw, Resource and Investigate sits above the hand drawer, and a location is framed within the visible map

#### Scenario: Drawers

- **WHEN** the player swipes from the left edge
- **THEN** the act, agenda and piles drawer slides in over the map, and a tap outside closes it

#### Scenario: Desktop unchanged

- **WHEN** the game is opened at 1600×900
- **THEN** the desktop layout is shown as before

### Requirement: Hand drawer

In the phone layout the hand SHALL be a drawer along the bottom edge: collapsed, the top 60 px of the cards peek in a row, playable cards peeking 20 px higher and highlighted; a swipe up or a tap on the peek opens the fan over the map at a size where the card under the finger is readable (at least 220 px tall); a tap on a card chooses it when it is an option and the drawer closes; a tap outside or a swipe down closes it without choosing. While a choice needs a hand card (a commit, a play), the drawer MAY open by itself.

#### Scenario: Play a card

- **WHEN** it is Roland's turn on a phone and two cards are playable
- **THEN** those two peek higher in the collapsed drawer; tapping the peek opens the fan; tapping Machete plays it and the drawer closes

### Requirement: Touch interaction

On a touch screen, a tap on a card, a marker or a token SHALL peek it: the details column and, where one exists, the enlarged copy, without choosing; a second tap on the same thing SHALL choose it when it is an option; a long press SHALL open the detail modal. Pointer devices keep hover. Every tap target SHALL be at least 44×44 px. Dragging a marker to move keeps working with touch.

#### Scenario: Peek then choose

- **WHEN** Roland taps the Hallway on a phone during his turn
- **THEN** the Hallway's details are shown and nothing is chosen; a second tap chooses "Move to Hallway"

#### Scenario: Long press

- **WHEN** the player long-presses a card in the strip
- **THEN** the card detail modal opens

### Requirement: Orientation and safe areas

The page SHALL use the full screen including the notch areas, keeping bars, drawers and buttons inside the safe-area insets. In portrait on a phone the game SHALL show a full-screen card asking to rotate the phone, and resume where it was once rotated.

#### Scenario: Portrait

- **WHEN** a phone is held upright with a game in progress
- **THEN** a "rotate your phone" card covers the screen and the game is unchanged when the phone is turned sideways
