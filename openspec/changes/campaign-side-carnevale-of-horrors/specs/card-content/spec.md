## ADDED Requirements

### Requirement: The coh pack's cards work

Every card of pack `coh` SHALL have behaviour in `content/packs/side/cards.json` or a script in `content/packs/side/scripts/<code>.ts`, and `content/coverage.json` SHALL report the pack 40 of 40 and `side-carnevale-of-horrors` complete. The vocabulary SHALL gain: token `x` sources `revelersBeneathAgenda` and `revelersBeneathActOrAgenda`; a reaction `substituteSkill` that, when its bearer begins a skill test, offers to test with the mask's skill instead; a play limit of one Mask asset per investigator; a line rule marking "connected to the location in the clockwise direction" as carried by the scenario's `oneWay` connections. The campaign flow step `investigatorChoice` SHALL accept `codes`: each investigator in player order picks one of the codes not yet taken, or passes, and the effects bind to the picker.

#### Scenario: A mask substitutes a skill

- **GIVEN** an investigator with Pantalone (82023) in play
- **WHEN** they begin an intellect test
- **THEN** they are offered to test willpower instead, once per round

#### Scenario: A reveler flips

- **GIVEN** a Masked Carnevale-Goer face down at Streets of Venice
- **WHEN** an investigator at that location uses act 1's peek
- **THEN** the card flips to its Innocent Reveler or Carnevale cultist face in place, with its tokens kept

#### Scenario: Coverage

- **WHEN** `pnpm coverage` runs
- **THEN** `content/coverage.json` reports `coh` 40 of 40, `tokens: true` for `carnevale-of-horrors`, and `docs/campaign-program.md` ticks the `coh` row
