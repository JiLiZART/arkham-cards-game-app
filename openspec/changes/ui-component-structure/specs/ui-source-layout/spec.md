## ADDED Requirements

### Requirement: A component lives in its own folder

Every React component under `src/ui` SHALL live in a folder named after it, holding `Component.tsx`, its CSS Module when it has styles, its tests, and helpers only it uses. The folder's `index.ts` SHALL be the only path other code imports the component from. A file MUST NOT define more than one exported component; small private sub-components used only by that file MAY stay in it.

#### Scenario: Finding a component's styles

- **GIVEN** a contributor looking at the hand fan
- **WHEN** they open `src/ui/hud/HandFan/`
- **THEN** they find `HandFan.tsx`, `HandFan.module.css`, the fan layout helper and its tests, and nothing outside the folder styles the fan

#### Scenario: Importing a component

- **WHEN** code outside the folder imports the hand fan
- **THEN** it imports from `hud/HandFan`, not from a file inside the folder

### Requirement: Component styles are CSS Modules

A component's styles SHALL be in `Component.module.css` next to it, read in JSX as `styles.<name>`. A component's class MUST NOT be styled from another component's CSS file. Global state on the game root (`.game.phone`, `.game.testing`) SHALL be reached from a module with `:global(...)`.

#### Scenario: A class name used in two components

- **GIVEN** two components that both use a class named `title`
- **WHEN** both render on one screen
- **THEN** each keeps its own styles and neither overrides the other

#### Scenario: Phone layout

- **GIVEN** the game root has the `phone` class
- **WHEN** the hand drawer renders
- **THEN** its phone styles apply through `:global(.phone)` in its own module

### Requirement: Global CSS holds only what is global by nature

`src/ui/styles.css` SHALL contain only the design tokens on `:root` with their light and dark values, resets and base element styles, font faces, the layout-mode and state classes on the game root, and primitives shared by many components: buttons, the campaign-guide markup (`g-*`), the card flip. Any other rule belongs in a component's module.

#### Scenario: Adding a style for one component

- **WHEN** a contributor styles a new element of the skill-test screen
- **THEN** the rule goes in the skill-test screen's module, not in `styles.css`

### Requirement: Code finds DOM elements by data attribute

Code that looks up rendered elements (`querySelector`, `closest`, the arrival places that animations fly to and from) SHALL find them by `data-` attributes, never by class name.

#### Scenario: Flying a card to the play strip

- **GIVEN** class names are hashed by CSS Modules
- **WHEN** a played card flies to the viewer's play strip
- **THEN** the flight finds the strip by its data attribute and lands where it did before the change

### Requirement: Non-component code is grouped by concern

Modules under `src/ui` that are not components SHALL sit in a folder for their concern: `state/` (the game and view stores and their helpers), `game/` (table logic such as option placement, the feed, the instruction bar, arrivals and the showcase), `assets/` (images, icons, sounds, audio), and shared presentational components in `components/`. The screen areas `hud/`, `menu/`, `scene/`, `catalog/` and `dev/` SHALL keep their names.

#### Scenario: The root of src/ui

- **WHEN** a contributor lists `src/ui`
- **THEN** they see the concern and screen-area folders, `App.tsx` and `styles.css`, not loose logic files

### Requirement: The restructure changes nothing the player sees

After the restructure, every screen SHALL look and behave as it did before, in the desktop and phone layouts and in both locales.

#### Scenario: Screen-by-screen check

- **GIVEN** screenshots of the title, new game, campaign, deck builder, card catalog, the table in desktop and phone layouts, a skill test, the drawn-card showcase and the scenario introduction, taken before the change
- **WHEN** the same screens are captured after the change
- **THEN** they show the same layout, colours and text
