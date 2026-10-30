## Context

`NewGame.tsx` holds the campaign and investigator steps. Each keeps its filter in component state (`useState`) and renders every control inline: `CampaignStep` three chip groups (`KINDS`, `RULES`, `LENGTHS`, each with an "all" chip) and a search; `InvestigatorsStep` six class icon chips, a cycle `<select>`, a sort `<select>` and a search. The pure filtering lives in `src/ui/menu/wizard.ts` (`CampaignFilter`, `filterCampaigns`, `PickerFilter`, `pickerList`, `sortPicker`, `cyclesOf`, the two `*FilterCount`s) and is tested in `wizard.test.ts`. On the phone (ADR-0005, `useLayoutMode()`), a `FilterToggle` chip folds the same rows in place. The card catalog already solved persistence the way this change needs it: a zustand store next to the screen (`src/ui/catalog/state.ts`, `useCatalog`) that lives while the app is open and is never saved (ADR-0004). Phone details panes open in the shared `BottomSheet` (ADR-0017); the desktop keeps popovers, the `NetIndicator` being the house pattern for one that closes on Escape and on a tap outside. Components own their styles in CSS Modules and are found by `data-testid` (ADR-0016).

## Goals / Non-Goals

**Goals:** one toolbar shape for both steps (search, inline primary filter on the desktop, Filters button with a count, pills, match count); the secondary filters in a panel that is a popover on the desktop and the bottom sheet on the phone; Clear all; complete-by-default; app-session persistence; the new investigator filters (rules, stat minimums). The wizard's picks (`WizardState`) are untouched.

**Non-goals:** the decks step's card pool filters (`DeckEditArea`), the card catalog, saving filters to storage, multi-select classes or kinds, a result count per facet, any engine or content change.

## Decisions

### 1. A wizard-filter store beside the screen, not in `WizardState` or `useView`

`src/ui/menu/wizardFilters.ts` exports `useWizardFilters`, a zustand store like `useCatalog`: `{ campaign: CampaignFilter; picker: PickerFilter; sort: SortBy; setCampaign(patch); setPicker(patch); setSort; clearCampaign(); clearPicker() }`. Its initial state is the defaults (`rules: "complete"` on both), so a new app load starts clean and anything else lives as long as the tab. The steps read it instead of `useState`.

Rejected: putting the filters in `WizardState` (it is the picks the game is started from; filters are what is being looked at, ADR-0004, and `initialWizard` is rebuilt on every open); `useView` (the table's store; the catalog precedent keeps a screen's view state next to the screen); `localStorage` (the catalog doesn't either, and a filter that outlives the session surprises more than it helps).

```
  src/ui/menu
  +-----------------------------------------------------------------------------------+
  |  NewGame.tsx                                                                      |
  |   CampaignStep ----------+                     +---------- InvestigatorsStep      |
  |     filterCampaigns(db,  |                     |   sortPicker(pickerList(db, f))   |
  |       locale, f)         v                     v                                   |
  |                    +---------------------------------+                             |
  |                    | FilterToolbar/                  |  search, inline slot,       |
  |                    |  search | [inline] | Filters(n) |  Filters button, pills,     |
  |                    |  pills: x Complete  x 5 or more |  "12 of 54"                 |
  |                    +---------------+-----------------+                             |
  |                                    | open                                          |
  |                    +---------------v-----------------+                             |
  |                    | FilterPanel/                    |  desktop: popover under the |
  |                    |  desktop popover | phone sheet  |  button (Escape, outside)   |
  |                    |  children: the step's groups    |  phone: BottomSheet         |
  |                    |  Clear all        "12 match"    |  (ADR-0017)                 |
  |                    +---------------+-----------------+                             |
  |                                    | set / clear                                   |
  |  wizardFilters.ts  +---------------v-----------------+   wizard.ts (pure, tested)  |
  |   useWizardFilters | campaign, picker, sort          |   CampaignFilter, PickerFilter|
  |   (zustand, lives  | defaults: rules = "complete"    |   filterCampaigns, pickerList |
  |    while app open) +---------------------------------+   *FilterCount, *Pills       |
  +-----------------------------------------------------------------------------------+
```

### 2. Two components shared by both steps: `FilterToolbar` and `FilterPanel`

`FilterToolbar` (own folder, CSS Module) takes `query`, `onQuery`, `inline?: ReactNode` (the desktop's kind control or class icons; the steps pass nothing on the phone), `count` (filters set), `match: { n: number; of: number; noun: string }`, `pills: Pill[]` and `panel: ReactNode`. It renders the row, the pills (`data-testid="wz-pill"`, each a button whose label is the value and whose × is the whole pill's action), the match line, and owns the panel's open state. `FilterPanel` renders `children` plus Clear all and the match count, framed as a popover (`role="dialog"`, anchored under the Filters button, closed by Escape, a pointerdown outside or the button; the `NetIndicator` pattern) when `useLayoutMode()` is `desktop`, and inside `BottomSheet` when `phone` (ADR-0017: the caller owns the open state and renders the same content). The step chooses what goes inline and what goes in the panel; the components don't know campaigns from investigators.

A `Pill` is `{ key: string; label: string; clear(): void }`. Each step derives its pills from its filter with a pure function in `wizard.ts` (`campaignPills(f, tr)`, `pickerPills(db, locale, f, tr)`), so the pill set is unit-tested without React. The sort yields no pill and is not counted.

Rejected: one `Filters` component that knows both steps (two switch statements and the step's strings in a shared file); a generic facet schema driving the UI from data (more machinery than two steps need).

### 3. The filter model: `null` means all, defaults carry "complete"

`CampaignFilter` becomes `{ kind: "campaign" | "return" | "side" | null; rules: "complete" | "partial" | null; length: "one" | "few" | "many" | null; query: string }`, with `DEFAULT_CAMPAIGN_FILTER = { kind: null, rules: "complete", length: null, query: "" }`. `PickerFilter` becomes `{ faction: string | null; cycle: string | null; rules: "complete" | "partial" | null; stats: Partial<Record<StatKey, number>>; query: string }` where `StatKey` is health, sanity, willpower, intellect, combat or agility, and `DEFAULT_PICKER_FILTER` has `rules: "complete"`. `pickerList` applies `rules` to its `partlyImplemented` flag and each `stats` minimum to the loaded card (`db.cards[code]`); an investigator without a loaded card fails any stat minimum, as the spec says. The counts count non-null fields and a non-blank query; `NO_CAMPAIGN_FILTER` goes, `wizard.*.all` strings go with the "All/Any" chips.

The stat chips are fixed lists, read from the cards' printed ranges: `3+ 4+ 5+` for the four skills, `7+ 8+ 9+` for health and sanity. One minimum per stat; a second tap on the lit chip unsets it.

### 4. The inline primary filter stays a chip row on the desktop

The campaign kind is the existing `wz-chip` row restyled as one segmented control (`role="radiogroup"`, "All" as its first segment because a segmented control needs a resting state; it is not a filter and adds no pill or count); the class icons keep `wz-class` and their single-select toggle. On the phone both move into the panel as the same controls, so there is one implementation per control and the panel simply renders it. `FilterToggle` and `.wz-filters` are deleted.

### 5. Match count from the unfiltered list

Each step computes `of` once from the unfiltered source (`campaignOrder(db).length`; `Object.keys(db.investigators).length`) and `n` from the filtered list it already has. No new content read.

## Risks / Trade-offs

- [Newcomers see fewer campaigns and investigators than exist and don't notice the default] -> the Complete pill sits under the toolbar from the first render, the count reads "2 of 20 campaigns", and the empty state offers Clear all.
- [A player clears the default and wonders where it went next session] -> the store resets on load, as the catalog's does; the spec says so.
- [The phone toolbar row with a 44 px search and a Filters button on 852 px] -> the search flexes, the button has a fixed width; checked at 852×393 in the browser.
- [The popover over the tile grid on the desktop] -> it is `position: absolute` under the toolbar with a `z-index` above the tiles, inside the step's main column; the sidebar is untouched.
- [Existing `wizard.test.ts` filter tests assume the "all" values] -> updated with the model in the same task, red first.
- [Stat chips as fixed lists] -> a future investigator printed outside the range still sorts and still shows; only the chips would be coarse. `shortcut: fixed stat chips, upgrade to ranges read from the loaded cards when a card falls outside them`.

## Migration Plan

None. No stored data changes; the strings removed from `ui.json` have no other readers. Deploy as any site build.

## Open Questions

None. In-force ADRs reviewed (ADR-0001 to ADR-0020, ADR-0019 superseded by ADR-0020): ADR-0004 (the filters are view state), ADR-0005 (one layout mode read by the components), ADR-0016 (two new component folders with CSS Modules; `.wz-chip` and `.wz-class` stay the shared primitives), ADR-0017 (the phone panel is the bottom sheet, the desktop keeps a popover). This design stays within them.
