## MODIFIED Requirements

### Requirement: The next scenario comes from the flow

The scenario played next SHALL be the one the flow reaches: the guide's order by default, interludes and epilogues in their places, a `next_scenario` effect redirecting it, a skipped scenario left out, a replayed scenario set up again, and a side scenario offered where the guide allows one, with its experience cost paid by each investigator on acceptance. The campaign's result (won, lost, survived) SHALL be the one the flow sets, with the engine's own ending (every investigator killed or insane) still applying. Before a scenario's own setup steps run, the flow SHALL stop at a "continue" whenever anything was shown since the last answer (a story, a recorded log entry), so what the previous scenario's resolution or an interlude showed is read before the next scenario begins.

#### Scenario: Carcosa's branching ending

- **GIVEN** Dim Carcosa ended with Resolution 3
- **WHEN** the flow runs the resolution
- **THEN** the campaign ends with the result the guide names for it, and the campaign screen shows the guide's epilogue text

#### Scenario: A side scenario for experience

- **GIVEN** The Forgotten Age between The Untamed Wilds and The Doom of Eztli, every investigator with 5 experience
- **WHEN** the players accept Carnevale of Horrors from the side scenarios offered
- **THEN** each investigator pays its cost, Carnevale of Horrors is set up next, and The Doom of Eztli follows it

#### Scenario: A resolution that only records

- **GIVEN** a scenario whose resolution records a log entry and grants experience but reads no story
- **WHEN** the flow runs the resolution
- **THEN** it stops at "continue" with the recorded entry shown, and the next scenario's own setup steps have not run
