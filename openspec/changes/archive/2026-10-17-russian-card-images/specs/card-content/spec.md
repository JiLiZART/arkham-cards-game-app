## MODIFIED Requirements

### Requirement: Card images
Each card SHALL resolve to a front (and back, if double-sided) image URL derived from its code and the current locale. When an image fails to load, the UI MUST render a text-based card face from the card data instead.

With the Russian locale, a card SHALL use its Russian image when one was imported, on each side separately. Otherwise it uses the English scan. Other locales use the English scans. Switching the language SHALL switch the card images on screen, hand, map and panels included, without reloading the game.

#### Scenario: Image offline
- **WHEN** the image CDN is unreachable
- **THEN** cards are still rendered with name, cost, stats, icons and text

#### Scenario: Russian image
- **WHEN** the locale is Russian and Roland's Machete is in his hand
- **THEN** the hand shows the Russian Machete card image ("Мачете")

#### Scenario: No Russian image
- **WHEN** the locale is Russian and a card has no imported Russian image
- **THEN** its English scan is shown

#### Scenario: Switch language
- **WHEN** the player switches from Russian to English during a game
- **THEN** the hand, the strip, the map and the act/agenda panel show the English scans

### Requirement: Localization
User-visible card text, names and UI strings SHALL resolve through locale files with English as the default and fallback. Adding a locale MUST only require adding translation files.

Russian card text SHALL be layered field by field: imported translations, then the print-matched texts (taken from the Russian card images), then hand-written fixes. For every card with a Russian image, the name, subtitle, traits and rules text SHALL match what is printed on that image, with the game's icon and emphasis markup. The feed, details columns, prompts and modals therefore use the same words as the card shown.

#### Scenario: Missing translation falls back
- **WHEN** the locale is `ru` and a card has no Russian name
- **THEN** the English name is shown

#### Scenario: Names match the shown card
- **WHEN** the locale is Russian and Roland plays the card whose Russian image reads "Кольт 45-го калибра"
- **THEN** the feed entry and the details column name it "Кольт 45-го калибра", not the imported "Пистолет 45-го калибра"

#### Scenario: Icons kept in rules text
- **WHEN** the details column shows the Russian Machete
- **THEN** its text reads as printed, with the fight action shown as the action icon and the combat bonus as the combat icon

## ADDED Requirements

### Requirement: Russian card import
A local import tool SHALL build the Russian images and print texts from `inspired/CARDS_ru` (preferred) and the card images embedded in `inspired/PDF_ru` (fallback). It SHALL:
- identify each image's card code by OCR of its name and text, checked against the card's type and printed stats;
- write a manifest that maps each code and side to its source file, with the match confidence;
- accept review overrides that pin or reject a match, so a rerun keeps the decisions;
- list unmatched and low-confidence images, with a contact sheet that shows each Russian image beside the card's English scan for review;
- output 50%-size WebP images for the cards in the current content.

The import is reproducible: rerunning it on the same inputs and overrides produces the same manifest and images. Its outputs are committed; the game and the deploy never read `inspired/`.

#### Scenario: Two sides of a location
- **WHEN** the import meets "Кабинет.jpg" and "Кабинет 2.jpg"
- **THEN** it maps the first to the Study's unrevealed side and the second to its revealed side

#### Scenario: Same name, different level
- **WHEN** the import meets "Физическая тренировка.jpg" and "Физическая тренировка 2.JPG"
- **THEN** each is matched to the card whose level and text it shows, not by its file name

#### Scenario: Card missing from the community set
- **WHEN** an act has no image in `CARDS_ru`
- **THEN** its image comes from the PDF scans, and the manifest records the PDF as its source

#### Scenario: Low confidence
- **WHEN** an image's OCR doesn't clearly match one card
- **THEN** it is not used until a review override pins it, and it appears on the review contact sheet
