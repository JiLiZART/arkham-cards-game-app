## ADDED Requirements

### Requirement: The Carcosa investigators work

Mark Harrigan (03001), Minh Thi Phan (03002), Sefina Rousseau (03003), Akachi Onyele (03004), William Yorick (03005) and Lola Hayes (03006) SHALL have their printed abilities and elder sign effects: Mark starts each scenario with Sophie in play, draws a card after damage is placed on a card he controls (once per phase), his elder sign +1 per damage on him; Minh gives a card committed by an investigator at her location a wild icon (once per investigator per round), her elder sign +1 and a committed skill returned to hand; Sefina draws 13 for her opening hand, places up to 5 events beneath her and keeps 8, may spend an action to draw one of them without an attack of opportunity, her elder sign +3 and one drawn; Akachi's charge assets enter play with one more charge, her elder sign +1 and a charge; Yorick plays an asset from his discard after defeating an enemy (once per round), his elder sign +2 and a card back on success; Lola chooses a role after her opening hand, may play, commit and use only Neutral cards and cards of her role, switches it once per round as a fast ability, her elder sign +2 and a switch. `content/coverage.json` SHALL report `investigators["03001"]` to `["03006"]` true.

#### Scenario: Sefina's opening hand

- **WHEN** a scenario starts with Sefina Rousseau
- **THEN** she sees 13 cards, chooses up to 5 events to place beneath her and 8 to keep, the rest are discarded, no mulligan is offered, and an action draws one of the events beneath her

#### Scenario: Lola's role

- **GIVEN** Lola Hayes who chose Rogue after her opening hand, with a Guardian asset and a Neutral event in hand
- **WHEN** she looks at what she can play
- **THEN** the Neutral event is offered and the Guardian asset is not; after her fast switch to Guardian the asset is, and the switch is not offered again this round

#### Scenario: Mark starts with Sophie

- **WHEN** a scenario starts with Mark Harrigan
- **THEN** Sophie (03009) is in play under his control, and when he has 5 damage she flips to her −1 side
