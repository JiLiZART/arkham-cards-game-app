## ADDED Requirements

### Requirement: Step events

The engine SHALL log a `step` event at the start of each automated step of a phase, before the step's own events, naming the step and, where one applies, the investigator:

- `doom`: the mythos phase places doom on the agenda;
- `encounter` with the investigator: that investigator draws an encounter card;
- `hunters`: at least one hunter is about to move;
- `attacks`: at least one engaged, ready enemy is about to attack;
- `upkeep`: cards ready and investigators draw and gain resources;
- `handSize` with the investigator: that investigator must discard down to the hand limit.

A step is logged only when it does something: no `hunters` step when no hunter moves, no `attacks` step when no enemy attacks, no `handSize` step for an investigator within the limit. Each step is logged once per phase, however many enemies or investigators it covers. Step events are log entries only: they are not choices, they don't change the reveal counter, and a save made before this change replays its recorded choices to the same state apart from the added log entries.

#### Scenario: Enemy phase with a hunter

- **WHEN** the enemy phase begins with a ready Ghoul Minion two locations from Roland, and a ready Swarm of Rats engaged with Daisy
- **THEN** the log shows `step hunters`, the Ghoul's move, `step attacks`, then the Rats' attack

#### Scenario: Enemy phase with nothing to do

- **WHEN** the enemy phase begins with no enemies in play
- **THEN** no `hunters` or `attacks` step is logged

#### Scenario: Mythos phase

- **WHEN** round 2's mythos phase begins with Roland and Daisy playing
- **THEN** the log shows `step doom`, the doom event, `step encounter` for Roland, his encounter card, `step encounter` for Daisy, her encounter card

#### Scenario: Hand size

- **WHEN** upkeep ends with Roland holding 9 cards and Daisy 5
- **THEN** a `handSize` step is logged for Roland only, before his discard prompt

#### Scenario: Old save

- **WHEN** a save made without step events is loaded
- **THEN** its choices replay to the same cards, counters and pending choice as before
