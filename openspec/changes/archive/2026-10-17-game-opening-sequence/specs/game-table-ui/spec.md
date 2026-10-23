## ADDED Requirements

### Requirement: Mulligan on the table

During an investigator's mulligan, each card they pick for redraw SHALL fly out of the hand fan onto a "to redraw" row on the table above the hand. The row is labelled and shows the picked cards face up, side by side, and the fan closes the gap. Clicking a card in the row SHALL fly it back into the fan at its old position and un-pick it. Hovering a card in the row shows its enlarged copy and details column.

When the investigator confirms, the picked cards SHALL fly from the row into their deck pile face down, and the replacement cards then fly into the fan as for the opening hand. Keeping the hand with no picks just closes the row. Under reduced motion the cards move without flying. With hand privacy, the row is shown only to the investigator whose mulligan it is.

#### Scenario: Pick a card

- **WHEN** Roland clicks Machete in his opening hand during the mulligan
- **THEN** Machete flies onto the "to redraw" row on the table, and the fan closes up to 4 cards

#### Scenario: Take it back

- **WHEN** Roland then clicks Machete in the row
- **THEN** Machete flies back into its place in the fan, and the row is empty again

#### Scenario: Confirm the redraw

- **WHEN** Roland has Machete and Flashlight in the row and confirms
- **THEN** both fly face down into his deck pile, and two new cards fly from the deck into the fan

### Requirement: Scenario introduction

When the last investigator's mulligan is confirmed in a new scenario, the game SHALL introduce the scenario before play starts:

1. The agenda card is shown large in the centre of the dimmed screen, at least 300 px wide at 1080p, with the scenario name above it and the scenario's intro text beside it.
2. After the player clicks Continue (or presses Space or Enter), the agenda flies to its place in the act/agenda panel.
3. The act card is shown the same way, without the intro text.
4. After Continue, the act flies to its place.
5. The starting locations are then dealt onto the table (see Location dealing and flips).

During the introduction, no game option can be chosen. The introduction plays once per scenario. A game loaded from a save, or imported from a log, after the mulligan doesn't play it. While a scenario is in its mulligan, the act/agenda panel is empty and the table has no locations; both appear through the introduction. The texts are in the player's language.

#### Scenario: The Gathering begins

- **WHEN** Roland keeps his hand in The Gathering
- **THEN** "The Gathering" with its intro text and the agenda "What's Going On?!" appear large in the centre. After Continue, the agenda flies to the panel and the act "Trapped" appears. After Continue, it flies to the panel and the Study is dealt onto the table.

#### Scenario: Two investigators

- **WHEN** Roland and Daisy both finish their mulligans
- **THEN** the introduction plays once, after Daisy's mulligan, and then play continues with the first turn

#### Scenario: Loaded game

- **WHEN** a player reloads the page during round 1
- **THEN** no introduction plays; the act, agenda and locations are in place

### Requirement: Location dealing and flips

Locations put into play SHALL be dealt onto the table: each one flies face down from the act/agenda panel to its place on the map, one after another about 250 ms apart. This covers:

- the starting locations at the end of the scenario introduction;
- locations added later by an act, an agenda or a card effect.

A location that comes into play revealed, such as a starting location an investigator begins in, SHALL flip face up once it has landed. The investigators' portraits starting there SHALL appear on it after the flip.

When a location is revealed while on the table (an investigator moves into it, or an effect reveals it), it SHALL flip visibly: it lifts slightly, turns over in 3D in about 0.6 s, and settles back. The flip starts once the moving portrait has arrived. Under reduced motion the location simply changes side.

#### Scenario: Starting location

- **WHEN** The Gathering's introduction ends
- **THEN** the Study flies face down from the act/agenda panel onto the table, flips to its revealed side, and Roland's portrait appears on it

#### Scenario: Act advance places locations

- **WHEN** the act advances and puts the Hallway, Cellar, Attic and Parlor into play
- **THEN** they are dealt face down from the act/agenda panel one after another, and stay face down

#### Scenario: Entering an unrevealed location

- **WHEN** Roland moves into the unrevealed Cellar
- **THEN** his portrait moves onto it, then the Cellar lifts, turns over to its revealed side and settles, and its clues appear on it

### Requirement: Act and agenda viewer

The act/agenda panel SHALL show three cards: the agenda, the act, and the scenario reference card for the current difficulty (its front for Easy/Standard, its back for Hard/Expert). Clicking any of them SHALL open a viewer:

- **Agenda** and **act**: every agenda or act of the scenario in order, the current one marked. Each that has been reached (current or earlier) shows both sides. Each that is still to come shows its front only, with its back hidden as "not yet revealed". Options on the current act or agenda (advance) are offered in the viewer as before.
- **Reference card:** the card at full size with its other side, and the chaos tokens in the bag.

Hovering a card in the viewer shows its details column. The viewer closes with Escape or a click outside.

#### Scenario: See all acts

- **WHEN** the player clicks the act in round 1 of The Gathering
- **THEN** the viewer shows Trapped (both sides, marked current), then The Barrier and What Have You Done? with their fronts only

#### Scenario: Reference card from the panel

- **WHEN** the player clicks the reference card in the panel on Standard
- **THEN** the viewer shows the Standard side of The Gathering's reference card large, with the Hard/Expert side beside it

#### Scenario: Advance from the viewer

- **WHEN** the act can be advanced and the player opens the act viewer
- **THEN** the advance option is offered there, as it is today in the act modal
