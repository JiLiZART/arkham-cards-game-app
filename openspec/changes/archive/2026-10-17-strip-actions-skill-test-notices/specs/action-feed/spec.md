## MODIFIED Requirements

### Requirement: Action floats

As each new entry appears, the same styled sentence SHALL float up from whoever did it and fade out, the way the floating damage numbers do:

- an investigator's action starts at their portrait on the map;
- an enemy's action starts at its card on the map;
- an action with no actor on the map, or whose actor is off-screen (doom, an encounter draw), starts at the centre of the screen.

A float SHALL stay readable long enough to read: at least 3.5 seconds, plus about 60 ms per character of its text beyond 30 characters, capped at 6 seconds, before it fades. Floats SHALL be released at least 0.9 seconds apart. At most two SHALL be on screen at once; later ones wait their turn rather than being dropped, except in a burst (below).

A float SHALL follow its anchor while the camera pans or zooms. Floats from the same spot SHALL stack so each stays readable. Floats MUST NOT intercept the pointer. They replace the plain-text event banner.

Phase changes SHALL NOT float; they are shown as the phase title instead (see Phase title in game-table-ui).

#### Scenario: Float from the investigator

- **WHEN** Roland, whose portrait is on the Study, takes the resource action
- **THEN** "[portrait] Roland Banks took 1 [resource icon]" rises from Roland's portrait on the Study, stays at least 3.5 seconds and fades, while the same entry drops into the feed

#### Scenario: Float from an enemy

- **WHEN** a Ghoul Minion on the Cellar attacks Roland for 1 damage and 1 horror
- **THEN** the styled attack entry rises from the Ghoul Minion's card and fades

#### Scenario: No actor on screen

- **WHEN** the mythos phase places 1 doom on the agenda
- **THEN** the doom entry rises from the centre of the screen and fades

#### Scenario: Several entries at once

- **WHEN** an attack deals damage and horror and the enemy then exhausts, producing three entries together
- **THEN** the first two float about 0.9 seconds apart, and the third starts only after the first has faded

#### Scenario: Phase change

- **WHEN** the enemy phase begins
- **THEN** no float rises for it; the phase title plays and the feed lists the phase change

#### Scenario: Burst

- **WHEN** a scenario starts and many events arrive at once
- **THEN** only the last two float, staggered, and the screen isn't flooded
