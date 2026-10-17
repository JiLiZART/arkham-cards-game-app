## MODIFIED Requirements

### Requirement: Play area strip
The viewing investigator's cards in play and threat area SHALL be shown as a fixed strip of cards above the hand fan, between the stat bar and the action rail. Threat-area cards and engaged enemies come after the assets, separated from them. Strip cards SHALL be at least 124×173 px at 1080p and shrink only when the strip would not fit in its width. Exhausted cards SHALL be shown turned sideways. Tokens on the cards (uses, damage, horror, doom, resources) SHALL be visible on them. The strip SHALL be hidden while hand-off privacy hides the hand.

Cards with a pending option SHALL be highlighted. Each of their options SHALL be shown as a labelled button directly above the card, with the action's icon where it has one, for example "Fight" (combat icon) and "Evade" (agility icon) above an engaged enemy. One click on a button chooses that option; no menu or second click is needed. Clicking a card with exactly one option still chooses it. The buttons MUST stay inside the window and MUST NOT cover the neighbouring cards' buttons. They SHALL be hidden while an event is animating, like other options.

While a fight or evade test is running against a strip enemy, that enemy SHALL stay highlighted as the test's target.

#### Scenario: Assets and an enemy
- **WHEN** Roland has a .45 Automatic with 3 ammo and a Machete in play and is engaged with a Ghoul Minion
- **THEN** the strip shows the two assets, the .45 Automatic with 3 uses on it, then the Ghoul Minion after a separator

#### Scenario: Fight from the strip
- **WHEN** Roland can fight and evade the engaged Ghoul Minion on his turn
- **THEN** "Fight" and "Evade" buttons are shown above the Ghoul Minion, and one click on "Fight" starts the fight test against it

#### Scenario: Asset ability
- **WHEN** Roland's .45 Automatic has one pending option (its fight ability)
- **THEN** a single button with the ability's label sits above the card, and clicking the card itself also chooses it

#### Scenario: Target during the test
- **WHEN** the fight test against the Ghoul Minion is in its commit window
- **THEN** the Ghoul Minion in the strip is outlined as the target, with no option buttons above it

### Requirement: Hover enlarge
Hovering a card SHALL show an enlarged copy on the spot. That covers:
- enemies and attachments on locations;
- the act and agenda;
- face-up pile tops;
- play-area strip cards;
- cards committed to a skill test.

The copy SHALL be twice the card's on-screen size, centred on the card and moved just enough to stay inside the window, fully visible. Beside it, the details column SHALL show the same rows as for hand cards (name, class and type, level, cost, traits, slots, icons, health and sanity, uses, rules text with icons). An enemy also shows its fight, health and evade values, its damage and horror, and the damage already on it. The column is placed right of the copy, or left when there is no room, and clamped to the window. The copy and column MUST NOT intercept the pointer, and SHALL disappear when the pointer leaves the card. A location that is not yet revealed shows its unrevealed side.

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

### Requirement: Chaos token draw
When a skill test reveals a chaos token, the UI SHALL stage the draw as a small interaction:
1. The chaos bag appears large in the centre of the screen, over a dimmed table. Above its mouth sits one plain white circle per token currently in the bag.
2. Beside the bag (to its left, where the circles leave room), the draw SHALL show what is being tested:
   - the card the test is against or comes from (the enemy being fought or evaded, the location being investigated, the treachery or card that called for the test), at a readable size of at least 180×252 px at 1080p;
   - a line with the investigator's portrait and name, the skill icon and name, and the test value against the difficulty (for example "Roland Banks · [willpower] Willpower 3 vs 4").

   Hovering the card shows its enlarged copy and details column. A test with no card (a plain test from a scenario effect) shows only the line.
3. The deciding player clicks any white circle. Space or Enter picks one too.
4. The bag fades away, and the chosen circle flies to the table area beside the skill-test panel. It turns into the revealed token (its real art) as it lands.
5. A result panel then shows the calculation line by line:
   - the skill with its icon and base value;
   - each modifier, including committed cards' icons;
   - each revealed token with its icon and modifier (or "auto-fail" / "elder sign" effect);
   - the total against the difficulty;
   - Success or Fail.

   It stays until the player clicks Continue.

The draw SHALL NOT start until the screen has settled: every earlier animated event has finished, every card still flying (a card drawn, played, spawned or put into play, an encounter card being revealed) has landed, and about 0.4 s has passed after that. If something keeps animating, the draw starts anyway after at most 4 seconds, so the game can never stall.

Which token comes out MUST NOT depend on the circle clicked. The engine's seeded draw decides it, so saved games and action-log replays stay exact.

When a test reveals more than one token, each is drawn the same way in turn. Bot play and the debug "skip" bypass the interaction. A menu setting "Draw chaos tokens by hand" (on by default) SHALL switch to an automatic reveal that plays the same animation without waiting for a click; it shows the tested card the same way and waits for the screen to settle the same way.

#### Scenario: Draw a token by hand
- **WHEN** Roland investigates the Study and finishes committing cards, with 16 tokens in the bag
- **THEN** the bag appears in the centre with 16 white circles; after he clicks one, the bag fades, the circle flies beside the skill-test panel and turns into the revealed token, e.g. −1

#### Scenario: See what is tested
- **WHEN** Roland draws Rotting Remains from the encounter deck and must take a willpower test against difficulty 3
- **THEN** the draw shows the Rotting Remains card beside the bag with "Roland Banks · Willpower 3 vs 3", so the player can read the treachery while picking a circle

#### Scenario: Fight target shown
- **WHEN** Roland fights a Ghoul Minion
- **THEN** the Ghoul Minion card is shown beside the bag with "Combat 4 vs 2"

#### Scenario: Wait for the card to land
- **WHEN** an encounter card is revealed in the middle of the screen and its test follows at once
- **THEN** the bag appears only after the encounter card's reveal has finished and it has settled, not on top of it mid-flight

#### Scenario: Never stalls
- **WHEN** an animation is still running 4 seconds after the token was revealed
- **THEN** the draw starts anyway

#### Scenario: Result breakdown
- **WHEN** that token was −1, Roland's intellect is 3, he committed one intellect icon, and the shroud is 2
- **THEN** the result panel lists "Intellect 3", "+1 committed", "−1 token", "= 3 vs 2" and "Success", and stays until Continue is clicked

#### Scenario: Same result whichever circle
- **WHEN** the same saved game is replayed and a different circle is clicked
- **THEN** the same token is revealed

#### Scenario: Automatic reveal
- **WHEN** "Draw chaos tokens by hand" is turned off in the menu
- **THEN** the token reveal animates from the bag without waiting for a click, after the screen has settled, with the tested card shown, and the result panel closes on its own after a short pause

## ADDED Requirements

### Requirement: Skill-test panel
While a skill test is in progress, the panel at the top centre SHALL show:
- who is testing, which skill (with its icon) and why;
- the value as a sum: the base skill, then each committed card's icons, then other modifiers, then the current total against the difficulty;
- the revealed tokens;
- the committed cards, each at least 86×120 px.

Hovering a committed card SHALL show its enlarged copy and details column (see Hover enlarge).

While the commit window is open for the investigator who committed a card, that card SHALL be highlighted as removable. Clicking it SHALL return it to that investigator's hand, flying back into the fan, and update the value. They can then commit a different card or none. A card committed by another investigator, or once the commit window has closed, can't be taken back.

#### Scenario: Value breakdown
- **WHEN** Roland (combat 4) fights a Ghoul Minion (fight 2) and commits Vicious Blow (1 combat icon)
- **THEN** the panel shows "4 + 1 = 5 vs 2" with the combat icon and the Vicious Blow card below

#### Scenario: Take a card back
- **WHEN** Roland, still deciding what to commit, clicks the committed Vicious Blow in the panel
- **THEN** Vicious Blow flies back into his hand, the panel shows "4 vs 2", and Vicious Blow is again offered for commit

#### Scenario: Hover a committed card
- **WHEN** the player hovers a committed card in the panel
- **THEN** the card is shown enlarged with its details column, fully on screen

#### Scenario: After the reveal
- **WHEN** the chaos token has been revealed
- **THEN** the committed cards are no longer highlighted and clicking them does nothing

### Requirement: Phase title
When a new phase begins (mythos, investigation, enemy, upkeep), the screen SHALL show a chapter title like a film's: the phase name in large display type across the middle of the screen, with the round number in smaller type under it, over a soft dark band. It SHALL fade and drift in, hold for about 2 seconds, and fade out. When several phases begin in quick succession, their titles SHALL play one after another, each in full. The title MUST NOT intercept the pointer or block input, and it is shown in the player's language. Under reduced motion it appears and disappears without movement.

Phase changes SHALL NOT also appear as an action float. They are still listed in the feed.

#### Scenario: Mythos phase begins
- **WHEN** round 2 begins with the mythos phase
- **THEN** "Mythos Phase" appears in large type across the centre with "Round 2" under it, stays about 2 seconds and fades out

#### Scenario: Quick succession
- **WHEN** the upkeep phase ends and the mythos phase begins at once
- **THEN** the "Upkeep Phase" title finishes before "Mythos Phase" plays

#### Scenario: Russian
- **WHEN** the locale is Russian and the investigation phase begins
- **THEN** the title shows the Russian phase name
