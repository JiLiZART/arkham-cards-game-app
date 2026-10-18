## ADDED Requirements

### Requirement: Menu backgrounds
The title screen SHALL show the core rulebook's cover painting, without its printed logo, filling the screen behind the menu and dimmed so the buttons stay readable. The new-campaign wizard, settings, how to play and the campaign log SHALL sit on the rulebook's parchment page art. The images SHALL be extracted from the rulebook by an import command into committed WebP files with a manifest naming their source page, and SHALL load without delaying the first screen beyond the icon sprite.

#### Scenario: Title screen
- **WHEN** the app opens
- **THEN** the cover painting fills the screen behind the title and its buttons, which keep their contrast

#### Scenario: Wizard on parchment
- **WHEN** the new-campaign wizard is open
- **THEN** its steps sit on the parchment art

### Requirement: Settings in the menu
The title screen SHALL list Settings as a menu item after How to play, styled like the other items; no settings gear SHALL remain in the corner.

#### Scenario: Open settings
- **WHEN** the player taps Settings on the title screen
- **THEN** the settings screen opens
