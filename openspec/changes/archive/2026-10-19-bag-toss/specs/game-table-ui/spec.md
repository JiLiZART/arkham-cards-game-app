## MODIFIED Requirements

### Requirement: Chaos token draw

When a skill test reveals a chaos token, the draw SHALL play as a stage of the skill-test screen, in the space kept free in its middle, with the subject, the placed cards and the calculation strip staying where they were:

1. The chaos bag is tossed onto the table: it flies from its button in an arc, lands in the lower middle of the stage with a bounce and a squash, and tips over on its side with its mouth open. The tokens tumble out of the mouth in a burst: each leaves low on its own arc and keeps its speed in the air, spinning and tumbling in perspective so its edge shows, hits the table, bounces once or twice with less height and speed each time, slides to a stop and wobbles flat like a coin settling, at its own place, tilting flat as it settles; later tokens leave a few milliseconds after earlier ones, so they come out as a stream. Each token is shown face down as a plain cream chaos token, the colour of the real tokens, with no symbol, a slightly darker rim and a visible edge when tilted, casting a shadow on the table that falls further away and fainter the higher it is, the size of a revealed token, one per token currently in the bag. The whole toss takes about 1.2 seconds at the Slow and Tap paces and about 0.9 seconds at the Normal pace, plays on every draw, and the paths are seeded by the test so a reload tosses the same way. Under reduced motion the bag and tokens simply appear in place.
2. The deciding player taps any disc. Space or Enter picks one too.
3. The chosen disc flips in place, revealing the token's real art on its face, while the other discs fade. The token then slides into the calculation strip, where its modifier (or "auto-fail" / "elder sign" effect) joins the sum.
4. The screen moves to its result stage: the big total, below it Success or Fail in big text, below that a Continue button; bottom centre, the arithmetic as icons, for example "[intellect] 3 + [token −1] + [card] 2 = 4 vs 2". It stays until Continue is pressed.

The draw SHALL NOT start until the screen has settled: every earlier animated event has finished, every card still flying (a card drawn, played, spawned or put into play, an encounter card being revealed) has landed, and about 0.4 s has passed after that. If something keeps animating, the draw starts anyway after at most 4 seconds, so the game can never stall.

Which token comes out MUST NOT depend on the disc tapped. The engine's seeded draw decides it, so saved games and action-log replays stay exact.

When a test reveals more than one token, each is drawn the same way in turn. Bot play and the debug "skip" bypass the interaction. With the menu setting "Draw chaos tokens by hand" off, the discs do not spill: one token flips straight out of the bag and slides into the strip without waiting for a tap, after the screen has settled the same way; the result stage then closes on its own after a short pause (or waits for a tap at the Tap pace).

#### Scenario: Draw a token by hand

- **WHEN** Roland investigates the Study and finishes committing cards, with 16 tokens in the bag
- **THEN** the bag is tossed onto the table and 16 face-down tokens tumble out of it, bounce and come to rest around it; after he taps one, it flips in place into the revealed token, e.g. −1, the others fade, and the token slides into the calculation strip

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
