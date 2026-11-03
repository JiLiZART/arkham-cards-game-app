## ADDED Requirements

### Requirement: The Return to the Night of the Zealot player cards

Every player card of the rtnotz pack SHALL have its behaviour, in `content/packs/return/cards.json` where the vocabulary fits and in `content/packs/return/scripts/<code>.ts` otherwise: Physical Training (2), Hyperawareness (2), Hard Knocks (2), Arcane Studies (2), Dig Deep (2) and Hot Streak (2) as their core versions; Dynamite Blast (2) as the core Dynamite Blast without provoking attacks of opportunity; Mind Wipe (3) as the core Mind Wipe with the enemy's damage and horror reduced by 1 for the phase; Barricade (3) as the core Barricade, with non-Elite enemies that would spawn at the attached location spawning at a connecting location of the player's choice instead, if able; Rabbit's Foot (3) searching the top X cards of the deck after a failed test, X the amount failed by, drawing one and shuffling. The vocabulary SHALL express a location at which non-Elite enemies cannot spawn, redirected to a connecting location, and a deck search whose depth is an amount. `content/coverage.json` SHALL report rtnotz with 10 of 10 player cards working and `docs/campaign-program.md` its player column at 0 left.

#### Scenario: Dynamite Blast (2) provokes nothing

- **GIVEN** an investigator engaged with a ready Ghoul Minion and a Swarm of Rats at a connecting location
- **WHEN** they play Dynamite Blast (2) and choose the connecting location
- **THEN** the Ghoul Minion makes no attack of opportunity, and the Swarm of Rats takes 3 damage

#### Scenario: Mind Wipe (3) dulls an enemy

- **GIVEN** a Ghoul Priest (2 damage, 2 horror, Retaliate) at an investigator's location at the start of the enemy phase
- **WHEN** they play Mind Wipe (3) on it and it attacks
- **THEN** it deals 1 damage and 1 horror, and its Retaliate is ignored until the phase ends

#### Scenario: Barricade (3) redirects a spawn

- **GIVEN** Barricade (3) attached to the Hallway, which connects to the Attic and the Cellar
- **WHEN** a non-Elite enemy would spawn at the Hallway
- **THEN** the player chooses the Attic or the Cellar and it spawns there; an Elite enemy spawns at the Hallway

#### Scenario: Rabbit's Foot (3) searches by the margin

- **GIVEN** Rabbit's Foot (3) ready and a deck whose fourth card is Emergency Cache
- **WHEN** its controller fails a test by 4 and uses it
- **THEN** they are offered the top 4 cards, draw Emergency Cache, the deck is shuffled and Rabbit's Foot is exhausted; after a test failed by 2 only the top 2 are offered

#### Scenario: The level-2 trainers

- **WHEN** Physical Training (2) is in play during its controller's willpower test and they spend 1 resource on it
- **THEN** they get +1 willpower for the test, with Physical Training (2) costing 0 to play

#### Scenario: Coverage

- **WHEN** `pnpm coverage` runs
- **THEN** pack rtnotz reports 10 of 10 player cards working and `docs/campaign-program.md` shows the rtnotz player column at 0 left
