## MODIFIED Requirements

### Requirement: Hover enlarge
Hovering a card SHALL show an enlarged copy on the spot. That covers:
- enemies and attachments on locations;
- face-up pile tops;
- play-area strip cards;
- cards committed to a skill test.

The act, the agenda and the scenario reference card in the panel SHALL NOT enlarge on hover: the hover highlights them and a tap opens the viewer. The copy SHALL be twice the card's on-screen size, centred on the card and moved just enough to stay inside the window, fully visible. Beside it, the details column SHALL show the same rows as for hand cards (name, class and type, level, cost, traits, slots, icons, health and sanity, uses, rules text with icons). An enemy also shows its fight, health and evade values, its damage and horror, and the damage already on it. The column is placed right of the copy, or left when there is no room, and clamped to the window. The copy and column MUST NOT intercept the pointer, and SHALL disappear when the pointer leaves the card. A location that is not yet revealed shows its unrevealed side.

Location cards SHALL NOT get the enlarged copy; they show the location details column instead (see Location details).

#### Scenario: Hover a location
- **WHEN** the player hovers the Hallway
- **THEN** no enlarged copy appears; the Hallway is highlighted and its details column appears beside it

#### Scenario: Hover an enemy on a location
- **WHEN** the player hovers a Ghoul Minion sitting on the Cellar
- **THEN** the Ghoul Minion is shown at twice its size, with a column beside it listing fight 2, health 2, evade 2, its 1 damage and 1 horror attack, and its text

#### Scenario: Engaged enemy in the strip
- **WHEN** the player hovers the engaged Ghoul Minion in the play strip at 1600×900
- **THEN** the whole enlarged copy is visible above the strip, none of it below the window edge, and the details column is beside it

#### Scenario: Near the edge
- **WHEN** the player hovers a play-strip card touching the right edge of the window
- **THEN** the enlarged copy is shifted left and the details column goes to its left, both fully visible

#### Scenario: Hover the agenda
- **WHEN** the player hovers the agenda in the panel
- **THEN** no enlarged copy and no column appear; the card is highlighted, and a tap opens the viewer

### Requirement: Player bar
The top bar SHALL show every investigator in turn order as an avatar (the round class-ringed portrait) with health remaining and sanity remaining under it and, during the investigation phase, their action pips (as the ribbon showed them). The active investigator SHALL be ringed; the investigator whose view is on screen SHALL be marked; defeated or resigned investigators SHALL be greyed. A changed count SHALL flash. The bar replaces the stat dock and the right-edge investigator tokens.

A click on an avatar SHALL only change whose table is shown (see Viewing another investigator); a click on the investigator already on screen does nothing, and a click never opens the sheet. Resting the mouse on the avatar of an investigator who is not on screen for 500 ms SHALL open their sheet: the investigator card (enlargeable), the ability text with any pending option tied to the investigator card, the four skills, resources, clues and the hand count; the sheet closes when the pointer leaves the avatar and the sheet, on Escape, or on a click elsewhere. On a touch screen, where there is no hover, a tap on the avatar of the investigator on screen SHALL open their sheet, and a tap outside or on the avatar again closes it. A pulsing avatar and an avatar that answers a pending choice keep their tap behaviour.

#### Scenario: Three-player bar
- **WHEN** Roland, Daisy and Agnes play
- **THEN** the bar shows three avatars in turn order with health and sanity under each, Roland's ringed during his turn with three pips, and no tokens on the right edge and no dock at the bottom left

#### Scenario: Own sheet
- **WHEN** Roland, on screen, clicks his own avatar with a mouse
- **THEN** nothing opens; when he rests the mouse on Daisy's avatar for half a second her sheet appears with her card, ability text, skills, resources, clues and hand count, and it closes when the mouse leaves

#### Scenario: Click to look
- **WHEN** Roland clicks Daisy's avatar
- **THEN** the table switches to Daisy's view at once and no sheet opens

#### Scenario: Touch
- **WHEN** Roland taps his own avatar on a phone
- **THEN** his sheet opens, and a tap outside closes it
