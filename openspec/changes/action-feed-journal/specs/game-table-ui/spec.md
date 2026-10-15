## ADDED Requirements

### Requirement: Prompt banner
The prompt banner at the top of the screen SHALL show:
- the deciding investigator's round portrait and their name in their class colour;
- the question, translated into the current language, at about 22 px (larger than now);
- the important parts emphasised: numbers in bold (for example actions left, shown with action glyphs), card and location names in bold card-name type, the skill being tested with its icon.

When no translation exists for a prompt, the banner SHALL fall back to the engine's English text with the same portrait and name.

#### Scenario: Turn prompt
- **WHEN** it is Roland's turn with 3 actions left
- **THEN** the banner shows Roland's portrait, "Roland Banks" in Guardian blue, then "choose an action" and three action glyphs with a bold 3

#### Scenario: Russian
- **WHEN** the locale is `ru` and Daisy must commit cards to an intellect test
- **THEN** the banner reads in Russian, with Daisy's portrait, her name in Seeker orange and the intellect icon

### Requirement: Map card frames
Cards on the map SHALL have rounded corners like the printed cards. The highlight frame around a card (a legal target, the hovered card, or a move destination while dragging) SHALL be half its previous thickness and follow the card's rounded corners.

#### Scenario: Legal location
- **WHEN** the Hallway can be moved to
- **THEN** it shows a thin rounded gold frame tight around its rounded corners, with no square corners

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

It disappears when the card is no longer hovered or focused, and MUST NOT take the pointer, so moving across the fan still works. Everything is translated.

#### Scenario: Read a weapon at a glance
- **WHEN** the player hovers Machete in Roland's hand
- **THEN** beside the enlarged card a column shows "Machete", Guardian, Asset, Level 0, cost 3, "Item. Weapon. Melee.", the hand slot icon, the combat skill icon and its rules text

#### Scenario: Card at the right end of the fan
- **WHEN** the player hovers the rightmost card of a 7-card hand
- **THEN** the details column appears on the left of the enlarged card, fully on screen
