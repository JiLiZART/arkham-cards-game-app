## ADDED Requirements

### Requirement: Exploration deck and the Explore action

A scenario SHALL be able to build an exploration deck at setup from listed cards and copies, taken out of the encounter deck and the set-aside cards, with random picks (a count out of a list; one of each group of locations sharing a connection symbol, the rest removed), shuffled with the seeded random generator. Explore SHALL be an action designator. An Explore ability SHALL draw the top card of the exploration deck: a location of the kind the ability names (a connecting location by its printed connection symbols, a location with a trait, or any) is put into play with its clues and the investigator moves there (a successful exploration); any other location is set beside the deck and the next card is drawn; a treachery is resolved and discarded to the encounter discard pile (an unsuccessful exploration); an enemy is drawn as from the encounter deck. After the action every location set beside the deck is shuffled back. The engine SHALL open a window after an exploration naming whether it succeeded, keep whether each investigator explored this turn, and honour "cannot explore" on a location or an investigator. Effects SHALL be able to look at the top cards of the exploration deck and reorder them or discard the treacheries among them, shuffle a card into it, reveal cards from it until a location, and rebuild it. A scenario SHALL be able to declare effects that run after every successful exploration.

#### Scenario: A successful exploration

- **GIVEN** Ursula at the Expedition Camp with an Explore ability on the agenda, and an exploration deck whose top card is Path of Thorns, connected to the camp by symbol
- **WHEN** she explores
- **THEN** Path of Thorns is in play with its clues, Ursula is at Path of Thorns, one action was spent, and the explored window reports success

#### Scenario: A location that does not connect

- **GIVEN** the exploration deck's top card is Circuitous Trail (not connected to the camp) and the next is Path of Thorns
- **WHEN** Ursula explores
- **THEN** Circuitous Trail is set beside the deck, Path of Thorns is put into play and she moves there, and Circuitous Trail is shuffled back into the exploration deck

#### Scenario: A treachery ends the exploration

- **GIVEN** the exploration deck's top card is Lost in the Wilds
- **WHEN** Ursula explores
- **THEN** Lost in the Wilds resolves as a treachery she drew, goes to the encounter discard pile, she stays at her location, and the explored window reports failure

#### Scenario: One of each symbol pair

- **GIVEN** a Return-to setup listing two Jungle locations per connection symbol for four symbols
- **WHEN** the scenario sets up
- **THEN** the exploration deck holds four locations, one per symbol, the other four are removed from the game, and the same seed gives the same four

#### Scenario: The bot explores

- **GIVEN** a bot investigator at a location with no clues and an Explore ability in play
- **WHEN** it takes its turn
- **THEN** it explores at least once

### Requirement: Vengeance in the victory display

A card SHALL be able to carry a vengeance value. An enemy with vengeance defeated, a treachery with vengeance resolved and discarded, and at the scenario's end a revealed location with vengeance and no clues SHALL go to the victory display as a card with victory points does. A card in play SHALL be able to count as in the victory display for vengeance while a condition holds. The vengeance in the victory display SHALL be readable as an amount, a condition with a minimum, and a chaos-token X. The scenario record SHALL keep the vengeance in the victory display at the end, and an effect SHALL be able to return a chosen non-Elite vengeance card from the victory display to the encounter discard pile, and record the vengeance cards in the victory display as a card list.

#### Scenario: Brood of Yig defeated

- **WHEN** Brood of Yig (vengeance 1) is defeated
- **THEN** it is in the victory display, the investigators earn no experience for it, and the vengeance in the victory display is 1

#### Scenario: Underground Ruins counts while an enemy is there

- **GIVEN** Underground Ruins (vengeance 1) in play with a Pit Viper on it and the victory display empty
- **WHEN** a skull whose X is the vengeance in the victory display is revealed
- **THEN** X is 1; after the Pit Viper leaves, X is 0

#### Scenario: Vengeance locations at the end

- **GIVEN** Underground Ruins revealed with no clues when the scenario ends
- **THEN** the scenario record's vengeance includes its 1, and the campaign flow can read that number

### Requirement: The Poisoned weakness

Setup SHALL be able to set aside every copy of the Poisoned weakness that is not in an investigator's deck. An effect SHALL be able to poison an investigator: a set-aside Poisoned enters their threat area unless they already have one, and nothing happens when none is left. Conditions and enemy prey SHALL be able to ask whether an investigator is poisoned. A Poisoned in an investigator's threat area when the scenario ends SHALL stay in their deck for the campaign and start the next scenario in play; a campaign-flow effect SHALL be able to remove it.

#### Scenario: Snake Bite poisons

- **GIVEN** three Poisoned set aside and Roland not poisoned
- **WHEN** Snake Bite's revelation poisons him
- **THEN** a Poisoned is in his threat area and two are set aside; a second poisoning changes nothing

#### Scenario: Poisoned carries over

- **GIVEN** Roland poisoned when The Untamed Wilds ends
- **WHEN** The Doom of Eztli sets up
- **THEN** his Poisoned starts in his threat area and three copies are set aside

### Requirement: Token X sources, clamps and auto-fail

A token effect SHALL be able to compute X from the vengeance in the victory display, the locations in play, the cards in the exploration deck, the locations with doom, the doom on locations, or a named scenario counter, and clamp X to a minimum and a maximum. A token effect SHALL be able to make the test fail automatically instead of applying its modifier while a condition holds.

#### Scenario: Tablet in The Untamed Wilds

- **GIVEN** The Untamed Wilds on Standard with 7 cards in the exploration deck
- **WHEN** a tablet is revealed
- **THEN** the modifier is −5 (X = 7, maximum 5)

#### Scenario: Elder thing while poisoned

- **GIVEN** The Untamed Wilds on Standard and a poisoned investigator in a test
- **WHEN** an elder thing is revealed
- **THEN** the test fails automatically; an investigator who is not poisoned gets −2

### Requirement: Scenario counters and clue-to-doom flips

A scenario SHALL be able to keep named counters that effects set and add to, conditions compare and tokens read, and an effect SHALL be able to flip a clue on a location to its doom side.

#### Scenario: Depth level

- **GIVEN** a scenario counter `depth` at 2
- **WHEN** a skull whose X is the counter is revealed
- **THEN** the modifier is −2

#### Scenario: Clue flipped

- **GIVEN** Ancient Hall with 2 clues and no doom
- **WHEN** its effect flips a clue
- **THEN** it has 1 clue and 1 doom
