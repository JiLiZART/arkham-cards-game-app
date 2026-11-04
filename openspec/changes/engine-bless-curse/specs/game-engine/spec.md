## ADDED Requirements

### Requirement: Sealed tokens

A chaos token SHALL be sealable on a card in play: it is taken from the bag (the controller choosing when several qualify), held by that card, not in the bag and not revealable. A player card with the Seal keyword SHALL seal its token on entering play, and SHALL NOT be playable while no such token is in the bag; a card instructed to seal a token when none is in the bag SHALL not seal. When a card holding sealed tokens leaves play they SHALL be released to the bag at once, except a bless or curse token the rules return to the pool. Effects SHALL be able to release tokens by kind or count from one card or from any card, and to count tokens in the bag, sealed on a card, or both. An enemy's prey SHALL be definable as the investigator with the most tokens of a kind sealed on cards they control.

#### Scenario: Seal as a cost

- **GIVEN** Protective Incantation (04031, Seal (curse)) in hand and no curse token in the bag
- **WHEN** Daisy chooses an action
- **THEN** playing it is not offered; with a curse in the bag it is, and playing it moves that curse from the bag onto the card

#### Scenario: Released when the card leaves play

- **GIVEN** The Chthonian Stone (04030) holding a sealed skull
- **WHEN** it is discarded
- **THEN** the skull is back in the bag before the next test

#### Scenario: Counting sealed tokens

- **GIVEN** Pnakotus (04334) asking for tokens in the bag or sealed on cards in play
- **WHEN** two elder things are in the bag and one is sealed on a card
- **THEN** the amount reads 3

#### Scenario: Prey by sealed tokens

- **GIVEN** an enemy with prey "most sealed blood tokens", Roland controlling a card with 2 sealed blood tokens and Daisy one with 1
- **WHEN** it spawns engaged with prey
- **THEN** it engages Roland

## MODIFIED Requirements

### Requirement: Chaos bag

The engine SHALL hold a chaos bag of tokens defined by the scenario/campaign difficulty, draw tokens at random from the seeded RNG, return revealed tokens after the test, and support adding, removing and sealing tokens. Symbol tokens (skull, cultist, tablet, elder thing) MUST resolve using the current scenario's reference card values for the chosen difficulty, and a hand-written scenario SHALL define its token effects for all four difficulties (Easy, Standard, Hard, Expert), from the front and the back of its reference card. A token effect SHALL be able to search the encounter deck and the encounter discard pile for an enemy matching a filter and have the investigator taking the test draw it, shuffling the encounter deck after, and to reveal another token when a condition holds (such as an enemy with a trait being in play, or none being in play).

A token line SHALL be able to give a different modifier when a condition holds ("−1 (−3 instead if you have 3 or more horror)"), the condition read at the moment the token resolves; a token's X SHALL be able to count the cards beneath a card or the locations without a card beneath them.

The bag SHALL know the bless and curse kinds: a scenario holds a pool of 10 of each; adding a bless or curse takes it from the pool, so no more than 10 of a kind are in the bag and sealed together; removing one returns it to the pool; a bless or curse revealed, in a test or by an effect, returns to the pool after it resolves, not to the bag; those still in the bag when the scenario ends return to the pool. Each token kind that is not a symbol SHALL carry its reveal rule (modifier, whether another token is revealed, where it returns) in one table, so a later kind (frost, blood) is a row of it. When a token is revealed the engine SHALL open a window naming its kind, for abilities that react to a kind being revealed. Effects SHALL be able to add, remove and replace tokens by kind, reveal N tokens outside a test and act on them, and read how many of a kind are in the bag.

#### Scenario: Skull resolved by scenario

- **WHEN** a skull is revealed in The Gathering on Standard
- **THEN** the modifier equals −X where X is the number of Ghoul enemies at the investigator's location, per the scenario reference card

#### Scenario: Skull on Hard

- **GIVEN** The Gathering on Hard, with a Ghoul enemy in the encounter discard pile
- **WHEN** an investigator reveals a skull and fails the test
- **THEN** the modifier is −2, and after the test that investigator draws the Ghoul enemy from the discard pile and the encounter deck is shuffled

#### Scenario: Reveal another when no Cultist is in play

- **GIVEN** The Midnight Masks on Expert with no Cultist enemy in play
- **WHEN** a cultist token is revealed
- **THEN** its modifier is −2, no doom is placed, and another token is revealed

#### Scenario: Every difficulty defined

- **WHEN** the content is checked
- **THEN** each of Night of the Zealot's three scenarios has token effects for Easy, Standard, Hard and Expert

#### Scenario: A modifier that changes on a condition

- **GIVEN** Curtain Call on Standard (skull: −1, −3 instead if you have 3 or more horror)
- **WHEN** an investigator with 3 horror reveals a skull
- **THEN** the modifier is −3; with 2 horror it is −1

#### Scenario: The pool caps the bag

- **GIVEN** 8 bless tokens in the bag and 2 sealed on cards
- **WHEN** an effect adds 3 bless tokens
- **THEN** none is added, the pool being empty; after one sealed bless is released to the pool, adding 3 adds 1

#### Scenario: A bless returns to the pool

- **WHEN** a test reveals a bless token
- **THEN** the modifier is +2, another token is revealed, and after the test the bless is in the pool and not in the bag

#### Scenario: After a curse is revealed

- **GIVEN** a card with "after a curse token is revealed during your test" in play
- **WHEN** a curse is revealed in its controller's test
- **THEN** the ability is offered in the reveal window and the curse's −2 applies

### Requirement: Skill tests

The engine SHALL resolve skill tests as: determine skill value and difficulty → commit cards from hand (matching icons, wild icons) → reveal a chaos token → apply token modifier and effects → compare total to difficulty (success if ≥) → apply results and committed cards' effects → discard committed cards. An auto-fail token MUST fail regardless of total; total skill MUST NOT drop below 0. The Elder Sign MUST trigger the investigator's Elder Sign ability.

While an investigator's commit window is open, the engine SHALL offer, for each card that investigator committed to this test, an option to take it back. Taking a card back SHALL return it to its owner's hand and remove its icons from the test value, and the same investigator's commit choice is asked again. Once that investigator chooses Done, their committed cards stay committed. Taking back is an ordinary recorded choice, so saved games and action-log replays stay exact. The bot MUST NOT take cards back.

The investigator performing the test MAY commit any number of eligible cards; each other investigator at that location MAY commit at most one, after which their window offers only Done and taking that card back. When a test automatically fails, the investigator's skill value for it counts as 0; when it automatically succeeds, its difficulty counts as 0; "succeeded by" and "failed by" are measured from those values. When an automatic result is known before the chaos token is revealed, no token is revealed and its effects do not resolve. Automatically evading an enemy exhausts and disengages it and counts as evading it, but is not a successful evasion: abilities that trigger after an enemy is evaded resolve, abilities that trigger after a successful evasion do not.

A bless token revealed in a test SHALL add +2 and reveal another token; a curse SHALL add −2 and reveal another; the modifiers of every token revealed in the test SHALL be summed. Bless and curse tokens revealed SHALL return to the pool when the test ends; every other revealed token returns to the bag. A cancelled or ignored bless or curse SHALL return to the pool too.

#### Scenario: Investigate success

- **WHEN** Roland (intellect 3) investigates a shroud-2 location and reveals a `-1` token
- **THEN** total 2 ≥ 2, the test succeeds and Roland discovers 1 clue from the location

#### Scenario: Auto-fail

- **WHEN** the tentacle token is revealed
- **THEN** the test fails even if skill exceeds difficulty

#### Scenario: Committed icons

- **WHEN** an investigator commits a card with two matching skill icons to their own test
- **THEN** their skill value increases by 2 for that test

#### Scenario: Take a committed card back

- **WHEN** Roland commits Vicious Blow to a fight test and then takes it back before choosing Done
- **THEN** Vicious Blow is in Roland's hand again, the test value no longer counts its icon, and Roland is asked again what to commit, with Vicious Blow among the options

#### Scenario: No take-back after Done

- **WHEN** Roland commits Vicious Blow and chooses Done
- **THEN** no later choice in that test offers to take Vicious Blow back

#### Scenario: Another investigator's card

- **WHEN** Roland commits Vicious Blow to his test and chooses Done, and Daisy, at his location, is then asked to commit
- **THEN** Daisy is not offered to take back Roland's Vicious Blow

#### Scenario: A helper commits one card

- **GIVEN** Daisy at Roland's location with two cards bearing a combat icon
- **WHEN** Roland fights and Daisy commits one of them
- **THEN** Daisy is offered only Done and taking her card back, not the second card

#### Scenario: Failing by the whole difficulty

- **WHEN** Roland reveals the auto-fail token on a willpower (3) test of Rotting Remains
- **THEN** he failed by 3 and takes 3 horror

#### Scenario: Succeeding by the whole value

- **WHEN** Nathaniel (combat 5) attacks with One-Two Punch (level 5) and commits Overpower (level 2)
- **THEN** no chaos token is revealed, the attack succeeds by 8 (5 + 3 icons against 0) and Overpower draws 2 cards

#### Scenario: Cunning Distraction is not a successful evasion

- **WHEN** Wendy plays Cunning Distraction against two enemies at her location
- **THEN** both are exhausted and disengaged; with Pickpocketing in play she may draw a card (it triggers after evading an enemy), but no ability that triggers after a successful evasion is offered

#### Scenario: Bless then a number

- **WHEN** Roland (intellect 3) investigates a shroud-4 location and the bag gives a bless then a −1
- **THEN** the total is 3 + 2 − 1 = 4, the test succeeds, the −1 goes back to the bag and the bless to the pool

#### Scenario: Curse then auto-fail

- **WHEN** a test reveals a curse and then the auto-fail
- **THEN** the test fails, and the curse is in the pool after it
