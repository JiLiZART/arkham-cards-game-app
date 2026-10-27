## ADDED Requirements

### Requirement: Threat row shade

On the desktop, while the viewer's threat row (their engaged enemies and threat-area cards, at the top centre under the top bar) has cards, a shade of night SHALL lie under it: a dark gradient, strongest at the top bar's edge and fading down into the table, faded out at the row's left and right ends, like the shade under the hand fan. The shade SHALL extend a little beyond the cards on every side so a card's badges and intent chips sit on it too, and it MUST NOT take the pointer. It moves, hides and comes back with the row (it steps aside with the row during a skill test, and is gone when the row has no cards). The phone's right-edge column has no shade.

#### Scenario: Enemy over a location

- **GIVEN** Roland is engaged with a Ghoul Minion, and the map behind the threat row shows a location card
- **WHEN** the table is on screen
- **THEN** the Ghoul Minion's card and its badges read on a dark shade that fades into the table below, and the location is still visible around the shade

#### Scenario: Row steps aside

- **WHEN** Roland's fight test is in its token draw and the threat row slides out of the way
- **THEN** the shade slides out with it, and nothing darkens the map under the top bar until the row returns

#### Scenario: Nothing engaged

- **WHEN** Roland has no engaged enemy and nothing in his threat area
- **THEN** there is no shade under the top bar

## MODIFIED Requirements

### Requirement: Hand card details

While a hand card is hovered or focused (raised and enlarged), a details column SHALL appear right beside it, on the right; if there is no room there (cards at the right end of the fan), on the left. The column lists, in large readable type:

- name (card-name type) and subtitle;
- class with its icon, and type (Asset, Event, Skill…);
- level as XP pips (level 0 shown as "Level 0");
- cost with the resource icon (or "—" for skills);
- traits (for example Item. Weapon. Melee.);
- slots with their icons;
- skill icons the card provides when committed;
- health and sanity (allies), and uses (for example 4 ammo);
- the rules text with icons.

While a commit window is open on the viewer's table and the hovered card can be committed to that test, the column SHALL lead with a Commit row right under the name: the card's icons that count for this test (the tested skill's icons and its wild icons, each drawn as an icon) and the total they add as "+N". Under the icons, one line in plain words SHALL say what happens to the card:

- for an asset or an event: it is not played, only its icons count, and its text does not apply; its rules-text row is dimmed;
- for a skill card: its text applies while it is committed; its rules text stays bright.

Cards that cannot be committed (no icon that counts, a card the test forbids) show their usual column. Outside a commit window the Commit row is absent.

It disappears when the card is no longer hovered or focused, and MUST NOT take the pointer, so moving across the fan still works. Everything is translated.

#### Scenario: Read a weapon at a glance

- **WHEN** the player hovers Machete in Roland's hand
- **THEN** beside the enlarged card a column shows "Machete", Guardian, Asset, Level 0, cost 3, "Item. Weapon. Melee.", the hand slot icon, the combat skill icon and its rules text

#### Scenario: Card at the right end of the fan

- **WHEN** the player hovers the rightmost card of a 7-card hand
- **THEN** the details column appears on the left of the enlarged card, fully on screen

#### Scenario: An asset hovered in the commit window

- **GIVEN** Roland is fighting a Ghoul Minion and his commit window is open
- **WHEN** he hovers Machete (one combat icon) in his fan
- **THEN** under "Machete" the column shows a Commit row with the combat icon and "+1", the line "Not played: only its icons count, its text does not apply", and Machete's rules text dimmed

#### Scenario: A skill card hovered in the commit window

- **GIVEN** the same commit window
- **WHEN** Roland hovers Vicious Blow (one combat icon)
- **THEN** the Commit row shows the combat icon and "+1" and the line "Its text applies while committed", and its rules text is bright

#### Scenario: Wild icons count

- **GIVEN** Daisy's investigate test is in its commit window
- **WHEN** she hovers Unexpected Courage (two wild icons)
- **THEN** the Commit row shows two wild icons and "+2"

#### Scenario: A card with nothing to give

- **GIVEN** Roland's fight test is in its commit window
- **WHEN** he hovers a card with only agility icons, which has not risen
- **THEN** its column has no Commit row and its text is not dimmed

### Requirement: Instruction bar

When a choice is pending for the investigator whose hand is on screen, a bar under the top bar SHALL show that investigator's portrait and name, an instruction in plain words saying what to tap and what it does, and the choice's primary options as buttons inside the bar. Primary options are the ones that stand for no card and no action to take: Done, Pass, Keep hand, Redraw, Take nothing, Resign and End turn. Draw, Gain resource and Investigate stay on the action rail. Options that belong to a card stay on that card.

The instruction is written for a first-time player and names the target: "Tap a card to add its combat icons to the test, then Done", "Tap the room the Ghoul moves to", "Tap a card to discard (2 more)". The commit instruction names the tested skill and says that the card's icons are what it adds, for the tester's own window and for a helper's. When no instruction exists for a prompt, the bar shows the prompt's own sentence. The phase pause keeps its title and Continue and shows no bar. While events play, the bar shows no choice.

When the decision belongs to another investigator who can act (a commit to another's test, a reaction) and the table on screen is not theirs, the bar SHALL NOT show that investigator's instruction without its buttons. It SHALL instead show who can act ("Daisy Walker can commit cards") with one button that switches the table to them, the same as tapping their pulsing avatar, until the table switches by itself. The bar MUST never show an instruction that has no button or tap that answers it.

#### Scenario: Commit

- **WHEN** Roland starts an investigate test
- **THEN** the bar reads "Tap a card to add its intellect icons to the test, then Done" with a Done button in it, and the rail shows no Done

#### Scenario: End turn

- **WHEN** it is Roland's turn
- **THEN** the bar reads his actions-left instruction with End turn as its button, and the rail shows Draw, Resource and Investigate

#### Scenario: No translation

- **WHEN** a card script asks a question with no instruction string
- **THEN** the bar shows the engine's sentence without the investigator's name prefix, as the banner does today

#### Scenario: Another can act

- **WHEN** Roland's test opens Daisy's commit window while Roland's table is on screen
- **THEN** the bar reads "Daisy Walker can commit cards" with a button that switches to Daisy's table, where the bar shows her commit instruction with Done
