## Context

Night of the Zealot is the only campaign: `content/campaigns/night-of-the-zealot/` holds `campaign.json`, three scenario files and three scenario scripts, and the core pack's `cards.json` holds the behaviour of its cards. Every cycle's cards are in the content since `all-cycles-ru-content`, loaded on demand by pack. ArkhamCards' guides (`all_campaigns.txt`, `all_campaigns_ru.txt`) list per campaign: its scenarios in order, the difficulty choices with their chaos tokens, and per scenario the reference card, the steps (encounter sets as ids matching the snapshot's `encounter_code`, a `location_setup` grid of card codes, free text for "put into play", "begins play at", "set aside"), and the resolutions with the step ids of their log records and experience. `import-i18n` already takes names, intros and resolutions from the guides for any campaign or scenario with an `i18nId`.

## Goals / Non-Goals

**Goals:**

- Every official campaign in the guides whose cards exist can be started, played to a resolution, and continued, in English and Russian.
- The import is one command, reproducible, and leaves hand-written campaigns alone.
- A scenario never gets stuck at its last act or agenda.
- Keywords on cards are explained in both languages.

**Non-Goals:**

- Card behaviour for the new encounter cards, acts, agendas and locations; scenario-specific mechanics (supplies, vengeance, the Hidden keyword, keys, Frost).
- Campaign branches (choosing the scenario order, interludes with decisions, side-story insertion): the guide's listed order is played.
- Fan-made campaigns.

## Decisions

### 1. `scripts/import-campaigns.ts`, pure mapping in `scripts/campaignGuide.ts`

The script reads the guides and the snapshot's cards and writes `content/campaigns-generated/<campaign-id>/campaign.json` and `scenarios/<scenario-id>.json` (see 6). Ids are the guide's ids in kebab-case; `i18nId` keeps the guide id so `import-i18n` brings the Russian text. Pure functions, unit-tested: `chaosBag(tokens)`, `layoutOf(grid)` (layout and neighbour connections), `cardsByName(text, pool)`, `tokenEffects(referenceCard)`, `resolutionEffects(resolution, steps)`, `actsAndAgendas(sets, cards)`. Campaign selection: guide campaigns of type campaign or standalone whose ids do not start with `z` and are not `rttic`, and whose every scenario set exists; for `side`, each scenario with all sets present becomes a one-scenario campaign "Side: <name>".

### 2. Scenario contents

- `card`: `chaos_bag_card`; `encounterSets`: the `encounter_sets` step (sets unknown to the snapshot dropped and listed).
- Acts/agendas: cards of type act/agenda in the scenario's own set (the set named like the scenario, else the first set), sorted by `stage` then code; one card per stage (alternate versions of a stage: the lowest code).
- Locations into play: the `location_setup` grid codes (`_back` stripped); else names parsed from the "Put … into play" text, matched against the gathered sets' locations. Start: "begins play at the X" by name, else the first location.
- Set aside: names after "Set … aside" matched against the gathered sets' cards (not acts, agendas or locations already in play).
- Layout: grid position per code; connections: orthogonal neighbours; no grid: a row, every location connected.
- Branch steps: the first option's steps.
- Tokens: the reference card's front (easy/standard) and back (hard/expert) text, one line per symbol; the first signed number is the modifier; "X" or unreadable gives −2 and the scenario is listed.
- Resolutions: `none` from `no_resolution`, `R<n>` as named; effects: each step id whose step has `campaign_log` effects records its id (`record`, key = step id); `earn_xp`-like steps give `xp` with victory points; `proceed`/others ignored. Text from the guide.
- Campaign log labels: the text of each recorded step.

### 3. Packs and loading

`CampaignDef` gains `packs: string[]` (default `["core"]`) and `generated: boolean` (default false). The import fills `packs` with the packs of every card the scenarios reference plus the packs of their encounter sets' cards. `store.newCampaign` and the restore path `await Promise.all(packs.map(loadPack))` before building the game; the new-game screen disables Start while loading. In the browser, `validateRefs` skips scenarios of campaigns whose packs are not all loaded; `check:content` loads every pack and validates everything.

### 4. Engine ending

In `nextAct`/`nextAgenda`, when the deck is empty and the phase is not `ended`, push a `Resolution`: the `→R<n>` on the card's back text if the scenario has it, else the first `R*` (act) or `none` (agenda). Scripted backs push their resolution before `nextAct` runs, so they are unaffected. `ENGINE_VERSION` bumps.

### 5. Glossary

`content/i18n/<locale>/ui.json` gains `kw.<keyword>` entries written after the rules references (`inspired/rulebook-web`, `документы/Rules_Reference.pdf`). `keywordsOf(card, text)` (pure, tested) finds them in `keywords` and in keyword lines of the text (`Охотник.`, `Hunter.`, `Patrol (Location).`). The details column and the modal render them below the text.

### 6. Found while building

- Generated campaigns live in `content/campaigns-generated/<id>/`, apart from the hand-written ones: the first load keeps only their `campaign.json` (the list, the chaos bags, the reference card for the tile's art); `loadCampaign(id)` fetches their scenarios and their text in every locale (`i18n/<locale>/campaign-texts/<id>.json`, which also holds the log labels) when the campaign is picked, before its packs load on Begin or on restore. Measured: main chunk 1,874 KB (493 KB gzipped) against 1,742 KB (464 KB).
- Their encounter-set icons go in a second sprite, `public/icons/sprite-campaigns.svg` (263 symbols, 2 MB), fetched with the campaign; `check:content` requires icons only for hand-written scenarios and notes the rest. 43 names have no glyph in any source.
- Cards a setup names from sets the scenario doesn't gather (a location of another set) come from a hidden side deck `_setAside`, so their sets' other cards stay out of the encounter deck; the panel doesn't show side decks named with `_`.
- Generated scenarios have no music bed of their own: a `bed:default` entry reuses an existing CC0 track.
- Fortune and Folly is a standalone and also in the side list; it is generated once.

## Risks / Trade-offs

- [Partial rules make some scenarios unwinnable or trivial] → marked in the UI; the ending fallback means every scenario still ends; fidelity comes campaign by campaign.
- [Text parsing of names misses cards] → unmatched names are listed by the import; the scenario still sets up from the layout.
- [Connections approximate the printed symbols] → noted in the ADR; hand-written scenario files can replace generated ones.
- [Repository size] → about 200 small JSON files; no images.

## Migration Plan

Additive content and fields with defaults; the engine bump restarts saved scenarios and keeps campaign logs. Rollback: delete the generated folders.

## Open Questions

None.
