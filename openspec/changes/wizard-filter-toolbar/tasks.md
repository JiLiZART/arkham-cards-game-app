## 1. The filter model (`src/ui/menu/wizard.ts`, tests first)

- [x] 1.1 `CampaignFilter` with `null` for all and `DEFAULT_CAMPAIGN_FILTER` (`rules: "complete"`); `NO_CAMPAIGN_FILTER` goes; `filterCampaigns` and `campaignFilterCount` follow. Update the "filtering the campaign list" tests: default shows the complete campaigns only, a cleared filter shows all, kind/rules/length each alone.
- [x] 1.2 `PickerFilter` gains `rules` and `stats`, `DEFAULT_PICKER_FILTER`; `pickerList` applies them (an unloaded card fails a stat minimum); `pickerFilterCount` counts them. Tests: default lists Roland and not a partly implemented investigator; combat 4+ lists Zoey and not Daisy; an unloaded card is out under a stat minimum; the sort is not counted.
- [x] 1.3 `campaignPills` and `pickerPills`: the pills for a filter (value label, a `clear` that returns the filter without it). Tests: the default yields one Complete pill; kind and search yield none; a cycle pill names the cycle; a stat pill reads "Combat 4+".

## 2. The store

- [x] 2.1 `src/ui/menu/wizardFilters.ts`: `useWizardFilters` with `campaign`, `picker`, `sort`, the setters and `clearCampaign` / `clearPicker` back to the defaults. Tests: a patch keeps the rest; clear returns the defaults; the sort survives a clear of the picker.

## 3. The components

- [x] 3.1 `src/ui/menu/FilterToolbar/`: the row (search, `inline`, Filters button with the count, `data-testid="wz-filters"`), the pills (`wz-pill`), the match line (`wz-match`), owning the panel's open state. CSS Module; strings `wizard.filter.open`, `wizard.filter.count`, `wizard.filter.match`, `wizard.filter.clear` in EN and RU.
- [x] 3.2 `src/ui/menu/FilterPanel/`: desktop popover (`role="dialog"`, anchored, Escape and outside close, focus returns to the button) and phone `BottomSheet` (`testId="wz-filter-sheet"`), with `children`, Clear all and the match count.
- [x] 3.3 `CampaignStep`: the toolbar with the kind segmented control inline on the desktop (in the panel on the phone), the panel groups for rules and length, the store instead of `useState`; the empty state offers Clear all. Remove `FilterToggle`, the `.wz-filters` rows and the `wizard.kind.all` / `wizard.rules.all` / `wizard.length.all` strings; add the group labels and `wizard.rules.any` / `wizard.length.any` where the panel needs a resting segment.
- [x] 3.4 `InvestigatorsStep`: the toolbar with the class icons inline on the desktop (in the panel on the phone), the panel groups for cycle, rules, the six stat minimums (`3+ 4+ 5+`; `7+ 8+ 9+`) and the sort, the store instead of `useState`; the empty state offers Clear all. Strings for the stat group and the "n+" chips in EN and RU.

## 4. Specs and verification

- [x] 4.1 Browser check at 1440×900 and 852×393 (own dev server, Playwright): the default Complete pill and count on both steps; the popover opens, sets a length, closes on Escape with the pill left; the phone row is one 44 px line and the sheet holds the kind/class; Clear all; the filters survive Continue and Back. Screenshots under `.playwright-mcp/wizard-filter-toolbar/`.
- [ ] 4.2 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format` on the changed files, and `openspec validate wizard-filter-toolbar --type change --strict`.
