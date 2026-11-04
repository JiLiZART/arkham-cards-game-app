## MODIFIED Requirements

### Requirement: Coverage of packs and campaigns

The content SHALL report, for every card pack, its encounter cards and its player cards (assets, events, skills, weaknesses) and how many of each work in the game. A card SHALL work when every line of its printed text is accounted for: by its abilities in data or a card script, or by a field the engine acts on for that kind of line (a `Prey -` line by `prey`, an "investigated using [skill] instead" line by `investigateSkill`, a `Uses (n …)` line by `uses`, a "Max n committed per skill test" line by `maxCommitted`, a `Spawn -` line by the spawn the engine reads, a line of keywords by keywords the engine acts on), or by having no text at all. A line with nothing behind it SHALL leave the card not working, whatever other lines are covered. A scenario reference card SHALL work when every symbol token line on its front (Easy and Standard) and its back (Hard and Expert) is covered by that difficulty's token entry for that token: the modifier for a bare modifier, `x` for "-X", an `onFail` effect for "If you fail", an `onReveal` effect or a condition for an effect on reveal, a reveal-another rule for "reveal another token", and the token entries for all four difficulties SHALL be written. A reference card that several scenarios play with (a Return-to scenario uses its base scenario's card) SHALL work, in a pack's and the catalog's count, only when it is real for each of them; a scenario, and the campaign it belongs to, SHALL be judged by that scenario's own token entries. A setup card (a `scenario`-type card a scenario lists in `setupCards` beside its reference card) SHALL work when it prints no token lines, and a scenario's token effects SHALL be real when its reference card's are, whatever its setup cards. For every campaign it SHALL report the cards its scenarios use (their encounter sets, side decks, acts, agendas, reference and setup cards, less the cards a `remove` setup step takes out of the game), how many of them work, the ones that don't by card type, and which of its scenarios have a scenario script. A campaign SHALL be complete when every one of its scenarios is complete; a pack SHALL be complete when every one of its cards works.

#### Scenario: Night of the Zealot

- **GIVEN** the content once this change is in
- **WHEN** the coverage is computed
- **THEN** Night of the Zealot reports every card its scenarios use as working, its three reference cards included, and is complete

#### Scenario: Behaviour in data counts

- **GIVEN** the Ghoul Priest, whose text is "Prey - Highest [combat]." and "Hunter. Retaliate.", with `prey` set to highest combat
- **WHEN** the coverage is computed
- **THEN** the Ghoul Priest works

#### Scenario: A line with nothing behind it

- **GIVEN** an enemy with `prey` set whose text also has a Forced ability that is neither in its abilities nor in a script
- **WHEN** the coverage is computed
- **THEN** the enemy does not work

#### Scenario: Placeholder tokens

- **GIVEN** a generated scenario whose token entries carry only modifiers, while its reference card says "[cultist] -1. If you fail, take 1 horror."
- **WHEN** the coverage is computed
- **THEN** its reference card does not work, and its campaign is not complete

#### Scenario: A card shared with a Return-to scenario

- **GIVEN** The Gathering with its tokens written on all four difficulties, and Return to The Gathering, which plays with the same reference card, with its token tables empty
- **WHEN** the coverage is computed
- **THEN** The Gathering and Night of the Zealot are complete, the reference card counts as not working in its pack, and Return to The Gathering is not complete

#### Scenario: A missing difficulty

- **GIVEN** a scenario with token entries for Easy and Standard only
- **WHEN** the coverage is computed
- **THEN** its reference card does not work, because the back's Hard and Expert lines are not covered

#### Scenario: The Dunwich Legacy

- **WHEN** the coverage is computed
- **THEN** The Dunwich Legacy reports how many of the cards its eight scenarios use work, the rest counted by type (locations, enemies, treacheries, acts, agendas, scenario reference cards), and none of its scenarios as scripted

#### Scenario: A pack

- **WHEN** the coverage is computed
- **THEN** the Dunwich deluxe pack reports its encounter cards and its player cards separately, with how many of each work

#### Scenario: A setup card without token lines

- **GIVEN** Return to The Gathering with `card: "01104"` and `setupCards: ["50011"]`, 01104's table real on all four difficulties
- **WHEN** the coverage is computed
- **THEN** the scenario's tokens are real and 50011 counts as a working scenario card in the rtnotz pack

#### Scenario: Removed cards not counted

- **GIVEN** Echoes of the Past gathering `arkham` with a `remove` step naming its 13 non-treachery cards
- **WHEN** the coverage is computed
- **THEN** the scenario's used cards include False Lead and Hunting Shadow and none of the 13, and its working count does not include them
