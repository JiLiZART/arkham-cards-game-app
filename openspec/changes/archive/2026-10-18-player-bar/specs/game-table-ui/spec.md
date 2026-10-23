## ADDED Requirements

### Requirement: Player bar

The top bar SHALL show every investigator in turn order as an avatar (the round class-ringed portrait) with health remaining and sanity remaining under it and, during the investigation phase, their action pips (as the ribbon showed them). The active investigator SHALL be ringed; the investigator whose view is on screen SHALL be marked; defeated or resigned investigators SHALL be greyed. A changed count SHALL flash. The bar replaces the stat dock and the right-edge investigator tokens; tapping the viewer's own avatar SHALL open a sheet with the investigator card (enlargeable), the ability text with any pending option tied to the investigator card, the four skills, resources, clues and the hand count; the sheet closes on Escape, a tap outside or the avatar again.

#### Scenario: Three-player bar

- **WHEN** Roland, Daisy and Agnes play
- **THEN** the bar shows three avatars in turn order with health and sanity under each, Roland's ringed during his turn with three pips, and no tokens on the right edge and no dock at the bottom left

#### Scenario: Own sheet

- **WHEN** Roland taps his own avatar
- **THEN** a sheet shows his card, ability text, skills, resources, clues and hand count, and a tap outside closes it

### Requirement: Viewing another investigator

Tapping another investigator's avatar SHALL switch the table to that investigator's view: the play strip shows their assets and threats, their marker is lit on the map, and their hand is shown only when hands are not private, or when they are the deciding player and have taken the device. Choices stay reachable only while the deciding player's view is on screen. A control in the bar returns to the deciding player's view, and the view SHALL return by itself when the decision passes to another investigator.

#### Scenario: Look at a teammate

- **WHEN** it is Roland's turn with private hands and he taps Daisy's avatar
- **THEN** the strip shows Daisy's assets and threats, her marker is lit, her hand is not shown, and Roland's choices are not offered until he returns to his view

#### Scenario: Snap back

- **WHEN** Roland is viewing Daisy and his turn ends, making Daisy the deciding player
- **THEN** the view returns to the deciding player's rules (Daisy's view, hand behind the hand-off when private)

### Requirement: Someone else can act

When the pending decision belongs to an investigator other than the active one (a commit to another's test, a reaction), that investigator's avatar SHALL pulse with a short label naming what they can do ("Daisy can commit cards", "Daisy may react"). Tapping it SHALL perform the hand-off (switch the view and, with private hands, show the "Pass to" screen); until then the table stays on the active player's view with the decision's options not offered.

#### Scenario: Commit to a teammate's test

- **WHEN** Roland's test opens Daisy's commit window
- **THEN** Daisy's avatar pulses with "Daisy can commit cards"; tapping it shows "Pass to Daisy" (private hands) and then her view with the commit options

#### Scenario: Choosing an investigator

- **WHEN** a card asks Roland to choose an investigator at his location and Daisy is eligible
- **THEN** Daisy's avatar is highlighted in the bar and tapping it submits the choice

## MODIFIED Requirements

### Requirement: Hot-seat play

The UI SHALL support 1–4 investigators on one device. The deciding investigator's view (hand, play area, choices) is the default; any investigator can be looked at from the player bar. The hand MUST be hidden behind a "pass to <player>" screen when hand-off privacy is enabled, and that screen appears when the deciding player's view is taken by tapping their avatar or when the decision passes to them.

#### Scenario: Turn handoff

- **WHEN** Roland ends his turn and Agnes is next
- **THEN** a "Pass to Agnes" screen appears, and after confirming, Agnes's hand and play area are shown with her avatar marked in the bar

### Requirement: Turn order and action pips

During the investigation phase the player bar's avatars, in turn order, SHALL carry action pips. The active investigator is ringed and their pips show the actions left: one filled pip per action, three pips by default, more when extra actions apply. Investigators whose turn is done are dimmed with empty pips; those still to play show full pips. A pip empties with a short animation when an action is spent. Outside the investigation phase the avatars show no pips. The ribbon shows the phases only.

#### Scenario: Roland acts

- **WHEN** it is Roland's turn with 3 actions and he investigates
- **THEN** Roland's avatar is ringed in the bar and his third pip empties as the test starts

#### Scenario: Second investigator

- **WHEN** Roland ends his turn and Daisy's begins
- **THEN** Roland is dimmed with empty pips and Daisy is ringed with three filled pips

## REMOVED Requirements

### Requirement: Stat bar

**Reason**: The player bar and the viewer's sheet hold everything the dock showed, in one place for all investigators.

**Migration**: Health and sanity are under each avatar; the ability text, skills, resources, clues and hand count are in the sheet opened from the viewer's own avatar; pending options tied to the investigator card are offered in the sheet; changes flash on the avatar's counts.

### Requirement: Other investigators

**Reason**: Replaced by the player bar: every investigator is an avatar in the bar, and looking at one switches the table to their view.

**Migration**: Counts live under the avatars; the investigator modal remains reachable from the sheet for a teammate's cards when hands are not private; choosing an investigator highlights avatars in the bar.
