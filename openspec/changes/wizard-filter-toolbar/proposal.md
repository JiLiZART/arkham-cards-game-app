## Why

The new-game wizard's campaign and investigator steps front-load every filter: eleven unlabelled chips and a search on the campaign step, icon chips, two native selects and a search on the investigator step. On the desktop the controls take two rows above the tiles and read as one undifferentiated band; on the phone (landscape, 852×393) the "Filter" chip costs a full row even when closed and the expanded rows push the tiles under the footer. Nothing says how many match or lets the player clear what is set, the filters are lost every time a step is left, and newcomers land on a mixed list of complete and partly implemented content with nothing to tell them which plays well.

## What Changes

- Both steps get one toolbar: a search field and a **Filters** button that shows how many filters are set and opens a filter panel; the desktop keeps the step's primary filter inline (campaign kind as segmented tabs; the six class icons for investigators), the phone puts everything but the search in the panel.
- The panel is a popover on the desktop and the existing bottom sheet on the phone. It holds the secondary filters (campaign: rules and length; investigators: class on the phone, cycle, rules, stat minimums, sort), a **Clear all** control, and the match count.
- Filters set in the panel are shown as removable pills under the toolbar; a pill's × unsets that one filter.
- The grid says how many match ("12 of 54 investigators"); the empty state offers Clear filters.
- Investigators gain a **rules** filter (complete, partly implemented, any) and **stat minimums** (health, sanity, willpower, intellect, combat, agility as "n+").
- Both steps start with rules set to **complete**; the pill makes the default visible, and clearing it (or Clear all) shows everything.
- Filters and sort live in a wizard-filter store and are kept while the app is open (Back, Continue, closing and reopening the wizard find them unchanged); a new app load starts from the defaults.
- The "All" / "Any rules" / "Any length" chips go away: an unset group means all.
- **BREAKING** for the phone spec only: the in-place "Filter" chip expansion is replaced by the toolbar and sheet.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: the campaign picker's filters move into a toolbar (search, kind tabs, Filters panel), get a match count, removable pills, Clear all, a complete-by-default rules filter and app-session persistence.
- `investigator-decks`: the investigator step's filters move into the same toolbar shape (search, class icons, Filters panel with cycle, rules, stat minimums and sort), with the same count, pills, Clear all, default and persistence; rules and stat minimums are new filters.
- `game-table-ui`: the phone wizard's folded "Filter" chip is replaced by a one-row toolbar (search and a Filters button) with the filters in a bottom sheet; the campaign-step phone scenario changes accordingly.

## Impact

- `src/ui/menu/wizard.ts`: `CampaignFilter` loses its `all` values and gains defaults; `PickerFilter` gains `rules`, `stats` and holds `sort`; the counts, `filterCampaigns`, `pickerList` and a new `clear` follow. Existing tests in `src/ui/menu/wizard.test.ts` are updated.
- New store `src/ui/menu/wizardFilters.ts` (zustand, like `src/ui/catalog/state.ts`), and new components under `src/ui/menu/`: `FilterToolbar` (search, inline primary filter, Filters button, pills, count) and `FilterPanel` (the popover / bottom sheet body), each with its CSS Module and `data-testid`s.
- `src/ui/menu/NewGame/NewGame.tsx` and `NewGame.module.css`: `CampaignStep` and `InvestigatorsStep` use the toolbar; `FilterToggle` and the `.wz-filters` rows go.
- `src/ui/components/BottomSheet`: reused as the phone panel, unchanged.
- `content/i18n/{en,ru}/ui.json`: new strings for the Filters button, Clear all, match counts, the rules and stat groups and the pills; the `wizard.kind.all`, `wizard.rules.all` and `wizard.length.all` strings go.
- Specs: `openspec/specs/campaign-play`, `investigator-decks` and `game-table-ui` as above. No engine or content changes.
