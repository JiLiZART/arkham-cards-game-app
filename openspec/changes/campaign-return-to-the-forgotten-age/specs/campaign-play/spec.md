## ADDED Requirements

### Requirement: Return to The Forgotten Age content

The content SHALL hold Return to The Forgotten Age as a hand-written campaign under `content/campaigns/return-to-the-forgotten-age/` with the 10 Return scenarios in the base order, Return to The Depths of Yoth included. Each SHALL set up as its base scenario does and then as its Return-to setup card (53016, 53017, 53028, 53038, 53045, 53048, 53053, 53059, 53061, 53066) says, use the replacement encounter sets of the box in place of the sets they replace and Return to the Rainforest beside the Rainforest set, shuffle the top card of the encounter deck into the exploration deck after every successful exploration, use its base scenario's chaos token table, run its base scenario's script extended by the box's rules, and end in the base scenario's resolutions. The Resupply Point SHALL heal trauma without limit and convert up to 10 experience per investigator into supply points at 2 per point; the Key of Eztli SHALL be a supply an investigator can hold.

#### Scenario: Return to The Untamed Wilds

- **WHEN** Return to The Untamed Wilds starts
- **THEN** the exploration deck holds four Jungle locations, one per connection symbol out of the two of each symbol, and no treachery; the other four are removed; after a successful exploration the top card of the encounter deck is shuffled into the exploration deck; the camp's supplies check can be used from any location

#### Scenario: Return to The Doom of Eztli

- **WHEN** Return to The Doom of Eztli starts
- **THEN** the Entryway in play is 53019 and 04060 is not in the game, the Burial Pit, Underground Ruins and Secret Passage are out of the game, the exploration deck is 53020–53026, three Pit Vipers are set aside, and the Harbinger that may spawn is 53018

#### Scenario: Return to Threads of Fate

- **GIVEN** the players chose the fourth act deck's version before the scenario
- **WHEN** Return to Threads of Fate starts
- **THEN** four act decks are in play, Veda Whitsley is set aside, and the Cult of Pnakotus set is in the encounter deck in place of Dark Cult

#### Scenario: Return to The Boundary Beyond

- **WHEN** Return to The Boundary Beyond starts
- **THEN** each of the six Present-Day slots holds one of its two versions at random, the exploration deck is the twelve Tenochtitlán locations and nothing else, and the Return-to Harbinger is set aside

#### Scenario: Return to Heart of the Elders

- **WHEN** Return to Heart of the Elders Part 1 starts
- **THEN** act 1a is "A Familiar Pattern" (53046), the exploration deck holds six locations, one per symbol; and in Part 2 the K'n-yan deck holds one location per symbol including Green Diamond, and the Mouth's supply check works anywhere and discards enemies too

#### Scenario: Return to The City of Archives

- **WHEN** Return to The City of Archives starts
- **THEN** the Halls of the Southern Corridors (53055) are in play, the Cyclopean Vaults and Alien Conservatory are set aside until act 1b, and the act deck is 04241, 53054, 04243

#### Scenario: Return to The Depths of Yoth

- **WHEN** the depth level advances in Return to The Depths of Yoth
- **THEN** Perils of Yoth (53060) is shuffled into the new exploration deck

#### Scenario: Return to Shattered Aeons

- **WHEN** Return to Shattered Aeons starts
- **THEN** the exploration deck holds the four Otherworld locations only, the Return-to Shattered locations are set aside with the originals, and Ultima Thule (53064) seals an elder sign when it enters play

#### Scenario: Resupply when Returning

- **GIVEN** Leo with 12 experience and 2 physical trauma at the Resupply Point of Return to The Forgotten Age
- **WHEN** he spends 10 experience on trauma and converts the rest
- **THEN** he has 0 trauma, 1 supply point from the 2 converted, and 0 experience

### Requirement: The Forgotten Age offers the replacement sets

Creating The Forgotten Age SHALL offer one option, off by default and fixed for the campaign, to use the Return-to box's replacement encounter sets: Cult of Pnakotus for Dark Cult, Doomed Expedition for Expedition, Temporal Hunters for Temporal Flux, Venomous Hate for Yig's Venom. No option SHALL shuffle the old and new sets together.

#### Scenario: Option on

- **GIVEN** The Forgotten Age created with the replacement sets
- **WHEN** The Untamed Wilds starts
- **THEN** Doomed Expedition's cards are in the game and Lost in the Wilds and Low on Supplies are not

#### Scenario: Option off

- **WHEN** The Forgotten Age is created without the option
- **THEN** no card of the rttfa pack is in any scenario's decks
