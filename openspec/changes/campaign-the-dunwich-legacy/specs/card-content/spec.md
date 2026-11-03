## ADDED Requirements

### Requirement: The Dunwich Legacy encounter vocabulary

The card vocabulary SHALL express what the Dunwich Legacy's encounter cards print, each addition needed by two or more cards or by a card no script should carry: discard the top cards of an investigator's deck, a fixed count or one per point failed; lose remaining actions and end the turn; an enemy attack as an effect (the enemy of the window, a named enemy, or each investigator at a location); reveal a chaos token and branch on it; a cost or a prohibition on moving into or out of a location; a skill test difficulty from an amount (damage on the investigator, clues they hold); a fight modifier conditioned on the attacking asset's traits; a forced trigger when a card of a trait is drawn by the engaged investigator, and when an enemy is attacked with a Melee card; the targets "each investigator at the attached location" and "each investigator at a location with a trait"; an amount of clues on an enemy; a spawn at the location with the most clues, the farthest location, the location to your right, the nearest Altered location or any Extradimensional location; constant flags for no resource gain while engaged, no movement while engaged, no resources or no events or no skill-card commits at a location, and an enemy that cannot be damaged or attacked except by one named card; clues placed on a location or an enemy from the token bank; and a campaign log read in a card's amount (clues from the Powder of Ibn-Ghazi).

#### Scenario: Visions of Futures Past

- **GIVEN** an investigator who fails Visions of Futures Past by 2
- **WHEN** the treachery resolves
- **THEN** the top 2 cards of their deck are discarded, and it was declared in `cards.json` with no script

#### Scenario: Wizard of Yog-Sothoth

- **GIVEN** a Wizard of Yog-Sothoth engaged with Rex
- **WHEN** Rex draws a Hex treachery
- **THEN** the Wizard attacks him before the treachery resolves

#### Scenario: Esoteric Formula against the Brood

- **GIVEN** a Brood of Yog-Sothoth with 2 clues on it and an investigator with Esoteric Formula
- **WHEN** they fight it with the Formula
- **THEN** the test uses willpower plus 4, and a Machete attack against the Brood is not offered

### Requirement: Every Dunwich Legacy encounter card works

Every card the 8 scenarios of The Dunwich Legacy use SHALL have its behaviour: the 293 non-core cards of the dwl, tmm, tece, bota, uau, wda and litas packs' encounter sets, in data in `content/packs/dwl/cards.json` or in `content/packs/dwl/scripts/<code>.ts`, including the neutral story assets (Dr. Henry Armitage, Alchemical Concoction, Jazz Mulligan, Professor Warren Rice, Peter Clover, Dr. Francis Morgan, Adam Lynch, Harold Walsted, The Necronomicon, Helpless Passenger, Key to the Chamber, Zebulon Whateley, Earl Sawyer, Powder of Ibn-Ghazi, Esoteric Formula). A card that two scenarios share SHALL have one declaration.

#### Scenario: A shared set card

- **WHEN** Beyond the Veil is drawn in The Miskatonic Museum and in Lost in Time and Space
- **THEN** both scenarios attach it to the threat area, it refuses a second copy, and its deck-empty effect defeats the investigator, from one declaration

#### Scenario: A scripted act

- **WHEN** Act 1 of Blood on the Altar is in play and an investigator enters the Hidden Chamber
- **THEN** every location is revealed, every clue moves to the Chamber and Silas Bishop spawns there, from `content/packs/dwl/scripts/02199.ts`
