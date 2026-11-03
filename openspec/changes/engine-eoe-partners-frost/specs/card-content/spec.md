## ADDED Requirements

### Requirement: Frost, partner, side-deck and shelter vocabulary

The card vocabulary SHALL include: the chaos token `frost` wherever a token is named; ops `addChaosToken` and `removeChaosToken` with a token and an amount; `shuffleFromSideDeck { deck, amount, into, else }`, `drawFromSideDeck { deck }`, `returnToSideDeck { deck, bottom }`, `searchForSideDeckCards { deck, from: deck | topN }`; token-reveal conditions `frostRevealedThisTest { min }` and a `tokenRevealed` filter by token; the constant modifier `firstFrostModifier`; a token effect `cancelAndRevealAnother`; the trait-free `Partner` keyword; the X sources `frostRevealedThisTest`, `shelterOfYourLocation` and `halfShelterOfYourLocation`; `CardDef.shelter`. A location whose printed text has a "Shelter N" line is accounted for when `shelter` is set; a card whose keyword line holds `Partner` is accounted for by the keyword. Setup steps `choosePartner`, `startAtCamp`, `startingResources` and `buildSideDeck` SHALL validate.

#### Scenario: Unknown token rejected

- **WHEN** a card op names the token `blood`
- **THEN** `check:content` fails

#### Scenario: Shelter line accounted for

- **GIVEN** Crash Site (08502) with `shelter: 3` in `content/packs/eoe/cards.json`
- **WHEN** coverage runs
- **THEN** its "Shelter 3" line is accounted for

### Requirement: Frost known to the campaign import

`tokenName` in `scripts/campaignGuide.ts` SHALL map the guide's `frost` to the engine's `frost`, so campaign bags, difficulty choices and flow effects keep it; the import's dropped-token list no longer names it.

#### Scenario: Bags with frost

- **WHEN** the import runs
- **THEN** `edge-of-the-earth/campaign.json` holds `frost` once on Standard, twice on Hard and three times on Expert
