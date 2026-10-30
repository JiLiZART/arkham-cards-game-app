## MODIFIED Requirements

### Requirement: Choosing among all investigators

The investigator step SHALL list every defined investigator as an avatar under a filter toolbar: a search by name in the game's language (English names also match), the six class icons as toggles (one class at a time; the chosen one is lit, a second tap unsets it), and a **Filters** control that says how many filters are set and opens the filter panel. The panel SHALL offer the cycle (any, or one of the packs investigators come from), the rules (complete, partly implemented, as the content's coverage reports them; or any), a minimum for each of health, sanity, willpower, intellect, combat and agility (any, or "n+" among the values printed on investigator cards), the sort (by release, the default; name; class; or a starting stat highest first), a **Clear all** control and how many investigators match. A filter set in the panel SHALL be shown under the toolbar as a pill naming its value ("The Dunwich Legacy", "Complete", "Combat 4+") with a × that unsets that one filter; the class icons and the search show their own state and have no pill, and the sort is not a filter: it has no pill and is not counted. The toolbar SHALL say how many investigators match of how many there are, and the empty state SHALL say nothing matches and offer Clear all. The rules filter SHALL start at complete when the app loads, shown as a pill like any filter the player set; Clear all, or the pill's ×, shows every investigator. The filters, the search and the sort SHALL be kept while the app is open: leaving the step, closing the wizard or returning from a later step finds them as they were; a new load of the app starts from the defaults. An unset filter means all. An investigator whose card is not loaded yet does not match a stat minimum until it is.

Beside the list a sidebar SHALL show the investigator hovered, else the one last tapped: the full investigator card, the starting health, sanity and skills, the traits, the ability text and the deckbuilding rules, in the game's language. The step SHALL load every card pack when it opens, so the sidebar, the sort and the stat minimums have every investigator's card. An investigator whose ability has no written behaviour SHALL carry the partly-implemented note; one with no deck available SHALL be shown as needing a deck and not be pickable. A picked investigator's turn-order badge (P1 to P4) SHALL be readable on the tile. The packs of the picked investigators and of every card in their decks SHALL be loaded as soon as they are picked, and the deck step SHALL check their decks only once those cards are in: until then it says it is loading and Continue waits, and a deck of a later cycle is never refused as unknown cards. Starting a campaign SHALL load those packs before it begins.

#### Scenario: Complete investigators first

- **WHEN** the app loads and the wizard reaches the investigators step
- **THEN** a "Complete" pill is under the toolbar, the Filters control shows 1, the investigators coverage reports complete are listed (Roland Banks among them) and those with the partly-implemented note are not, and the count says how many match of how many there are

#### Scenario: Filter Seekers of Dunwich

- **WHEN** the player clears the Complete pill, taps the Seeker icon and picks The Dunwich Legacy in the panel
- **THEN** Rex Murphy is listed and Roland Banks is not, a "The Dunwich Legacy" pill is shown and the Seeker icon is lit with no pill of its own

#### Scenario: Filter by a stat

- **WHEN** the player sets combat to 4+ in the panel with no other filter
- **THEN** Zoey Samaras (combat 4) is listed, Daisy Walker (combat 2) is not, and a "Combat 4+" pill is shown

#### Scenario: Clear all

- **WHEN** the player taps Clear all with a class, a cycle, a stat and a search set
- **THEN** every investigator is listed in release order, no pill is shown, no class icon is lit, the search is empty and the Filters control shows no count

#### Scenario: Filters kept across steps

- **WHEN** the player taps the Mystic icon and sorts by willpower, goes on to the decks step and comes back
- **THEN** the Mystic icon is still lit and the list is still the Mystics by willpower

#### Scenario: Read an investigator

- **WHEN** the player rests the mouse on Zoey Samaras
- **THEN** the sidebar shows her card, health 9, sanity 6, willpower 4, intellect 2, combat 4, agility 2, her ability and her deckbuilding rules

#### Scenario: Sort by combat

- **WHEN** the player sorts by combat
- **THEN** the investigators with the highest combat come first, and the sort adds no pill and no count

#### Scenario: A deck of a later cycle

- **WHEN** the player picks Zoey Samaras and goes on to the deck step
- **THEN** her starter deck is valid once her pack is loaded, and Continue is enabled

#### Scenario: Start with Zoey

- **WHEN** a campaign starts with Zoey Samaras and her starter deck
- **THEN** the Dunwich pack is loaded first and Zoey is on the table with her deck
