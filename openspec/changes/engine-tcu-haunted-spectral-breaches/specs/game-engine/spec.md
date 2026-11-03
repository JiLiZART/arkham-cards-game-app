## ADDED Requirements

### Requirement: Haunted locations

A location is haunted when it, a card attached to it, or a card in play that grants haunted abilities to it (Nether Mist 05100 to its location, Whispers in the Dark 05102 to every location, The Wraith 05103 to the location it is attached to) has a `haunted` ability. When an investigator fails a skill test made as an investigate action at a location, the engine SHALL resolve every haunted ability of that location, each once, in the order the investigator chooses (one at a time, auto when one is left), after the test's failure effects and before the test ends. A haunted ability SHALL also resolve on demand from an effect ("resolve each haunted ability on your location"), and a condition SHALL report whether a location is haunted. A haunted ability never resolves on a passed test or on a failed test that is not an investigation.

#### Scenario: Failed investigation at a haunted location

- **GIVEN** an investigator at Victorian Halls (Spectral, 05082: "Haunted – Take 1 direct damage")
- **WHEN** the investigator fails an investigate test there
- **THEN** after the failure the investigator takes 1 direct damage, and the test then ends

#### Scenario: Two haunted abilities, the investigator orders them

- **GIVEN** a location with its own haunted ability and The Wraith attached to it
- **WHEN** an investigation there fails
- **THEN** the investigator is asked which haunted ability resolves first, both resolve, and none resolves twice

#### Scenario: Failed fight at a haunted location

- **WHEN** an investigator fails a fight test at a haunted location
- **THEN** no haunted ability resolves

#### Scenario: Token resolves haunted on an attack

- **GIVEN** At Death's Doorstep on Standard, tablet "−2. If you fail an attack or evasion, resolve each haunted ability on your location"
- **WHEN** the tablet is revealed during a fight the investigator fails at Trophy Room (Spectral)
- **THEN** the haunted abilities of Trophy Room resolve once

### Requirement: Spectral sides, flip bans and location swaps

A scenario or card SHALL be able to forbid flipping locations to a named side (an act's "locations cannot be flipped to their non-Spectral side"); while the ban holds, an ability that flips to that side is not offered and an effect that would flip is skipped. A location swap SHALL replace a location in play with a set-aside location: the instance keeps its identity, position, clues, doom, attachments, investigators and enemies; nothing is treated as having moved or entered; the replaced card's other copies in the set-aside pile are unaffected.

#### Scenario: Swap keeps everything in place

- **GIVEN** an investigator with 2 clues on Trophy Room (05073) and The Wraith attached, and Trophy Room's Spectral version (05079) set aside
- **WHEN** act 1b of At Death's Doorstep swaps every location for its Spectral version
- **THEN** the location is 05079 with the investigator, 2 clues and The Wraith on it, no `enterLocation` window opened, and 05073 is no longer in play

#### Scenario: Flip forbidden by the act

- **GIVEN** The Wages of Sin's act 2 forbidding a flip to the non-Spectral side
- **WHEN** an investigator at a Spectral location looks at their fast "flip your location" ability
- **THEN** it is not offered

### Requirement: Named encounter decks

A scenario SHALL be able to hold more than one encounter deck, each with its own discard pile, built at setup by splitting the gathered sets by a card filter (the Spectral trait into "spectral", the rest into "standard"). An investigator draws, searches, runs out and reshuffles from the deck their location selects: the spectral deck at a Spectral location, the standard deck elsewhere. A card discarded from play or from a threat area goes to the discard of the deck its filter names. An effect SHALL be able to name a deck ("shuffle into the spectral encounter deck", "search the standard encounter deck"). A scenario without a split has one deck, "standard", and behaves as before.

#### Scenario: Draw at a Spectral location

- **GIVEN** The Wages of Sin with the standard and spectral decks built
- **WHEN** an investigator at The Gallows (Spectral side) draws in the mythos phase
- **THEN** the card comes from the spectral deck, and a Spectral treachery discarded afterwards goes to the spectral discard

#### Scenario: Run-out reshuffles the right deck

- **GIVEN** the spectral deck empty and its discard holding 5 cards
- **WHEN** an investigator at a Spectral location draws an encounter card
- **THEN** the spectral discard is shuffled into the spectral deck and the standard deck is untouched

#### Scenario: One deck when not split

- **WHEN** The Gathering sets up
- **THEN** there is one encounter deck and every draw, search and discard uses it, as before

### Requirement: Enemies that flip into story cards

An enemy card whose back is a story card SHALL flip to that side when its data or script says so (on defeat for a Heretic, on a passed parley for Josef Meiger), keeping its instance in the zone the card names (the investigator's threat area for Unfinished Business, the victory display for a banished story). A story card in a threat area SHALL be able to flip back to its enemy side, re-entering play engaged with that investigator and attacking at once when the text says so. A story card can be banished: placed in the victory display, out of play.

#### Scenario: Heretic defeated

- **GIVEN** Heretic 05178a engaged with an investigator at a non-Spectral location
- **WHEN** its last damage is dealt
- **THEN** it is not discarded: it flips to Unfinished Business 05178b in that investigator's threat area, and no victory points are earned yet

#### Scenario: Unfinished Business flips back

- **GIVEN** Unfinished Business in a threat area at the end of the round, its forced test failed
- **WHEN** it flips back to the Heretic
- **THEN** the Heretic is engaged with that investigator, ready, and attacks

#### Scenario: Banished

- **WHEN** an Unfinished Business card's banish condition is met
- **THEN** it is in the victory display and counts for the token "X is the number of Unfinished Business in the victory display"

### Requirement: Chaos-token keys

A scenario SHALL be able to set aside key tokens (skull, cultist, tablet, elder thing) taken from the collection, not the bag. A key is placed on a location, an enemy or an asset, or taken into an investigator's control; an investigator takes a key from a location with no clues by the action the location names, from an enemy they defeat, and through a parley that says so; when an investigator with keys is defeated or leaves play, their keys go to their location. Conditions SHALL read whether an investigator controls a key, which keys are on a card, and which investigator holds the most keys (prey).

#### Scenario: Key taken from an enemy

- **GIVEN** Nathan Wick carrying the elder thing key
- **WHEN** an investigator defeats him
- **THEN** the investigator controls the elder thing key and the bar shows it

#### Scenario: Entry gated by a key

- **GIVEN** the Inner Sanctum (05213) "cannot be entered unless you control the [elder_thing] key"
- **WHEN** an investigator without it tries to move there
- **THEN** the move is not offered; with the key it is

### Requirement: Breaches and incursions

Locations and the current act SHALL hold breach counters. An agenda rule can replace doom placement: instead of each doom, 1 breach is placed on each of N+1 random locations (N the number of investigators). When a location holds 4 breaches an incursion resolves at once: its breaches are removed, 1 doom is placed on the current agenda (this placement is not replaced), and 1 breach is placed on each connecting location, which may start further incursions, resolved one at a time. Effects SHALL place breaches on your location, on a random location, or on the act, remove breaches from a location or the act, and read the count as an amount; an enemy spawn can name the location with the fewest or most breaches.

#### Scenario: Doom replaced by breaches

- **GIVEN** In the Clutches of Chaos with 2 investigators and agenda 05285
- **WHEN** the mythos phase would place 1 doom
- **THEN** no doom is placed; 3 distinct random locations gain 1 breach each

#### Scenario: Incursion chains

- **GIVEN** Southside with 3 breaches connected to Rivertown with 3 breaches
- **WHEN** Southside gains a fourth breach
- **THEN** Southside has 0 breaches, the agenda 1 more doom, Rivertown reaches 4 and its incursion follows: Rivertown 0, the agenda 2 more doom in all, and Southside 1 breach again

#### Scenario: Breaches moved to the act

- **WHEN** an investigator at Rivertown uses its ability to move 2 breaches from the location to the act
- **THEN** the location has 2 fewer and the act 2 more; the act's "remove 3 breaches: discover a clue on a random location" ability is offered once it has 3

### Requirement: The Cosmos and empty space

Given per-instance grid positions (`engine-location-instances-grid`), a scenario SHALL be able to fill grid cells with empty space: the top card of the active investigator's deck, placed facedown, which counts as a cell for distance and adjacency but cannot be entered or revealed. A Cosmos card drawn from its side deck SHALL be placed by its printed instruction, next to the investigator's location: above, below, left, right or any adjacent free or empty-space cell (an empty space it replaces returns to its owner's deck bottom); the instruction is a choice when more than one cell fits. While the agenda says so, every location is connected to each orthogonally adjacent location. A location can be moved to another cell, keeping what is on it, or shuffled back into the Cosmos deck (its contents go to the nearest location, its cell becomes empty space). An enemy with "spawns in the farthest empty space" or an ability "move to an adjacent empty space" occupies that cell as its location.

#### Scenario: Cosmos card placed below

- **GIVEN** Before the Black Throne with Cosmic Ingress at (0,1) and empty space at (0,2)
- **WHEN** an investigator there spends 1 clue, draws Dancer's Mist "Cosmos – connect below" and places it
- **THEN** Dancer's Mist is at (0,2), the empty-space card returns to its deck, and the two are connected

#### Scenario: Adjacency as connection

- **GIVEN** agenda 05326 in play and two locations at (1,0) and (1,1)
- **WHEN** an investigator at (1,0) looks at moves
- **THEN** (1,1) is a connecting location, and a location at (2,2) is not

#### Scenario: Three copies with separate neighbours

- **GIVEN** three copies of Flight into Oblivion in play at different cells
- **WHEN** one is shuffled back into the Cosmos
- **THEN** the other two keep their own positions and connections

### Requirement: Locations in front of an investigator

A location SHALL be able to be in front of an investigator. The locations in front of one investigator are connected to one another; a location in front of an investigator cannot be entered by another investigator; a setup op deals random locations from a pool in front of each investigator in player order, one at a time, until the pool or a count runs out. Printed connection symbols still apply between locations in front of different investigators.

#### Scenario: Witching Hour deal

- **GIVEN** three investigators and the seven Witch-Haunted Woods shuffled
- **WHEN** The Witching Hour sets up with "one in front of each investigator until 5 are in play"
- **THEN** the first and second investigators have two woods each, the third one, each investigator starts at one of their own, and the remaining two woods are set aside

#### Scenario: Cannot enter another's woods

- **WHEN** investigator A tries to move to a woods in front of investigator B
- **THEN** the move is not offered, while A's own two woods connect to each other

### Requirement: Circle actions, summed tests and braziers

A `circle` action designator SHALL exist for location abilities; a skill test SHALL be able to test the sum of two or more named skills against its difficulty, with commits adding their icons of any of those skills; a condition reports that the current test is a circle action; a location SHALL have a brazier that is lit or unlit, set by effects and read by conditions and by the act's objective.

#### Scenario: Summed test

- **GIVEN** an investigator with willpower 3 and intellect 4 at the Unvisited Isle of Pines ("circle: test [willpower]+[intellect] (10)")
- **WHEN** they take the circle action and commit a card with one intellect icon
- **THEN** the test's value is 8 against 10, and only the chaos token decides it

#### Scenario: Token knows a circle test

- **GIVEN** Union and Disillusion on Standard, skull "−2; if this is a circle test, reveal another token"
- **WHEN** the skull is revealed during a circle test
- **THEN** a second token is revealed and both modifiers apply

#### Scenario: Brazier lit

- **WHEN** the circle test on Unvisited Isle of Pines passes
- **THEN** its brazier is lit, and the act's "each brazier is lit" objective counts it

### Requirement: Bosses that cannot be defeated

An enemy's data SHALL be able to say that it cannot be defeated: when damage on it would reach its health, instead all its damage is healed, it disengages from every investigator, exhausts, and does not ready during the next upkeep. The enemy earns no victory and leaves play only by an effect that removes it.

#### Scenario: The Spectral Watcher survives

- **GIVEN** The Spectral Watcher with 1 health left, engaged with an investigator
- **WHEN** the investigator deals it 2 damage
- **THEN** it has 0 damage, is exhausted and disengaged, and stays exhausted through the next upkeep

### Requirement: Opening-hand plays

After every investigator's mulligan, the engine SHALL open a `gameBegins` window; a card in an opening hand with a `forced` or `reaction` ability on that trigger (the tarot cards: "if this is in your opening hand, put it into play") resolves it. The window asks nothing when no hand holds such a card.

#### Scenario: Tarot card in the opening hand

- **GIVEN** The Chariot · VII in Daisy's opening hand after the mulligan
- **WHEN** the game begins
- **THEN** it is in play in her tarot slot, no card was paid for, and her hand is one card smaller

#### Scenario: Drawn later

- **WHEN** The Chariot · VII is drawn on round 2
- **THEN** it stays in hand and is played for its cost as usual

### Requirement: Fixed-setup investigators

An investigator entry SHALL be able to carry a fixed setup instead of a deck: cards in play, cards in hand, resources, and a start location by card code. A game started with such investigators has no deck validation, no draw at setup and no mulligan for them; a scenario can say that draws are ignored (an instruction to draw does nothing) and that a player card which would be discarded is removed from the game instead.

#### Scenario: Gavriella's start

- **WHEN** Disappearance at the Twilight Estate starts with Gavriella Mizrah (05046)
- **THEN** she is at the location her back names with her listed cards in play, her listed hand, her resources, and no deck or mulligan prompt

#### Scenario: Discard removes

- **GIVEN** the prologue's "a player card that would be discarded is removed from the game"
- **WHEN** a committed card leaves the test
- **THEN** it is in the removed pile, not a discard
