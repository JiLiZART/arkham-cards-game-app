## ADDED Requirements

### Requirement: Circle Undone vocabulary

The card vocabulary SHALL express, in `cards.json` and scenario files, what the cycle's cards print: the `haunted` ability kind (effects only, no cost); the `circle` designator; a skill test over summed skills (`skills: [..], sum: true`); the ops `resolveHaunted`, `flipLocation` (with a side), `swapLocation`, `placeBreaches`, `removeBreaches`, `placeKey`, `takeKey`, `lightBrazier`, `placeInFront`, `placeCosmos`, `shuffleIntoCosmos`, `flipToStory`, `flipToEnemy`, `banish`; the conditions `locationHaunted`, `controlsKey`, `keyOn`, `brazierLit`, `circleTest`, `deckRunOut`; the amounts `breachesOn`, `keysControlled`, `unfinishedBusinessInVictory`, `spectralLocationsInPlay`; the spawn values "any [[Trait]] location", "any location connected to yours", "farthest empty space", "fewest breaches", "most breaches" and "A or B" by two location names; the prey values "most keys" and "location with the most clues"; `ModStat` `tarotSlots`; the trigger `gameBegins`; `CardDef.cannotBeDefeated`; the setup ops `splitEncounterDeck`, `putInFrontOfEach`, `setAsideKeys`, `buildCosmos`. `check:content` SHALL reject an unknown value, and the coverage line rules SHALL count a `Haunted –` line as accounted for by a `haunted` ability and a `Spawn –` line by a spawn value the engine resolves.

#### Scenario: Haunted line in data

- **GIVEN** Trophy Room (Spectral) 05079 declared with a `haunted` ability `loseResources 2`
- **WHEN** coverage runs
- **THEN** the card counts as working, its "Haunted –" line accounted for

#### Scenario: Unknown spawn value rejected

- **WHEN** a card declares `spawn: "nearest breach"`
- **THEN** `check:content` fails naming the card and the value

### Requirement: The tarot deck as content

`content/tarot.json` SHALL hold the 22 Major Arcana (id `tarot:0` … `tarot:21`, name, upright and reversed effects in the effect vocabulary or as a named rule), and `content/i18n/<locale>/tarot.json` the name and both texts per locale (English from ArkhamCards' `getTarotCards()`, Russian hand-written); a locale without the file falls back to English. The catalog SHALL show the deck under its own heading, both texts on one face.

#### Scenario: Deck loaded and validated

- **WHEN** `check:content` runs
- **THEN** it validates 22 tarot cards, each with an English name, upright text and reversed text, and reports the locales that have translations

#### Scenario: Catalog shows a tarot card

- **WHEN** the catalog is opened on The Tower · XVI
- **THEN** its upright and reversed texts are shown in the game's locale
