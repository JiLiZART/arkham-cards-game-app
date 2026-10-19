## MODIFIED Requirements

### Requirement: Skill-test screen
When a skill test begins (the commit prompt is offered), the UI SHALL open a skill-test screen over the dimmed table and keep it open through the chaos draw until the result is dismissed. The screen SHALL show:
- in the centre, the subject: the card the test is against or comes from (the enemy being fought or evaded, the location being investigated, the treachery or card that called for the test) at a readable size of at least 240×336 px at 1080p, or the investigator's portrait for a test with no card; hovering the card shows its details column (no enlarged copy, the card is already large);
- above the subject, the test's name and line (for example "Investigate: Study · shroud 2");
- to the right of the subject, the placed cards in a row that wraps, each at least 86×120 px, with the icons it contributes to the test and, when several investigators have placed cards, the owner's portrait on each;
- along the bottom, above the hand fan, a calculation strip: the skill with its icon and base value, each placed card with its icons, other modifiers, and the total against the difficulty, updated as cards are placed and taken back.

While the deciding investigator's commit window is open, the subject card SHALL be highlighted like any card with an option, and tapping it SHALL finish committing, exactly as the instruction bar's Done does; Space or Enter does the same. It is not highlighted and does nothing at other times (another investigator's window not on screen, the draw, the result).

The chaos draw and the result play over the subject card: the bag lands on it and the tokens tumble over and around it, and the big total appears over it (see Chaos token draw). The subject stays in place and visible between the tokens.

The hand fan SHALL stay live under the strip: the cards that can be committed are bright and the rest dimmed (the choice spotlight), and a tap commits a card, which flies to the placed cards. A placed card of the deciding investigator SHALL be highlighted as removable while their commit window is open; tapping it returns it to their hand and updates the strip. Cards placed by another investigator, or after the window has closed, can't be taken back.

While the tester's own commit window is open and nothing hidden has come out since the test began (it started from a choice of their turn, such as Fight or Investigate), the screen SHALL offer Cancel the test beside the line, and Escape does the same: every choice since the test began is taken back, the action and the cards placed included, and the turn is as it was before it, so the player can do something else first (play a fast card, use an asset, take another action). A test forced by a card (a treachery drawn) can't be cancelled.

The instruction bar SHALL stay above the screen with its instruction and the Done button. The play strip SHALL stay visible and clickable above the overlay, dimmed except the cards whose fast ability is offered right now, so an in-play ability can be used during the test.

After the tester's Done, each other investigator at the location who may commit SHALL be asked in turn on the same screen; with private hands the hand-off box appears over the screen, and the next player's fan comes in once they are ready. The placed cards and the strip keep everyone's contributions.

#### Scenario: Commit from the fan
- **WHEN** Roland (combat 4) fights a Ghoul Minion (fight 2) and taps Vicious Blow (1 combat icon) in his fan
- **THEN** Vicious Blow flies to the placed cards with "+1 [combat]", the strip reads "[combat] 4 + 1 = 5 vs 2", and the Ghoul Minion card is the subject in the centre

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

#### Scenario: Tap the subject to finish
- **WHEN** Roland has placed Vicious Blow in his fight against the Ghoul Minion
- **THEN** the Ghoul Minion card in the centre is highlighted, and tapping it ends his commit window as Done does, and the draw begins

#### Scenario: Cancel a fight
- **WHEN** Roland chooses to fight the Ghoul Minion, places Vicious Blow, then presses Cancel the test
- **THEN** the screen closes, Vicious Blow is back in his hand, he has the action back, and he can play a fast card before fighting again

#### Scenario: A treachery's test can't be cancelled
- **WHEN** Roland's test comes from Rotting Remains drawn in the mythos phase
- **THEN** no Cancel the test is offered

#### Scenario: Subject in the centre
- **WHEN** Roland investigates the Study at 1600×900
- **THEN** the Study card stands in the centre of the screen at least 240 px wide with the line above it, the placed cards to its right, the strip along the bottom, and when the draw starts the bag lands on the Study and the tokens tumble over it

### Requirement: Skill-test line alignment
The skill-test screen's line ("Willpower test · 3 vs 4"), the subject card under it and the calculation strip SHALL all be centred on the screen's vertical axis at every window width; the placed cards sit to the subject's right.

#### Scenario: Line over strip
- **WHEN** the skill-test screen is open at 1600×900
- **THEN** the horizontal centres of the line, the subject card and the strip are within 2 px of each other and of the screen's centre

### Requirement: Chaos token draw
When a skill test reveals a chaos token, the draw SHALL play as a stage of the skill-test screen over the subject card in the centre, with the subject, the placed cards and the calculation strip staying where they were:
1. The chaos bag is tossed onto the table: it flies from its button in an arc, lands on the lower part of the subject card with a bounce and a squash, and tips over on its side with its mouth open. The tokens tumble out of the mouth in a burst: each leaves low on its own arc and keeps its speed in the air, spinning and tumbling in perspective so its edge shows, hits the table, bounces once or twice with less height and speed each time, slides to a stop and wobbles flat like a coin settling, at its own place over or around the subject card (the resting places cover the card and the space beside it, so the card stays visible between them), tilting flat as it settles; later tokens leave a few milliseconds after earlier ones, so they come out as a stream. Each token is shown face down as a plain cream chaos token, the colour of the real tokens, with no symbol, a slightly darker rim and a visible edge when tilted, casting a shadow on the table that falls further away and fainter the higher it is, the size of a revealed token, one per token currently in the bag. The whole toss takes about 1.2 seconds at the Slow and Tap paces and about 0.9 seconds at the Normal pace, plays on every draw, and the paths are seeded by the test so a reload tosses the same way. Under reduced motion the bag and tokens simply appear in place.
2. The deciding player taps any disc. Space or Enter picks one too.
3. The chosen disc flips in place, revealing the token's real art on its face, while the other discs fade. The token then slides into the calculation strip, where its modifier (or "auto-fail" / "elder sign" effect) joins the sum.
4. The screen moves to its result stage over the subject card: the big total, below it Success or Fail in big text, below that a Continue button; bottom centre, the arithmetic as icons, for example "[intellect] 3 + [token −1] + [card] 2 = 4 vs 2". It stays until Continue is pressed.

The draw SHALL NOT start until the screen has settled: every earlier animated event has finished, every card still flying (a card drawn, played, spawned or put into play, an encounter card being revealed) has landed, and about 0.4 s has passed after that. If something keeps animating, the draw starts anyway after at most 4 seconds, so the game can never stall.

Which token comes out MUST NOT depend on the disc tapped. The engine's seeded draw decides it, so saved games and action-log replays stay exact.

When a test reveals more than one token, each is drawn the same way in turn. Bot play and the debug "skip" bypass the interaction. With the menu setting "Draw chaos tokens by hand" off, the discs do not spill: one token flips straight out of the bag and slides into the strip without waiting for a tap, after the screen has settled the same way; the result stage then closes on its own after a short pause (or waits for a tap at the Tap pace).

#### Scenario: Draw a token by hand
- **WHEN** Roland investigates the Study and finishes committing cards, with 16 tokens in the bag
- **THEN** the bag is tossed onto the Study card in the centre and 16 face-down tokens tumble out of it, bounce and come to rest over and around the card; after he taps one, it flips in place into the revealed token, e.g. −1, the others fade, and the token slides into the calculation strip

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

#### Scenario: Tokens tumble out
- **WHEN** the draw starts with 16 tokens in the bag at 1600×900
- **THEN** the bag lands and tips over, the tokens stream out of its mouth over about half a second, each bouncing at least once and turning as it flies, and all are at rest within about 0.9 seconds of the bag leaving its button at the Normal pace, 1.2 seconds at the Slow pace

#### Scenario: Reduced motion
- **WHEN** the system asks for reduced motion
- **THEN** the bag and the face-down tokens appear in place without the toss
