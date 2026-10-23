## MODIFIED Requirements

### Requirement: Data-driven card effects

Card behavior SHALL be declared in data using a fixed vocabulary of triggers (e.g. on play, on reveal, after successful investigate, forced at end of round), conditions and effects (e.g. deal damage, discover clue, gain resources, draw cards, modify skill, spawn enemy, place doom, add/remove token). Cards whose behavior cannot be expressed this way SHALL be able to reference a code script keyed by card code. Unknown effect names MUST fail validation.

An ability's cost SHALL be able to take damage from its controller, as it can take horror, and a heal SHALL be able to target an Ally asset as well as an investigator: one at the controller's location, or one the controller controls, as the card prints it. A heal from among several investigators ("heal 2 damage from among investigators at your location") SHALL let the player place each point.

These cards' abilities SHALL be declared, each spending its uses as printed and discarding the card when it has none left where the card says so: Flesh Ward (cancel 1 damage or horror just dealt by an enemy attack), Clarity of Mind (level 0 and 3), Smoking Pipe, Painkillers, Strange Solution, First Aid (level 3), Healing Words (level 0 and 3), Sinha's Medical Kit, Extra Rations and Canteen.

The vocabulary SHALL express the Guardian fight cards: a play ability carries an action designator and can be marked as provoking no attack of opportunity, or as playable during any player window; a fight can name its target (the triggering enemy), succeed automatically, and chain a second attack on success; an effect can pull a non-Elite enemy from within a range to your location, engage it and attack it; engage any number of enemies at your location with effects per enemy; ready a controlled asset by filter; grant an additional action restricted to one designator; search the deck and discard pile for a card and play it; move to the triggering location; discover clues at your location or a connecting one; target another investigator at your location, or an enemy engaged with you; add to damage being dealt to an enemy; take an amount from the tokens on the card itself; a cost paid from the card's uses or the pool; conditions on the first action of a turn, on the card dealing the damage, on a move from your location, and on the printed health of enemies you defeated this turn; and an enemy that takes at most 1 damage at a time.

Every card of the `nat` pack SHALL have its behaviour: Nathaniel Cho, Randall Cho, Tommy Malloy, Self-Destructive, Boxing Gloves (0, 3), Flesh Ward, Grete Wagner (0, 3), Relentless, Safeguard, Clean Them Out, Counterpunch (0, 2), "Get over here!" (0, 2), Glory, Monster Slayer, One-Two Punch (0, 5), Stand Together, Evidence! (1), Galvanize, Lesson Learned, Mano a Mano, Overpower (2), Dynamite Blast (3), Taunt (3) and Physical Training (4); Dynamite Blast (3) by the core Dynamite Blast's script, the rest in data.

#### Scenario: Declarative card

- **WHEN** Emergency Cache is played
- **THEN** its data-declared effect "gain 3 resources" resolves without any card-specific script

#### Scenario: Scripted card

- **WHEN** a card declares `script: true` and a script file for its code exists
- **THEN** the engine runs that script for the card's ability

#### Scenario: A cost that takes damage

- **GIVEN** Smoking Pipe in play with 3 supplies and its controller with 1 horror
- **WHEN** they use it
- **THEN** they take 1 damage as its cost, it exhausts, it has 2 supplies, and they heal 1 horror

#### Scenario: Healing an Ally

- **GIVEN** First Aid (level 3) in play and an Ally asset with 1 damage and 1 horror at its controller's location
- **WHEN** they use First Aid and choose the Ally
- **THEN** the Ally heals 1 damage and 1 horror, and First Aid has one supply fewer

#### Scenario: Out of uses

- **GIVEN** Extra Rations with 1 supply
- **WHEN** its controller spends the last supply
- **THEN** they heal 1 damage and Extra Rations is discarded

#### Scenario: Spread among investigators

- **GIVEN** Healing Words (level 3) and two investigators at the location with 1 damage each
- **WHEN** it is used
- **THEN** the player places the first point and then the second, and both heal 1 damage

#### Scenario: Clean Them Out

- **GIVEN** Nathaniel with 0 resources, engaged with a Ghoul Minion
- **WHEN** he plays Clean Them Out
- **THEN** he has 2 resources before the attack's skill test begins, and the test is a fight against the Ghoul Minion

#### Scenario: One-Two Punch

- **GIVEN** Nathaniel engaged with a Ghoul Priest
- **WHEN** he plays One-Two Punch (0) and the first attack (+1 combat) succeeds
- **THEN** he may attack the Ghoul Priest again at +2 combat for 2 damage, or stop

#### Scenario: "Get over here!"

- **GIVEN** a non-Elite enemy at a connecting location and Nathaniel unengaged
- **WHEN** he plays "Get over here!" (0) and chooses it
- **THEN** the enemy is at his location, engaged with him, and he attacks it; an Elite enemy is not offered

#### Scenario: Randall Cho's choice

- **GIVEN** Randall Cho entering play, Nathaniel with 3 damage and Boxing Gloves in his discard pile
- **WHEN** he chooses to search
- **THEN** he is offered the Weapon assets of his deck and discard pile, plays Boxing Gloves paying its cost, and his deck is shuffled; had he chosen to heal, he would have 0 damage

#### Scenario: Evidence! counts the turn's defeats

- **GIVEN** Nathaniel defeated a Ghoul Minion (health 2) earlier this turn
- **WHEN** he defeats an Acolyte (health 1) and plays Evidence! (1)
- **THEN** he discovers 1 clue; had the second enemy had 2 or more health, he would discover 2

#### Scenario: Safeguard follows

- **GIVEN** Nathaniel with Safeguard ready and Daisy at his location
- **WHEN** Daisy moves to a connecting location
- **THEN** Nathaniel may exhaust Safeguard to move there too; when Daisy moves from another location he is not offered it

#### Scenario: Stand Together

- **GIVEN** Nathaniel and Daisy at a location, Roland elsewhere
- **WHEN** Nathaniel plays Stand Together
- **THEN** he chooses Daisy (Roland and himself are not offered) and both gain 2 resources

#### Scenario: Nathaniel's elder sign

- **GIVEN** Nathaniel attacking with Clean Them Out in his discard pile
- **WHEN** he reveals the elder sign and succeeds
- **THEN** the token counts +1 and he returns Clean Them Out to his hand; on an investigation the token counts +1 and nothing returns

### Requirement: Every cycle's cards as data

The content SHALL hold every cycle of the card game that the local ArkhamDB snapshot (`inspired/arkhamdb-json-data`) describes, one pack folder per cycle under `content/packs/<cycle>/`, generated by the import command and never edited by hand (hand-written behaviour stays in each pack's `cards.json`). The game SHALL load the core pack and the packs the loaded scenarios need before the first screen, and the other packs on demand (deck editing, card lookup), so the first load does not grow with the number of packs. `check:content` SHALL validate every pack and report, per cycle, the card count and the Russian text coverage.

The `nat` pack SHALL be reported complete by the coverage, and Nathaniel Cho's investigator entry true.

#### Scenario: Dunwich cards exist

- **WHEN** the content is loaded
- **THEN** `db.cards["02001"]` (Zoey Samaras) exists with her stats and text, and no Dunwich scenario appears in the campaign list

#### Scenario: First load unchanged

- **WHEN** the title screen opens
- **THEN** only the core pack and the Night of the Zealot encounter sets have been loaded; the other packs load when a deck editor or a lookup asks for them

#### Scenario: Coverage report

- **WHEN** `check:content` runs
- **THEN** it prints, for each cycle, the number of cards and how many have Russian text, and fails on any schema or reference error in any pack

#### Scenario: The nat pack is complete

- **WHEN** `npm run coverage` runs
- **THEN** `content/coverage.json` reports pack `nat` with 28 of 28 player cards working and `investigators["60101"]` true, and `docs/campaign-program.md` ticks the `nat` row
