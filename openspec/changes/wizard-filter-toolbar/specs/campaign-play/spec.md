## MODIFIED Requirements

### Requirement: Campaign tiles

The new-game screen's campaign step SHALL be a picker: a filter toolbar across the top, a grid of tiles below, and a sidebar for the campaign in focus. The toolbar SHALL hold a search box matching campaign and scenario names (in the game's language and in English), the kind of campaign as one segmented control (all, campaigns, Return to, side scenarios), and a **Filters** control that says how many filters are set and opens the filter panel. The panel SHALL offer the rules filter (complete, partly implemented, as the content's coverage reports them; or any), the length filter (one scenario, two to four, five or more; or any), a **Clear all** control and how many campaigns match. A filter set in the panel SHALL be shown under the toolbar as a pill naming its value with a × that unsets that one filter; the kind control and the search show their own state and have no pill. The toolbar SHALL say how many campaigns match of how many there are, and the empty state SHALL say nothing matches and offer Clear all. The rules filter SHALL start at complete when the app loads, so the first list is what plays well, shown as a pill like any filter the player set; Clear all, or the pill's ×, shows every campaign. The filters and the search SHALL be kept while the app is open: leaving the step, closing the wizard or returning from a later step finds them as they were; a new load of the app starts from the defaults. An unset filter means all; there are no "All" or "Any" choices.

Each tile SHALL show the first chapter's art as its preview (the first agenda of the first scenario played, a landscape card), the campaign name, the number of scenarios and, for a campaign coverage does not report complete, the partly-implemented badge. The grid and the sidebar SHALL each scroll on their own, with no scroll area inside another. A tap on a tile SHALL select the campaign and open it in the sidebar; on a phone the sidebar opens over the grid. The sidebar SHALL show the campaign name, the number of scenarios, for a campaign that is not complete the partly-implemented note with how far it is ("n of m cards work") and the scenarios still without a scenario script, the campaign's prologue from the campaign guide in the game's language (an epigraph for most campaigns; a side scenario uses its scenario's intro) with a "More" control that shows the whole prologue when it is longer than a paragraph, and then every scenario in campaign order, numbered and named, with its first agenda and first act (the chapter's art, as the act and agenda viewer shows a scenario in play), with interludes listed by name between them. Tapping one of those cards SHALL open it at full size in a dialog, both sides, so its text can be read; the dialog closes with Close or Escape. The card codes and names SHALL be available before the campaign's scenarios are loaded, so the sidebar fills at once; its images load from the card image source.

#### Scenario: The Dunwich Legacy in Russian

- **WHEN** the locale is Russian and The Dunwich Legacy is tapped
- **THEN** its tile shows the art of Extracurricular Activity's first agenda and "Наследие Данвича", and the sidebar shows the Russian epigraph from "Ужас Данвича", the number 8, and the eight scenarios in order with their Russian names, each with its first agenda and act, Armitage's Fate and The Survivors named between them

#### Scenario: Read a chapter's card

- **WHEN** the player taps Extracurricular Activity's agenda in the sidebar
- **THEN** a dialog shows Quiet Halls at full size, its front and its back, and Close returns to the picker with the campaign still selected

#### Scenario: Read the whole prologue

- **WHEN** the player taps "More" in the sidebar of a campaign whose prologue is several paragraphs
- **THEN** the full prologue is shown, and the selection does not change

#### Scenario: Complete campaigns first

- **WHEN** the app loads and the wizard opens on the campaign step
- **THEN** a "Complete" pill is under the toolbar, the Filters control shows 1, only the campaigns coverage reports complete are in the grid (Night of the Zealot among them, The Dunwich Legacy not), and the count says how many match of how many there are

#### Scenario: Filter and search

- **WHEN** the player clears the Complete pill, chooses "side scenarios" in the kind control and types "carn"
- **THEN** only Carnevale of Horrors is in the grid, no pill is shown for the kind, and clearing the search shows every side scenario

#### Scenario: Filters from the panel

- **WHEN** the player opens Filters, picks "5 or more" and closes the panel
- **THEN** a "5 or more" pill joins the pills, the Filters control counts it, the grid holds only campaigns of five scenarios or more that pass the other filters, and the × on the pill puts them back

#### Scenario: Clear all

- **WHEN** the player taps Clear all with the rules, the kind and a search set
- **THEN** every campaign is in the grid, no pill is shown, the search is empty and the Filters control shows no count

#### Scenario: Filters kept across steps

- **WHEN** the player sets the kind to "Return to", goes on to the investigators step and comes back
- **THEN** the kind control still says "Return to" and the grid is the same filtered list

#### Scenario: How far a campaign is

- **WHEN** The Dunwich Legacy is tapped
- **THEN** the sidebar says how many of the cards its scenarios use work out of how many, and that its eight scenarios have no scenario script yet
