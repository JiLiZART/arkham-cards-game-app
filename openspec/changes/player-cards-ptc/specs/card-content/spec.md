## ADDED Requirements

### Requirement: The Path to Carcosa cycle player cards

Every player card of the ptc, eotp, tuo, apot, tpm, bsr, dca and rtptc packs SHALL have its behaviour, in data in the pack's `cards.json` where the vocabulary fits and in `scripts/<code>.ts` otherwise, except the story cards the campaign changes write (03059, 03076a, 03077, 03077b, 03078, 03078b, 03079, 03079b, 03080, 03080b, 03182a, 03227, 03321b, 52025, 52026). The vocabulary SHALL express: an amount of half the damage on you; committing a card to a test at another location and a trigger on committing exactly one card; adding a defeated enemy to the victory display; cards that cannot leave your discard; prey restricted to one investigator; a bonus to your next test this phase after moving to a location with clues; investigating a revealed location from afar; an evade that disengages without exhausting and forbids re-engagement this turn; a "would succeed" trigger; a use kept on a margin; resources by margin with a cap and a symbol-token backlash; a move to any revealed location; a condition on a test on a Spell; an attachment giving a location's enemies Aloof; a Survivor card from the discard on success; Composure as a horror-assignment priority with one in play; commit conditions on remaining sanity; an in-hand cost modifier on the other cards; enemies engaged as an amount and engaging without attacks of opportunity; an attachment reacting to a spawn; a target not engaged with you; damage to each enemy at a location with a backlash; defeating engaged non-Elite enemies and yourself with a trauma; ignoring Retaliate; discarding a Terror from the threat area; extra clues per 2 of margin and an auto-evade by margin; shuffling the discard into the deck; charges added with a symbol-token discard; readying and healing an Ally on success; a location attachment granting a move anyone may use; a variable resource commit cost with a payout; an extra action once per turn; charges spent as a commit cost for wild icons; a test against an enemy's evade that defeats it; supplies distributed among assets; giving another investigator an action; a location shroud modifier until end of turn; a condition "attack of opportunity"; a "would be defeated by horror" heal; doom or horror on entering play with a search; cancelling an assigned damage; no attack of opportunity on play with a first-turn bonus; no chaos tokens with a forced elder sign and removal from the game; putting an asset into play from hand with cost up to the margin. Exile, Researched, Hidden, flip and cards beneath SHALL be used as other changes define them. Stick to the Plan and Charon's Obol SHALL start in play as Permanent cards. Time Warp SHALL restore the state to the start of the current action. `content/coverage.json` SHALL report the eight packs' player cards complete and `docs/campaign-program.md` their player columns at 0 left.

#### Scenario: Composure first

- **GIVEN** Mark Harrigan with Combat Training (03107) in play
- **WHEN** an enemy attack deals him 1 horror
- **THEN** the horror must be placed on Combat Training while it has sanity left; direct horror goes to Mark

#### Scenario: Archaic Glyphs translated

- **GIVEN** Archaic Glyphs (03025) with 2 secrets in a campaign
- **WHEN** its controller adds a third secret
- **THEN** the campaign log records the glyphs researched, Archaic Glyphs is discarded, and the next upgrade offers Archaic Glyphs (03192) and (03193) to that investigator

#### Scenario: Time Warp

- **GIVEN** an investigator with Time Warp (03311) in hand who investigates, fails, and takes 2 horror from the test
- **WHEN** they play Time Warp
- **THEN** the clue, the action spent and the horror are as before the investigate, and Time Warp is in their discard

#### Scenario: Stealth

- **GIVEN** an investigator engaged with a Ghoul who plays Stealth (03028) and succeeds
- **THEN** they are disengaged, the Ghoul is not exhausted, and it cannot engage them again this turn

#### Scenario: Stick to the Plan

- **WHEN** a scenario starts for a deck with Stick to the Plan (03264) and three Tactic events
- **THEN** before the opening hand the player attaches up to three of them beneath it, in play, and may play them from there as from the hand
