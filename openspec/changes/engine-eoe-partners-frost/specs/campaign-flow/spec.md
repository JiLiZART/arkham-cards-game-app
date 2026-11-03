## ADDED Requirements

### Requirement: Partner section of the campaign log

A campaign log section MAY be of kind `partner`: each entry is a story asset code with a status (alive, crossed off, MIA, safe or resolute) and its recorded damage and horror. The log screen SHALL show each partner with its name, status and tokens, a crossed-off name struck through, a resolute one with a checkmark. A save whose log has an `expedition_team` entries section SHALL migrate to the partner section with every partner alive.

#### Scenario: After The Disappearance

- **GIVEN** Ice and Death I ended with a camp of shelter 4 and nine partners alive
- **WHEN** the checkpoint marks four safe and the rest MIA
- **THEN** the log screen shows four partners "safe" and five "MIA"

#### Scenario: Crossed off

- **WHEN** a partner is recorded defeated
- **THEN** its name is struck through on the log screen and `partnerStatus` with `crossedOff` holds for it

### Requirement: Partner conditions, effects and inputs

The flow SHALL evaluate `partnerStatus { partner, is }` and `partnerCount { is, min?, max? }` (`max` MAY name a log count), and `atLeast { n, conditions }` for guide `multi` conditions with a count. It SHALL apply `partnerStatus { partner | input, set }` and `recordPartnerTrauma`, which writes the damage and horror the scenario reported on each partner in play and crosses off the defeated ones. It SHALL offer `partnerChoice { count, set, rest }`, which marks `count` random alive partners `set` and the others `rest`, and `investigatorChoicePartner`, which lets each investigator name a partner. An XP effect's bonus MAY be a log count with a minimum.

#### Scenario: Fatal Mirage offered

- **GIVEN** three partners crossed off after Ice and Death III
- **WHEN** Restful Night is read
- **THEN** the flow offers Fatal Mirage before To the Forbidden Peaks

#### Scenario: Shelter experience

- **GIVEN** a camp with shelter 2 and 1 victory point
- **WHEN** Ice and Death I's resolution grants experience
- **THEN** each investigator gains 4 XP (minimum bonus 3 plus victory)

#### Scenario: Random safe partners

- **GIVEN** nine alive partners and a camp of shelter 3
- **WHEN** The Disappearance asks which partners made it back
- **THEN** three are marked safe at random from the campaign seed and six MIA

### Requirement: Victory display read by the flow

The flow SHALL evaluate `victoryHas { card | set }` against the cards the scenario left in its victory display, so a guide checklist the engine can answer is answered without asking.

#### Scenario: Rescued partner

- **GIVEN** Ice and Death II ends with the Possessed Danforth (08536) in the victory display
- **WHEN** the resolution records the rescued partners
- **THEN** Danforth is recorded alive without a checklist prompt

### Requirement: Partner and frost steps compile

The campaign compiler SHALL compile the guide's `partner_status` conditions and effects, `partner_trauma`, `partner_choice`, `investigator_choice` of a partner, `multi` with a count, `add_chaos_token`/`remove_chaos_token` with frost and `earn_xp` with a log-count bonus into the flow vocabulary, and `expedition_team` into a `partner` log section. The summary for `edge-of-the-earth` SHALL list no unsupported step.

#### Scenario: Edge of the Earth compiles clean

- **WHEN** `pnpm import:campaigns` runs
- **THEN** `edge-of-the-earth/flow.json` has no step or condition of kind `unsupported`, 29 `addChaosToken frost` and 12 `removeChaosToken frost` effects, and its campaign has a `partner` section with nine entries
