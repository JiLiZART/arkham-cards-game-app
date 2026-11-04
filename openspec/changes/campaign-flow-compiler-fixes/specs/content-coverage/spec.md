## MODIFIED Requirements

### Requirement: The program of per-pack changes

`docs/campaign-program.md` SHALL list every change of the program in the order they land: the foundations (the importer and flow compiler fixes, the generic engine changes), each cycle's engine change before its campaign, each base campaign before its Return-to, the side scenarios, and the player-card changes per cycle after the engine changes their cards need; each row with the change's name under `openspec/changes/`, its status (proposed, in progress, archived) and the packs or scenarios it completes. Beneath the program it SHALL keep the coverage tables: every pack the generated campaigns and the player cards come from, in play order, with the campaign it belongs to and its encounter and player card counts, and a campaign box (a pack holding a whole campaign's scenarios) one row per scenario with its counts. A campaign change SHALL be done when coverage reports its campaign complete; a player-card change when it reports its packs' player cards complete; an engine change when the campaign changes that depend on it can start.

#### Scenario: The plan names every change

- **WHEN** the program document is compared with `openspec/changes/`
- **THEN** every campaign, player-card and program engine change appears in it once, in landing order, with its status

#### Scenario: The plan names every pack

- **WHEN** the program document is compared with the packs in the content
- **THEN** every pack with encounter or player cards that don't work appears in its tables once, with its campaign and the change that completes it

#### Scenario: A campaign box by scenario

- **WHEN** the program document is compared with the scenarios of Edge of the Earth
- **THEN** every one of its scenarios that is not complete has a row of its own under the Edge of the Earth campaign box
