## ADDED Requirements

### Requirement: The reader opens at the start of each scenario

The game SHALL show a fullscreen story reader before each scenario of a campaign is set up. For the campaign's first scenario it opens when the new-game screen (or the online lobby) starts the campaign. For a later scenario it opens when the players leave the paper campaign screen through its next-scenario door, after the previous scenario's resolution and any interlude have been read there. It opens with a fade to black and closes with Begin, a fade to black and the table fading in. It is not shown for interludes, resolutions or epilogues.

#### Scenario: A new Night of the Zealot campaign

- **WHEN** Roland's player starts Night of the Zealot from the new-game screen
- **THEN** the screen fades to black, the reader opens on the campaign's opening page, and the table appears only after Begin on The Gathering's page

#### Scenario: The next scenario

- **GIVEN** The Gathering ended and its resolution was read on the campaign screen
- **WHEN** the players press the campaign screen's next-scenario door
- **THEN** the reader opens on The Midnight Masks, and the campaign screen did not show any of The Midnight Masks' own setup steps

#### Scenario: An interlude stays on paper

- **GIVEN** The Dunwich Legacy after The House Always Wins
- **WHEN** the flow reaches the interlude "Armitage's Fate"
- **THEN** it is read on the campaign screen, and the reader opens only for the next scenario

### Requirement: Pages of the reader

The reader SHALL show, in order: for the campaign's first scenario, an opening page with the campaign's name and its prologue when the campaign has one; then a page for each story step and each prompt the flow reaches before the scenario (the campaign's setup steps for the first scenario, the scenario's own setup steps for every scenario); and last a scenario page with the scenario's number in the campaign's order of play, its name and its intro text, ending in Begin. Each page has a painting full-bleed on the left and the title and text in a column on the right. The text SHALL render the campaign guide's markup as styled text, never as raw tags: handwriting for `fancy`, a typewriter face for `typewriter`, the game's display face for `game`, a decorative face for `innsmouth`, small capitals for `smallcaps`, centred and right-aligned blocks, indented quotations, strikethrough, italics and bold; a tag it doesn't know shows its text without the tag. The texts are in the player's language.

#### Scenario: Guide markup rendered

- **WHEN** an intro containing `<center><fancy>June 1926</fancy></center>` and a `<typewriter>` letter is shown, in English and in Russian
- **THEN** the date is a centred handwritten line, the letter is set in the typewriter face, and no tag appears as text

#### Scenario: The Gathering's page

- **WHEN** the reader reaches The Gathering in English
- **THEN** its page reads "Scenario I" and "The Gathering" over the intro text "You and your partners have been investigating strange events…", and ends in Begin

#### Scenario: The Forgotten Age's opening

- **WHEN** a new The Forgotten Age campaign starts in Russian
- **THEN** the reader shows the prologue story "Earth is Not Ours" in Russian, then the supply point, then The Untamed Wilds' page

### Requirement: Paragraph reveal

The text of a page SHALL appear one paragraph at a time: the first with the page, each next one on a tap, a click, Space or Enter. A "show the whole page" control reveals the rest at once. The first tap after the last paragraph turns to the next page, unless the page asks something. With reduced motion, every paragraph of a page is shown at once and nothing moves.

#### Scenario: Reading a long prologue

- **GIVEN** a prologue of five paragraphs
- **WHEN** the player taps four times
- **THEN** all five paragraphs are shown, and the fifth tap turns the page

#### Scenario: Reduced motion

- **GIVEN** the system asks for reduced motion
- **WHEN** a page opens
- **THEN** all its paragraphs are shown at once and the painting does not drift

### Requirement: Prompts in the reader

A prompt the flow reaches before a scenario SHALL be answered in the reader, after its page's last paragraph. A choice among options is shown as numbered dialog lines that keys 1 to 9 also answer. Every other prompt the flow can ask there (an investigator, a checklist, cards, a number, a supply point, a step the game can't offer) is shown with the same controls as on the campaign screen, inside the text column. A deck upgrade or a side scenario on offer is answered on the campaign screen, and the reader returns after it. The answer is the flow's answer as on the campaign screen.

#### Scenario: An intro choice

- **GIVEN** The Dunwich Legacy's first scenario is chosen in the prologue
- **WHEN** the reader shows the prologue's choice
- **THEN** its two answers appear as numbered lines after the last paragraph, and pressing 2 picks the second

#### Scenario: A supply point

- **WHEN** The Forgotten Age's prologue reaches Supply Point 1 with two investigators
- **THEN** each investigator's purchase is made in the reader's text column with 7 points, as on the campaign screen

### Requirement: Skipping and restarts

The reader SHALL offer "Skip to the table" on every page. Skipping jumps to the next page that asks something, never past it, and to Begin when nothing is left to ask. A scenario that has already begun does not show the reader again when it is restarted: from the menu, by a save made under an older engine version, or by rejoining an online room. A game loaded from a save mid-scenario does not show it.

#### Scenario: Skip with a choice ahead

- **GIVEN** the reader on a story page, with a choice two pages ahead
- **WHEN** the player skips
- **THEN** the reader shows the choice's page with all its paragraphs, and skipping again after answering goes to the scenario page

#### Scenario: Restarted for a new engine version

- **GIVEN** a save of The Midnight Masks in round 2 under an older engine version
- **WHEN** the game restarts the scenario
- **THEN** the table is set up again without the reader

### Requirement: Reading online

In an online room each screen SHALL read at its own pace: paragraph reveal and page turns are local. A choice answered or Begin pressed on another screen is shown on this screen as made by that player ("Agnes chose …", "Agnes began the scenario") when its reader reaches that page; the reader then lets this player finish the page or go to the table.

#### Scenario: A choice made elsewhere

- **GIVEN** two players in a room, the first one page ahead of the second
- **WHEN** the first answers the prologue's choice
- **THEN** the second keeps reading where they are, and on reaching the choice sees it answered by the first player, without being able to change it

### Requirement: Sound in the reader

The reader SHALL play the `tome` effect when a page opens and the `tension` music under the reader, fading in with the black and out with Begin, following the player's sound settings.

#### Scenario: Muted

- **GIVEN** sound is muted
- **WHEN** the reader opens and turns pages
- **THEN** nothing plays

### Requirement: The reader's paintings

Each page SHALL show a painting chosen in this order: the scenario's painting from the campaign guide editions when the art manifest maps one to it (the opening page uses the campaign's first scenario's); else the painting of the scenario's first agenda card, cropped from its scan; else the campaign's first scenario's. The manifest records, for each painting, the source file, the page and the scenario. The extraction keys the painting's white page margin to transparency so it sits on the black.

#### Scenario: Night of the Zealot is mapped

- **WHEN** the reader shows The Gathering's page
- **THEN** its painting is the guide edition's bathroom with ghouls, on black with no white margin

#### Scenario: A generated campaign is not mapped

- **WHEN** the reader shows The Untamed Wilds' page
- **THEN** its painting is the art of the agenda "Expedition into the Wild"

### Requirement: Reader layout

The reader SHALL fill the window. At desktop sizes the painting takes about 55 % of the width and the text column the rest, at a readable measure. On a phone in landscape the painting takes about 40 %, the title is one line, and a paragraph longer than the screen scrolls in the column. Begin, skip and the answers stay within the screen at every size the game supports.

#### Scenario: Phone

- **WHEN** The Gathering's page is shown at 852×393
- **THEN** the painting, the one-line title, the intro text and Begin are all on screen, and the text scrolls within its column
