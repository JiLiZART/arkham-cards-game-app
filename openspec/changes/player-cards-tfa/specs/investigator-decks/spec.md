## ADDED Requirements

### Requirement: The Forgotten Age investigators work

Leo Anderson (04001), Ursula Downs (04002), Finn Edwards (04003), Father Mateo (04004) and Calvin Wright (04005) SHALL have their printed abilities and elder sign effects: Leo may play an Ally for 1 less when his turn begins, his elder sign +2 with a ready Ally; Ursula may investigate as a free action after she moves, once per round, her elder sign +2 or an investigate when revealed on an investigate; Finn has an extra action each turn usable only to evade, his elder sign +1 with 1 resource gained on a success; Father Mateo turns one auto-fail per game into an elder sign, his elder sign +2 or a successful cancel with the option to draw and gain; Calvin's skills are 0 plus 1 per damage and horror on him, his elder sign +1 with a damage or horror taken for +1 more. On Your Own (53010) and Arcane Research (04109) SHALL be checked by deck validation as printed. `content/coverage.json` SHALL report `investigators["04001"]` to `["04005"]` true.

#### Scenario: Ursula's free investigate

- **WHEN** Ursula moves to a location with clues
- **THEN** she may investigate there without spending an action, once this round

#### Scenario: Finn's evade action

- **WHEN** Finn's turn begins
- **THEN** he has four actions, one of which can only be spent on an Evade (basic or on a card) and not on a Draw

#### Scenario: Father Mateo's auto-fail

- **GIVEN** Father Mateo has not used his ability this game
- **WHEN** he reveals an auto-fail
- **THEN** he may treat it as an elder sign; the second time this game he may not

#### Scenario: Calvin's stats

- **GIVEN** Calvin Wright with 2 damage and 3 horror
- **WHEN** he takes a willpower test
- **THEN** his willpower is 5
