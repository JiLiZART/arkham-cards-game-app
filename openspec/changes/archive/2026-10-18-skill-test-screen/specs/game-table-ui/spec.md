## ADDED Requirements

### Requirement: Skill-test screen

When a skill test begins (the commit prompt is offered), the UI SHALL open a skill-test screen over the dimmed table and keep it open through the chaos draw until the result is dismissed. The screen SHALL show:

- on the left, the subject: the card the test is against or comes from (the enemy being fought or evaded, the location being investigated, the treachery or card that called for the test) at a readable size of at least 180×252 px at 1080p, or the investigator's portrait for a test with no card; hovering the card shows its enlarged copy and details column;
- in the middle, the test's name and line (for example "Investigate: Study · shroud 2"), the space kept free for the draw;
- on the right, the placed cards, each at least 86×120 px, with the icons it contributes to the test and, when several investigators have placed cards, the owner's portrait on each;
- along the bottom, above the hand fan, a calculation strip: the skill with its icon and base value, each placed card with its icons, other modifiers, and the total against the difficulty, updated as cards are placed and taken back.

The hand fan SHALL stay live under the strip: the cards that can be committed are bright and the rest dimmed (the choice spotlight), and a tap commits a card, which flies to the placed cards. A placed card of the deciding investigator SHALL be highlighted as removable while their commit window is open; tapping it returns it to their hand and updates the strip. Cards placed by another investigator, or after the window has closed, can't be taken back.

The instruction bar SHALL stay above the screen with its instruction and the Done button. The play strip SHALL stay visible and clickable above the overlay, dimmed except the cards whose fast ability is offered right now, so an in-play ability can be used during the test.

After the tester's Done, each other investigator at the location who may commit SHALL be asked in turn on the same screen; with private hands the hand-off box appears over the screen, and the next player's fan comes in once they are ready. The placed cards and the strip keep everyone's contributions.

#### Scenario: Commit from the fan

- **WHEN** Roland (combat 4) fights a Ghoul Minion (fight 2) and taps Vicious Blow (1 combat icon) in his fan
- **THEN** Vicious Blow flies to the placed cards with "+1 [combat]", the strip reads "[combat] 4 + 1 = 5 vs 2", and the Ghoul Minion card is the subject on the left

#### Scenario: Take a card back

- **WHEN** Roland, still deciding, taps the placed Vicious Blow
- **THEN** it flies back into his fan, the strip reads "4 vs 2", and Vicious Blow is bright in the fan again

#### Scenario: A helper's card

- **WHEN** Roland presses Done and Daisy, at the same location, is asked to commit
- **THEN** the screen stays with Roland's Vicious Blow marked with his portrait, Daisy's fan comes in (after the hand-off box when hands are private), a card she places shows her portrait, and she can take back hers but not his

#### Scenario: An ability from play

- **WHEN** Roland has Physical Training in play during a willpower test
- **THEN** Physical Training is bright and clickable in the strip above the overlay while the other strip cards are dimmed, and using it adds its bonus to the calculation strip

#### Scenario: A test with no card

- **WHEN** a scenario effect calls for a plain willpower test
- **THEN** the subject is Roland's portrait and the line reads "Willpower test · 3 vs 3"

## MODIFIED Requirements

### Requirement: Chaos token draw

When a skill test reveals a chaos token, the draw SHALL play as a stage of the skill-test screen, in the space kept free in its middle, with the subject, the placed cards and the calculation strip staying where they were:

1. The chaos bag appears in the middle. The discs spill out of it onto the table around it, one plain disc per token currently in the bag, each the size of a revealed token, settling within about half a second.
2. The deciding player taps any disc. Space or Enter picks one too.
3. The chosen disc flips in place, revealing the token's real art on its face, while the other discs fade. The token then slides into the calculation strip, where its modifier (or "auto-fail" / "elder sign" effect) joins the sum.
4. The screen moves to its result stage: the big total, below it Success or Fail in big text, below that a Continue button; bottom centre, the arithmetic as icons, for example "[intellect] 3 + [token −1] + [card] 2 = 4 vs 2". It stays until Continue is pressed.

The draw SHALL NOT start until the screen has settled: every earlier animated event has finished, every card still flying (a card drawn, played, spawned or put into play, an encounter card being revealed) has landed, and about 0.4 s has passed after that. If something keeps animating, the draw starts anyway after at most 4 seconds, so the game can never stall.

Which token comes out MUST NOT depend on the disc tapped. The engine's seeded draw decides it, so saved games and action-log replays stay exact.

When a test reveals more than one token, each is drawn the same way in turn. Bot play and the debug "skip" bypass the interaction. With the menu setting "Draw chaos tokens by hand" off, the discs do not spill: one token flips straight out of the bag and slides into the strip without waiting for a tap, after the screen has settled the same way; the result stage then closes on its own after a short pause (or waits for a tap at the Tap pace).

#### Scenario: Draw a token by hand

- **WHEN** Roland investigates the Study and finishes committing cards, with 16 tokens in the bag
- **THEN** 16 discs spill out of the bag in the middle of the screen; after he taps one, it flips in place into the revealed token, e.g. −1, the others fade, and the token slides into the calculation strip

#### Scenario: See what is tested

- **WHEN** Roland draws Rotting Remains from the encounter deck and must take a willpower test against difficulty 3
- **THEN** the Rotting Remains card is the subject on the left throughout the draw, with "Roland Banks · Willpower 3 vs 3" in the strip, so the player can read the treachery while picking a disc

#### Scenario: Fight target shown

- **WHEN** Roland fights a Ghoul Minion
- **THEN** the Ghoul Minion card is the subject on the left with "Combat 4 vs 2" in the strip

#### Scenario: Wait for the card to land

- **WHEN** an encounter card is revealed in the middle of the screen and its test follows at once
- **THEN** the discs spill only after the encounter card's reveal has finished and it has settled, not on top of it mid-flight

#### Scenario: Never stalls

- **WHEN** an animation is still running 4 seconds after the token was revealed
- **THEN** the draw starts anyway

#### Scenario: Result breakdown

- **WHEN** that token was −1, Roland's intellect is 3, he committed one intellect icon, and the shroud is 2
- **THEN** the screen shows a big "3", "Success" under it, a Continue button, and at the bottom centre "[intellect] 3 + [−1] + [card] 1 = 3 vs 2"; it stays until Continue is pressed

#### Scenario: Same result whichever circle

- **WHEN** the same saved game is replayed and a different disc is tapped
- **THEN** the same token is revealed

#### Scenario: Automatic reveal

- **WHEN** "Draw chaos tokens by hand" is turned off in the menu
- **THEN** no discs spill: one token flips out of the bag and slides into the strip without a tap, after the screen has settled, and the result stage closes on its own after a short pause

## REMOVED Requirements

### Requirement: Skill-test panel

**Reason**: Replaced by the skill-test screen, which holds the arithmetic, the placed cards and the take-back in one frame with the draw and the result.

**Migration**: Everything the panel showed is on the screen: the sum is the calculation strip, the committed cards are the placed cards on the right (hover for the enlarged copy, tap to take back while the window is open, inert after the reveal), the revealed tokens join the strip. Nothing is shown at the top centre during a test besides the instruction bar.
