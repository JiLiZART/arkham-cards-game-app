## ADDED Requirements

### Requirement: Catalog of cards and investigators
The title menu SHALL offer a Cards item that opens a catalog of every card in the content, in three tabs: Investigators, Player cards and Encounter cards. Each entry SHALL show the card's image, name in the game's language, class, type and pack. Opening the catalog SHALL load every card pack; the rest of the game SHALL not wait for them. The catalog SHALL fill the window: its title, tabs and Back stay on screen while only the list (or the card page) scrolls, so Back is always reachable, also when the catalog was opened from the menu during a game. The class, skill-icon and slot filters SHALL show their icons. Headings on the menus' parchment SHALL be set in the game's display face in dark ink.

#### Scenario: Browse player cards
- **WHEN** the player opens Cards and the Player cards tab
- **THEN** the cards of every cycle are listed with their images and names, starting with the core set

#### Scenario: Back from far down the list
- **WHEN** the player opened Cards from the menu during a game and scrolled far down the Player cards
- **THEN** Back is on screen, and pressing it returns to the menu, where Continue resumes the game

### Requirement: Filters
The catalog SHALL filter by class, type, cycle and pack, level, cost, traits, skill icons, slot, encounter set (Encounter cards tab), whether the card works in the game, and a text search over name, traits and text in the game's language. Filters SHALL combine, show how many cards match, and be kept while the app is open.

#### Scenario: Level 0 Seeker allies
- **WHEN** the player picks Seeker, Asset, level 0 and the trait Ally
- **THEN** only level 0 Seeker allies are listed, with their count

#### Scenario: Search in Russian
- **WHEN** the locale is Russian and the player searches "фонарь"
- **THEN** Flashlight is listed

### Requirement: Card page
Selecting a card SHALL open its page: the image of each side, the full text in the game's language with the keyword glossary, its stats (cost, level, skill icons, health, sanity, fight, evade, shroud, clues, victory), its pack and encounter set, and a badge saying whether it works in the game or is text only. A card works in the game when its behaviour is written in the content or it has no rules text to run. An investigator's page SHALL also show the back with the deckbuilding rules, the signature cards and weaknesses (each opening its own page), and the starter deck when there is one.

#### Scenario: Machete
- **WHEN** the player opens Machete
- **THEN** its page shows the image, its text, cost 3, level 0, the combat icon, the core set, and "works in the game"

#### Scenario: A Dunwich card
- **WHEN** the player opens Zoey's Cross
- **THEN** its image comes from arkham.build's CDN and the badge says "text only"

#### Scenario: Investigator page
- **WHEN** the player opens Zoey Samaras
- **THEN** both sides are shown, her deckbuilding rules, Zoey's Cross and Smite the Wicked as links, and her starter deck
