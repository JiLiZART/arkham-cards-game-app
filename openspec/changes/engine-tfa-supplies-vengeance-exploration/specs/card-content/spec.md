## ADDED Requirements

### Requirement: Connection symbols, vengeance, supplies and poison in card data

A location's record SHALL be able to carry its printed connection symbol and the symbols it connects to, and any card a vengeance value. The vocabulary SHALL express an Explore ability (an action designator with a match rule: connecting, by trait, or any), the conditions "you have a supply", "an investigator at your location has a supply", "any investigator has a supply", "you are poisoned" and "after you explore (successfully or not)", the effects cross off a supply, poison, flip a clue to its doom side, look at, shuffle into, reveal from and rebuild the exploration deck, set or add to a named counter, and return a vengeance card from the victory display; a constant modifier making a card count as in the victory display while a condition holds; and token X from the vengeance in the victory display, the locations in play, the exploration deck's size, the locations with doom, the doom on locations or a named counter, with a minimum and maximum, and an auto-fail under a condition. Coverage SHALL account for "Check your supplies", "Vengeance X" and Explore lines by these fields.

#### Scenario: Expedition Camp in data

- **GIVEN** Expedition Camp (04050) declared with a resign action and a map check that looks at the top 3 cards of the exploration deck
- **WHEN** an investigator with a map uses it
- **THEN** they see the top 3 and reorder them; an investigator without a map is not offered it, and the card counts as working

#### Scenario: Content validation of symbols

- **WHEN** a scenario's exploration deck holds a location whose symbols reach no start location
- **THEN** `check:content` fails naming the scenario and the location
