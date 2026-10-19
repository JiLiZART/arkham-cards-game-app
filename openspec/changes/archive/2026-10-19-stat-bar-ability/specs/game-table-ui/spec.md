## MODIFIED Requirements

### Requirement: Stat bar
The UI SHALL show a stat bar in the bottom-left corner for the investigator whose table is on screen (the one being looked at, else the deciding investigator). It is the bar that existed before the player bar, sized to the window: full size (420 px wide) in a window of 1080p and up, scaled with the window's smaller ratio to 1920×1080 below that, between 75 % and 115 %, with the hand fan starting after it; it shows:
- a portrait of at least 90 px and the name (at least 27 px);
- the investigator's ability text, and under it the pending options tied to the investigator card as buttons whenever there are any (the investigator's own ability), lit like the rail's buttons, each with the ability's symbol (action, reaction or free) and its label in the player's language; tapping one chooses it;
- health and sanity remaining, out of their maximum;
- the four skill values.

Every number in the bar SHALL be at least 28 px tall. Above the bar a row SHALL show resources and clues as stacks of the PNG token images, using the fewest tokens (resources 5, 3 and 1; clues 3 and 1), each with its total, and after them the hand count. Every item SHALL have a tooltip naming it with its value and SHALL flash briefly when it changes. Clicking the portrait SHALL open the investigator card in the card detail modal. While an ability option is offered, the portrait SHALL glow as the avatar does. The same options stay on the avatar and its sheet, as the player bar defines. In the phone layout mode the bar is not drawn; the sheet serves there.

#### Scenario: Back in the corner
- **WHEN** the table is shown at 1600×900 on Roland's turn
- **THEN** a stat bar stands in the bottom-left with Roland's portrait, ability, health 9/9, sanity 5/5 and his four skills, 350 px wide (five sixths of full size), and above it his resource stack, clue stack and hand count

#### Scenario: Looking at a teammate
- **WHEN** Roland taps Daisy's avatar to look at her
- **THEN** the stat bar shows Daisy's portrait, numbers and token row until he returns

#### Scenario: Resource stack
- **WHEN** the investigator on screen has 9 resources
- **THEN** the row shows one 5-resource token, one 3-resource token and one 1-resource token from the PNG art, labelled 9

#### Scenario: Use the ability from the bar
- **WHEN** Daisy has a tome in play on her turn
- **THEN** her stat bar shows the tome ability's button under her ability text, lit, and tapping it uses the ability; the same button is in her sheet

## ADDED Requirements

### Requirement: Ability labels in the player's language
Every button that uses a card ability (in the stat bar, the avatar sheet, the play strip, a card's menu, the act and agenda, a fast ability during a test) SHALL show the ability's label in the player's language, after the card's name in that language when the label names the card, and the engine's English label only for an ability the strings don't have.

#### Scenario: Roland's ability in Russian
- **WHEN** Roland may use his reaction and the locale is Russian
- **THEN** its button reads "Роланд Бэнкс: найти 1 улику в вашей локации" with the reaction symbol
