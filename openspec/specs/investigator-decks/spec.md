# investigator-decks Specification

## Purpose
Defines playable investigators and their decks: stats, abilities, signature cards and weaknesses, deck validation, and the five core-set starter decks.

## Requirements

### Requirement: Investigator definition
Each investigator SHALL be defined in data with willpower, intellect, combat, agility, health, sanity, traits, a reaction/free ability, an Elder Sign effect, deckbuilding rules, signature card(s) and signature weakness.

#### Scenario: Roland stats
- **WHEN** Roland Banks is loaded
- **THEN** he has willpower 3, intellect 3, combat 4, agility 2, health 9, sanity 5

### Requirement: Deck lists as files
Decks SHALL be stored as files listing investigator code and card codes with quantities. A deck MUST also be importable from an ArkhamDB deck JSON export.

#### Scenario: Import ArkhamDB deck
- **WHEN** a user provides an ArkhamDB deck export JSON
- **THEN** it is converted to the deck format and validated

### Requirement: Deck validation
The system SHALL validate a deck against the investigator's deckbuilding rules: deck size, faction/level access, copies limit, required signature cards and weaknesses. Invalid decks MUST be rejected with the reasons listed.

#### Scenario: Too many copies
- **WHEN** a deck contains three copies of a card with deck limit 2
- **THEN** validation fails naming that card

### Requirement: Starting a scenario with a deck
At scenario start each investigator SHALL shuffle their deck with signature cards and one random basic weakness (selected at campaign start), draw 5 cards, set aside drawn weaknesses and redraw them, gain 5 resources, and may take one mulligan.

During the mulligan the investigator picks cards to redraw one at a time. Until they confirm the redraw, each picked card SHALL be offered to be taken back, which un-picks it; it is then offered for picking again. Only confirming redraws the picked cards. Picking and taking back are ordinary recorded choices, so saved games and action-log replays stay exact. The bot MUST NOT take back a pick.

#### Scenario: Weakness in opening hand
- **WHEN** an investigator draws a weakness in the opening hand
- **THEN** it is set aside, replaced with a new card, and shuffled back after the mulligan

#### Scenario: Take back a pick
- **WHEN** Roland picks Machete and Flashlight for redraw, then takes Machete back, then confirms
- **THEN** only Flashlight is redrawn and Machete stays in his hand

#### Scenario: Picked card offered again
- **WHEN** Roland takes back a picked card
- **THEN** the mulligan choice is asked again, with that card among the cards he can pick and the confirm option counting one fewer card

### Requirement: Core starter decks
The system SHALL ship ready-to-play decks for Roland Banks, Daisy Walker, "Skids" O'Toole, Agnes Baker and Wendy Adams using the core-set starter deck lists, all passing validation.

#### Scenario: Pick a starter
- **WHEN** a player selects Wendy Adams
- **THEN** her starter deck including Wendy's Amulet and Abandoned and Alone is loaded

### Requirement: Deck configuration
The new-game deck step SHALL show, in three rows: the picked investigators as avatars with their class and whether their deck is ready (a click switches to that investigator); that investigator's decks as tabs like a browser's (their starter decks, then their saved decks, then a "+" tab that starts a new deck holding only the signature cards and the weakness slot); and the deck of the tab on show, which is the deck that investigator brings. The deck area SHALL show on the left the deck as a grid of card images grouped by type with the copies of each, the signature cards and weaknesses apart, and on the right the cards the investigator may take, with a search and filters by class (icons), type and level. Hovering a card on the right offers Add, disabled with the reason when it can't go in, and Replace; Replace lights the deck's cards it may stand in for, and a click on one swaps them (Escape cancels). Hovering a card of the deck offers Remove. The basic weakness is chosen there or left random. The deck's problems SHALL be shown in plain words as it changes, and Continue SHALL wait while a picked investigator's deck has any. A starter deck is never modified: the first change to it makes a new saved deck, named "<investigator> · <date>" (numbered when the name is taken), whose tab opens; a saved deck is kept as it is edited.

#### Scenario: Build Zoey from empty
- **WHEN** the player opens a "+" tab for Zoey Samaras and adds 30 Guardian and neutral cards of level 0 with at most two copies each
- **THEN** the deck is valid with her signatures and a basic weakness, it is saved as a deck of hers, and Continue is enabled

#### Scenario: A card she can't take
- **WHEN** the player looks at a level 0 Mystic card in Zoey's deck area after adding five off-class cards
- **THEN** its Add is disabled with "up to 5 other level 0 cards"

#### Scenario: Replace a card
- **WHEN** the player hovers Extra Ammunition on the right of Roland's starter deck, chooses Replace and clicks a Flashlight in the deck
- **THEN** a new tab "Roland · <date>" opens with Extra Ammunition in place of one Flashlight, still 30 cards and valid, and the starter deck tab is unchanged

#### Scenario: Swap two cards
- **WHEN** Roland's starter deck has Flashlight ×2 removed and Physical Training ×2 added
- **THEN** the deck stays at 30 cards and valid, in a new saved deck's tab, and the starter deck is unchanged

#### Scenario: Too many swaps
- **WHEN** the player has removed 5 cards from a starter deck and removes a sixth
- **THEN** the deck step allows it: there is no swap limit, only the deckbuilding rules

#### Scenario: Invalid deck
- **WHEN** the player adds a third copy of a card
- **THEN** Add is disabled with "three copies of Machete; the limit is two"

### Requirement: Choosing the basic weakness
The editor SHALL let the player choose the deck's basic weakness from the loaded basic weaknesses, or leave it random. A chosen weakness is used at campaign start instead of the random one.

#### Scenario: Chosen weakness
- **WHEN** a custom deck names Paranoia as its weakness and a campaign starts with it
- **THEN** Paranoia is the deck's basic weakness, and no random one is added

### Requirement: Custom decks saved
Custom decks SHALL be saved on the device as they are edited, finished or not, under a name (default "<investigator> · <date>") and offered as tabs beside the starter decks in later new games; a double-click on a tab renames it and its × deletes it after a second click. A saved deck SHALL be validated again whenever it is shown; one that doesn't validate (unfinished, or a pack removed) is shown with its problems and can't be brought into a game until it is fixed.

#### Scenario: Reuse a custom deck
- **WHEN** the player saved "Roland · 17 Oct" and starts another campaign
- **THEN** the deck step offers "Roland · 17 Oct" as a tab next to Roland's starter deck

#### Scenario: An unfinished deck
- **WHEN** the player leaves a new deck at 12 cards and comes back to the deck step later
- **THEN** its tab is there, marked as needing fixes, with its problems shown when opened

### Requirement: Every investigator
The content SHALL define every regular investigator of the snapshot (not the parallel fronts), generated by an import command from the investigator card: stats, health, sanity, traits and text from the card; signature cards and weaknesses, deck size and deckbuilding options from the card's requirements and options; name, class and pack for the picker. A hand-written definition with the same code SHALL replace the generated one. The official starter decks SHALL be generated from ArkhamCards' starter decklists for the investigators that have one.

#### Scenario: Zoey Samaras
- **WHEN** the content is loaded
- **THEN** Zoey Samaras (02001) has deck size 30, her signatures Zoey's Cross and Smite the Wicked, a basic weakness, and options "Guardian and neutral level 0-5, up to 5 other level 0 cards"; her starter deck exists

#### Scenario: Core investigators unchanged
- **WHEN** the import runs
- **THEN** the five hand-written core investigators are not overwritten

### Requirement: Choosing among all investigators
The investigator step SHALL list every defined investigator as an avatar, with filters by class (the class icons) and by cycle, a search by name in the game's language (English names also match), and a sort: by release (the default), name, class, or a starting stat (health, sanity, willpower, intellect, combat, agility) highest first. Beside the list a sidebar SHALL show the investigator hovered, else the one last tapped: the full investigator card, the starting health, sanity and skills, the traits, the ability text and the deckbuilding rules, in the game's language. The step SHALL load every card pack when it opens, so the sidebar and the sort have every investigator's card. An investigator whose ability has no written behaviour SHALL carry the partly-implemented note; one with no deck available SHALL be shown as needing a deck and not be pickable. A picked investigator's turn-order badge (P1 to P4) SHALL be readable on the tile. The packs of the picked investigators and of every card in their decks SHALL be loaded as soon as they are picked, and the deck step SHALL check their decks only once those cards are in: until then it says it is loading and Continue waits, and a deck of a later cycle is never refused as unknown cards. Starting a campaign SHALL load those packs before it begins.

#### Scenario: Filter Seekers of Dunwich
- **WHEN** the player filters by Seeker and The Dunwich Legacy
- **THEN** Rex Murphy is listed and Roland Banks is not

#### Scenario: Read an investigator
- **WHEN** the player rests the mouse on Zoey Samaras
- **THEN** the sidebar shows her card, health 9, sanity 6, willpower 4, intellect 2, combat 4, agility 2, her ability and her deckbuilding rules

#### Scenario: Sort by combat
- **WHEN** the player sorts by combat
- **THEN** the investigators with the highest combat come first

#### Scenario: A deck of a later cycle
- **WHEN** the player picks Zoey Samaras and goes on to the deck step
- **THEN** her starter deck is valid once her pack is loaded, and Continue is enabled

#### Scenario: Start with Zoey
- **WHEN** a campaign starts with Zoey Samaras and her starter deck
- **THEN** the Dunwich pack is loaded first and Zoey is on the table with her deck

### Requirement: Generic deckbuilding rules
Deck validation SHALL apply an investigator's deckbuilding options from the snapshot: class and level ranges, traits, tags, card types, card names, text patterns, uses, per-option limits, "at least" counts and exclusions, together with the deck size, copy limits by title, signatures and weaknesses. An investigator whose options need a choice the builder doesn't offer (a class, an option or a deck size chosen at deck creation, or a rule about specific cards) SHALL be refused by the builder with that reason in plain words.

#### Scenario: Carolyn Fern
- **WHEN** a Carolyn Fern deck holds a level 3 card that heals horror from another class
- **THEN** it is valid, because her options allow cards that heal horror at level 0-5

#### Scenario: Lola Hayes
- **WHEN** the player opens the builder for Lola Hayes
- **THEN** it says her deck needs a role choice the builder doesn't offer yet
