## ADDED Requirements

### Requirement: The Path to Carcosa's encounter cards work

Every encounter card of the `ptc`, `eotp`, `tuo`, `apot`, `tpm`, `bsr` and `dca` packs SHALL have its behaviour: in `content/packs/ptc/cards.json` where the vocabulary expresses it, else in `content/packs/ptc/scripts/<code>.ts`; the shared sets (Delusions, Hauntings, Cult of the Yellow Sign, Evil Portents, Hastur's Gift, Decay and Filth, The Stranger, Inhabitants of Carcosa, Byakhee) in the `ptc` pack's data or scripts, keyed by card code, so the Return-to box reuses them. The vocabulary SHALL express: token X sources (horror on you, shroud and base shroud of your location, highest doom on an enemy or agenda, doom on enemies or agendas, distance from the starting location) with a cap; token results (cancel committed skill cards, move each unengaged Byakhee toward the nearest investigator, lose resources by the amount failed, a ready enemy of given traits attacks you, doom on each agenda, automatic failure instead, a clue on your location from the bank, lose an action); parley costs and the `parleyed` trigger; clues on enemies and assets with take-control; a cost modifier while at a location; a flat clue cost to enter; "cannot be damaged except by"; spawn from the victory display; remembered flags and their count; and a `horrorOnYou` condition and amount. The coverage SHALL report the seven packs' encounter sides complete.

#### Scenario: Descent into Madness in data

- **GIVEN** an investigator with 3 horror
- **WHEN** they draw Descent into Madness
- **THEN** it surges and they lose 1 action; with 2 horror only the surge happens

#### Scenario: Roach Swarm

- **GIVEN** a Roach Swarm at a location with shroud 3
- **WHEN** an investigator fights it
- **THEN** its fight value counts X = 3

#### Scenario: Coverage

- **WHEN** `pnpm coverage` runs
- **THEN** `content/coverage.json` reports `ptc`, `eotp`, `tuo`, `apot`, `tpm`, `bsr` and `dca` with every encounter card working and each of the eight scenarios complete

### Requirement: A flow condition compares two log counts

The campaign flow SHALL offer a `logCompare` condition over two count sections of the log (`{ a, b, op }` with `op` one of `gt`, `gte`, `lt`, `lte`, `eq`), a `removeAllChaosTokens` effect, and an `xp` effect that splits an amount as evenly as possible among the investigators.

#### Scenario: Doubt against Conviction

- **GIVEN** a log with 2 Conviction and 2 Doubt
- **WHEN** a step's condition is `logCompare { a: conviction, b: doubt, op: gte }`
- **THEN** the step is taken; with 1 Conviction it is not
