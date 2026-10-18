## ADDED Requirements

### Requirement: Assets with uses leave play when empty
When an ability's cost spends the last use of an asset (supplies, ammo, charges, secrets) and the asset has no other way to matter in play, the asset SHALL be discarded once the ability has resolved. An asset has no other way to matter when every ability it has is one that spends its uses and it has no constant ability. A card marked `discardWhenEmpty` in its data is discarded the same way. The discard is an engine step, so it is deterministic, replayable and undoable like any other, and the ability's own effects (a Flashlight's shroud modifier for its investigation) resolve with the card still in play. This is a deliberate deviation from the printed rules, which leave the empty card in play.

#### Scenario: Flashlight's last supply
- **WHEN** Roland's Flashlight has 1 supply and he investigates with it
- **THEN** the investigation resolves with the −2 shroud, and afterwards Flashlight is in his discard pile and no longer in his play area

#### Scenario: Uses left
- **WHEN** Roland's .45 Automatic has 2 ammo and he fights with it
- **THEN** it stays in play with 1 ammo

#### Scenario: A card with a constant ability
- **WHEN** an asset with uses also has a constant ability and its last use is spent
- **THEN** it stays in play

#### Scenario: Undo
- **WHEN** the player undoes the investigation that emptied Flashlight
- **THEN** Flashlight is back in play with 1 supply
