# bottom-sheet Specification

## Purpose

The phone bottom sheet that details panes open as (the investigator sheet, the wizard's campaign sheet and investigator card): its size, scrolling, theme and how it closes.

## Requirements

### Requirement: Bottom sheet on the phone

On the phone layout, a details pane that the desktop shows beside or over its anchor (the investigator sheet from the top-bar avatar, the wizard's campaign sheet, the wizard's investigator card) SHALL open as a bottom sheet: a panel sliding up from the bottom edge to about 70 % of the viewport height, over a scrim, with a drag handle along its top and a Close icon (×, named Close for assistive technology) in its head. The sheet SHALL keep the theme of the screen it opens from: on the wizard its paper notes keep their dark ink. Its content scrolls inside the sheet; nothing in it is ever off screen. The sheet SHALL close on a tap on the scrim, on a swipe down from the handle of more than 60 px, on Close, or on Escape. One bottom sheet is open at a time; opening another replaces it. The sheet is view state (ADR-0004): it holds nothing the game needs and reopening it shows the current values.

#### Scenario: Investigator sheet

- **WHEN** Roland taps his own avatar in the top bar at 852×393
- **THEN** a bottom sheet rises with his card, ability, skills, resources, clues and hand count, the card and the Close control both on screen, and the rest reachable by scrolling inside the sheet

#### Scenario: Swipe to close

- **WHEN** the player drags the handle down by more than 60 px
- **THEN** the sheet slides away and the scrim fades

#### Scenario: Scrim

- **WHEN** the player taps the map above the sheet
- **THEN** the sheet closes and the tap does not reach the map

#### Scenario: Desktop unchanged

- **WHEN** the same sheet opens at 1600×900
- **THEN** it opens where it did before (the anchored popover, the wizard sidebar), with no scrim or handle
