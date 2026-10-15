# game-table-ui Specification

## Purpose
The WebGL card table and HUD that players use to play hot-seat: what is shown, how cards move and animate, and how choices are offered.

## Requirements

### Requirement: Card showcase
When cards are drawn into the hand of the investigator whose hand is on screen, outside the opening hand and the mulligan redraw, they SHALL fly from that investigator's deck pile to a showcase area in the centre of the screen and turn face up on the way. There they stay large: at least 260 px wide at 1080p, side by side when several were drawn together, with each card's details shown on hover.

The showcase SHALL stay until the player clicks a showcased card, clicks the "To hand" button, or presses Space or Enter. All showcased cards then fly into their places in the fan. While the showcase is open, no game option can be chosen; the action rail, prompt and table options are inert. Cards drawn while the showcase is already open join it.

Draws into another investigator's hand are not showcased. They fly to that investigator's pile, as before. When hands are private, a draw for an investigator whose hand is hidden behind the hand-off screen isn't showcased; it is simply in the hand when that player takes the device. Under reduced motion the cards appear in the showcase and in the fan without flying.

#### Scenario: Draw action
- **WHEN** Roland takes the Draw action and draws Machete
- **THEN** Machete flies from his deck to the centre of the screen face up and stays there, and the rail's buttons don't respond
- **WHEN** he clicks Machete
- **THEN** it flies into his hand fan and the rail responds again

#### Scenario: Two cards at once
- **WHEN** an effect draws 2 cards for Roland
- **THEN** both stand side by side in the showcase, and one click sends both to his hand

#### Scenario: Upkeep draw, other investigator
- **WHEN** in upkeep both Roland and Daisy draw, with Roland's hand on screen and private hands off
- **THEN** Roland's card is showcased; Daisy's flies to her pile in the column

#### Scenario: Opening hand
- **WHEN** a scenario starts and the opening hand is drawn
- **THEN** the cards fly straight into the fan without the showcase, as before

### Requirement: Picking cards from a deck
When the pending choice asks the investigator on screen to pick one of a set of cards that are in their deck or discard pile, those cards SHALL be shown face up in the showcase area instead of only as option buttons. This covers searching the deck, looking at the top cards and choosing from the discard pile.

The prompt above names what is being picked. Clicking a card picks it. A picked card that goes to the hand flies from the showcase into the fan without stopping again; the others leave the showcase. Options that aren't cards, such as "none" or "done", stay as buttons under the cards. More cards than fit in one row wrap into further rows, and the area scrolls if needed. Hover shows each card's details.

#### Scenario: Old Book of Lore
- **WHEN** Daisy uses Old Book of Lore and the search offers the top 3 cards of her deck
- **THEN** the 3 cards stand face up in the middle of the screen
- **WHEN** she clicks one of them
- **THEN** it flies into her hand fan and the other two disappear from the showcase

#### Scenario: Nothing taken
- **WHEN** a search offers cards and a "none" option
- **THEN** "none" is a button under the cards, and choosing it closes the showcase

### Requirement: Investigate in the action rail
Whenever the investigator whose turn it is may investigate their location, the action rail SHALL show an Investigate button with the intellect icon beside Draw and Gain resource. The button carries the action-cost marker the other rail buttons use. Clicking it takes the Investigate action, exactly as clicking the location does. The button is absent when investigating isn't legal, for example at an unrevealed location or one that cannot be investigated.

#### Scenario: Roland in the Study
- **WHEN** it is Roland's turn in the revealed Study with actions left
- **THEN** the rail shows Investigate next to Draw and Gain resource, and clicking it starts the intellect test against the Study's shroud

### Requirement: Effect hits
When a card's effect makes an investigator take damage or horror, or lose resources, clues or actions, the table SHALL show where it came from:
1. The source card pulses red, wherever it is shown: a location on the map, a card in a threat area, an enemy, or the card being resolved.
2. A streak flies from the source to that investigator's portrait. When the portrait isn't visible, it goes to their row in the investigator list.
3. The investigator's numbers change as the streak lands, with the existing floating "−N" numbers.

Hits from the same effect play together, and hits from different effects play one after another. Effects without a source card on the table, such as a chaos token's effect, show only the floating numbers, as before. Under reduced motion only the pulse and the numbers are shown.

#### Scenario: Entering the Attic
- **WHEN** Roland moves into the Attic and its forced ability deals him 1 horror
- **THEN** the Attic pulses, a streak flies from the Attic to Roland's portrait, and his horror goes up by 1 as it lands

#### Scenario: Treachery in the threat area
- **WHEN** a treachery in Daisy's threat area makes her lose 1 resource at the end of her turn
- **THEN** the treachery pulses in her strip and a streak flies to her portrait

### Requirement: Phase pacing on screen
When a phase begins in a paced game, its title SHALL stay across the middle of the screen with the round under it and a Continue button. The phase resolves only after the lead investigator presses Continue, or Space or Enter. The button names the lead investigator ("Continue — Roland"), and it is the only option offered.

Titles never stack: the next phase's title can appear only after the previous phase has been continued and resolved, and after the chaos draws, test results and encounter reveals it waits for. The pause needs no hand-off screen, even when hands are private and someone other than the lead investigator was last on screen.

Games that aren't paced, such as old saves or imported logs that have no pauses, keep the timed title that fades by itself.

#### Scenario: End of the investigation phase
- **WHEN** the last investigator ends their turn in round 1
- **THEN** "Enemy phase · Round 1" stays on screen with a Continue button, and no enemy attacks yet
- **WHEN** the lead investigator presses Continue
- **THEN** the title goes, the enemy phase resolves, and then "Upkeep phase" appears with its own Continue

#### Scenario: Private hands
- **WHEN** hands are private and Daisy's hand was last on screen, while Roland is the lead investigator
- **THEN** the phase title with Continue shows without a hand-off screen

### Requirement: Undo
The HUD SHALL offer an Undo button, and Ctrl/Cmd+Z, whenever the last recorded choice can be taken back. Undo removes the last choice and rebuilds the game from the scenario setup and the remaining choices, so the result is identical to never having made it. Pressing it again takes back the choice before that, and so on.

Undo cannot go past a choice that revealed hidden information: drawing a chaos token, drawing or revealing a card from any deck, looking at or searching a deck, shuffling, or anything else random. It also cannot go into the mulligan or the scenario introduction. When nothing can be undone the button is disabled, and its tooltip says why ("hidden information was revealed").

After an undo:
- cards that changed place fly back, for example a committed card to the hand or a played asset to the fan;
- the action feed and journal drop the undone entries;
- event animations still waiting are dropped;
- when hands are private and the undo hands the choice to another investigator, the hand-off screen appears.

Undo is also recorded in the save, because the save holds the shortened list of choices.

#### Scenario: A committed card by mistake
- **WHEN** Roland fights the Ghoul and commits Vicious Blow
- **THEN** Undo is enabled
- **WHEN** he presses Undo
- **THEN** Vicious Blow is back in his hand and the commit window is still open

#### Scenario: Undoing the action itself
- **WHEN** Roland presses Undo again
- **THEN** the Fight action is not taken and his action count is restored

#### Scenario: Another investigator still to commit
- **WHEN** Daisy is still to commit to Roland's test after Roland pressed Done
- **THEN** Undo reopens Roland's commit window

#### Scenario: After the token
- **WHEN** the last commit window closes (the chaos token is drawn by that same choice, even while the draw animation is still to play)
- **THEN** Undo is disabled, and the tooltip says hidden information was revealed

### Requirement: Chaos bag entrance
When a chaos token is drawn by hand, the chaos bag SHALL grow out of the chaos-bag button into the middle of the screen over about 450 ms. The token circles then fade in, and only then can one be picked. After the token has flown to the skill-test panel, the bag shrinks back into the button.

The automatic draw likewise shows a small bag coming out of the button before the token pops out of it. Under reduced motion the bag appears without growing.

#### Scenario: Drawing by hand
- **WHEN** Roland's investigate test reaches the token draw
- **THEN** the bag grows from the chaos-bag button to the centre, and the circles appear once it is there
- **WHEN** he clicks a circle
- **THEN** the token flies to the skill-test panel, and the bag shrinks back into the button

### Requirement: Act and agenda buttons on the card
Each option on the current act or agenda SHALL be shown as a button laid over the lower part of that card in the act/agenda panel; Advance act is an example. Clicking the button chooses the option directly, and clicking the rest of the card still opens the viewer. Buttons that don't fit stack upward over the card. In the act and agenda viewer, the same buttons sit over the current card instead of in the side column.

#### Scenario: Advance the act from the panel
- **WHEN** the group has enough clues to advance act 1
- **THEN** an "Advance act" button shows over the act card in the panel, and clicking it advances the act without opening the viewer

#### Scenario: In the viewer
- **WHEN** the act viewer is open while the act can be advanced
- **THEN** the "Advance act" button is over the current act card in the list
