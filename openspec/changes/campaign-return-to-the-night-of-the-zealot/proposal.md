## Why

Return to the Night of the Zealot is the first Return-to box and the only one whose base campaign is complete, so it is where the Return-to shape (a scenario that is its base scenario plus a setup card) gets exercised first. Today its three scenarios exist only as generated JSON under `content/campaigns-generated/return-to-the-night-of-the-zealot/`, and that JSON is wrong where it matters: Return to The Gathering has one act of three and sets aside both Attics and both Cellars; Return to The Midnight Masks fixes all nine locations, has no cultist side deck and never spawns the Acolytes; Return to The Devourer Below puts all ten woods and all four Agents sets into play; every resolution uses snake_case log keys the base setup conditions never read, and the campaign flow asks unanswerable prompts. Of the box's 38 encounter cards 2 work, no scenario has a script, and the three setup cards (50011, 50025, 50032a) are counted as second scenario cards no scenario names (report `notz-return.md`, sections 1, 3 and 4).

## What Changes

- **The campaign becomes hand-written over the base one.** `content/campaigns/return-to-the-night-of-the-zealot/` replaces the generated folder: `campaign.json` with the base log labels and sections, an empty `flow.json` as the base has, and three scenario files built from the base files plus the setup text on the backs of 50011, 50025 and 50032a. Each scenario keeps the base scenario card as `card` (its token table on all four difficulties) and names the box's card in `setupCards`; resolutions are the base ones with camelCase keys (`houseBurned`, `ghoulPriestAlive`, `cultistsGotAway`, `pastMidnight`…), so a Return scenario reads what the one before it recorded. Each scenario's script composes the base script in `content/campaigns/night-of-the-zealot/scripts/`.
- **Return to The Gathering** (01104 + 50011): acts `50012`, `01109`, `01110`; one Attic (01113/50018) and one Cellar (01114/50020) at random, the others removed; Hallway 50017, Parlor 01115, Field of Graves 50019 and Ghoul Pits 50021 set aside; 01108, 01111, 01112 removed; sets `torch`, `return_to_the_gathering`, `rats`, `ghouls_of_umôrdhoth`, `striking_fear`, `ancient_evils`, `chilling_cold`. Its 15 cards work: act 50012, locations 50013–50021, enemies 50038 and 50039, treacheries 50024 and 50040. Connections from the card scans: Guest Hall 50014 to Study 50013, Bedroom 50015, Bathroom 50016 and Hallway 50017; the Hallway to either Attic, either Cellar and the Parlor; Attic 50018 to Field of Graves 50019; Cellar 50020 to Ghoul Pits 50021; the base Attic and Cellar to the Hallway only. All two-way.
- **Return to The Midnight Masks** (01120 + 50025): agenda 1 is 01121a or 50026a at random (its back set aside), then 01122; one random Downtown, Southside, Easttown (01132/50027), Northside (01134/50028), Rivertown (01125/50030) and Miskatonic University (01129/50029); cultist side deck `cultists` + `return_cult` with 3 removed at random; the Acolyte spawns become 50041 Disciple of the Devourer; house burned, Ghoul Priest alive and the start location as in base. Its 14 cards work: agenda 50026a, enemies 50026b, 50041, 50042, 50044–50046, locations 50027–50030, treacheries 50031 and 50043. Connections are the base 19 (the guide's placement image agrees) with each Return variant wired like the location it replaces; the scans show identical symbols.
- **Return to The Devourer Below** (01142 + 50032a): Main Path plus 4 random of 10 woods (01150–01155, 50033–50036); 50032b Vault of Earthly Demise attached to the set-aside Umôrdhoth; `randomEncounterSet` of the four Agents sets as base; doom from `cultistsGotAway`, past midnight and the Ghoul Priest as base. Its 13 cards work: locations 50033–50036, treachery 50037, 50032b, and the shared 50038–50043. Connections as the cards print: the Main Path to every woods in play and to the Ritual Site; the Ritual Site to the Main Path only; each woods to its printed partner woods when in play (Great Willow 50033 with Lakeside 50034, Corpse-Ridden Clearing 50035 with Wooden Bridge 50036; the base woods in their printed ring 01150–01152–01151–01154–01155–01153–01150).
- **Scenario scripts** composed from the base ones, plus card scripts where the vocabulary ends: 50012, 50013, 50016, 50024, 50028, 50030, 50031, 50032b, 50037, 50039, 50040, 50041, 50042, 50043.
- **Vocabulary additions**, each used by two cards or reused by later Return boxes: an ordered spawn fallback (`spawn: ["Your House", "Rivertown"]`); a `cannotDrawAction` flag scoped to investigators at a location; a `cannotParley` flag scoped to Cultists at or connecting to a location; prey `nearestTo` a card filter; a `revealAnotherToken` op with limit once per test; an `endTurn` op; the `damageCapOne` flag scoped to enemies at a location; a `gainClues` op from the token pool; `addUses` on a chosen controlled asset with a given use type; conditions `leadInvestigator` and `agendaStage`.
- **The base campaign can use the replacement sets.** Night of the Zealot's `campaign.json` declares the option `rtnotz-replacement-sets` (the `CampaignDef.options` / `replaceSets` shape of `scenario-import-fixes`, ADR-0038): Ghouls of Umôrdhoth for Ghouls, The Devourer's Cult for Dark Cult. Cult of Umôrdhoth (`return_cult`) replaces nothing: the bookmark says the cultist deck draws from both sets, so it is not part of the option.
- Coverage: `return-to-the-night-of-the-zealot` and its 3 scenarios complete; `docs/campaign-program.md` rtnotz row at 0 encounter cards left.
- `ENGINE_VERSION` bump: a saved scenario in progress restarts, campaign logs are kept.

Not in this change: the "after you reveal this location" trigger and the random setup ops (`engine-scenario-structure`); `setupCards`, `compose()` and `CampaignDef.options` (`scenario-import-fixes`, ADR-0038); the three base NotZ fixes (The Devourer Below's elder thing token, Gathering R3's Lita for a killed lead, `01109.ts` finding the Hallway by code: a separate bug fix this change depends on); the 10 player cards (`player-cards-notz-return`); By the Book (`campaign-side-by-the-book`); the bookmark's "shuffle old and new sets together" optional variant.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: Return to the Night of the Zealot playable to every resolution, each scenario the base plus the box's setup card; Night of the Zealot offers the replacement-sets option at creation.
- `card-content`: every rtnotz encounter card declared and the vocabulary it adds.
- `content-coverage`: the campaign and its scenarios complete; the rtnotz encounter row at 0 left.

## Impact

- `content/campaigns/return-to-the-night-of-the-zealot/` (new: `campaign.json`, `flow.json`, 3 scenario files, 3 scripts); `content/campaigns-generated/return-to-the-night-of-the-zealot/` deleted; `scripts/import-campaigns.ts` already skips a hand-written id.
- `content/campaigns/night-of-the-zealot/campaign.json` (the option); its three scripts export their hooks for composition.
- `content/packs/return/cards.json` (38 cards' abilities) and `content/packs/return/scripts/<code>.ts` (14 card scripts).
- `src/content/schema.ts` (`CardDef.spawn` list, the flags, scopes, ops and conditions), `src/content/implemented.ts` (`spawnResolves` over a list), `src/engine/effects/` (new ops), `src/engine/rules/` (flags and scopes read where draw, parley, damage and prey are decided), `src/engine/index.ts` (`ENGINE_VERSION`).
- `content/i18n/{en,ru}/ui.json` (ability labels, script prompts, the option label); `content/i18n/ru/campaign-texts/return-to-the-night-of-the-zealot.json` regenerated and keyed by the base log keys.
- `content/coverage.json`, `docs/campaign-program.md`, README's campaign list.
- Depends on `engine-scenario-structure` (reveal trigger, random setup ops), `scenario-import-fixes` (`setupCards`, `compose()`, `CampaignDef.options`, the camelCase log keys) and the base NotZ bug fix.

## Decided (assumed)

- Hand-port from base rather than repair the generated JSON: the generated files disagree with base on log keys, resolution effects and setup in every scenario, and the base files are known good (report, sections 3 and 4).
- Random setup (one of two Attics and Cellars, one of two agenda 1a cards, 3 of 8 cultists removed) is data through `engine-scenario-structure`'s ops, not a per-scenario `setup` hook, so the five Return boxes say it one way.
- The Guest Hall's draw ban and Narôgath's parley ban are flags with a location scope, not scripts: a location that forbids an action to those on or beside it recurs in later boxes.
- Mask of Umôrdhoth and the Vault are scripts: attaching a treachery to an enemy and granting it keywords appears twice here and nowhere else yet.
- The Devourer Below's connections follow the printed symbols, not the base file: the base file links the Ritual Site to every woods and no woods to another, while the cards link the Ritual Site to the Main Path only and each woods to a partner woods. The Return file is written from the cards; the base file's edges are a finding for the base campaign (reported, not changed here).

## Decided (user)

- **Each base campaign offers its Return-to replacement sets as an option at campaign creation**, with the `CampaignDef.options` / `replaceSets` shape from `scenario-import-fixes` (its design decision 11 and campaign-play requirement "Campaign options chosen at creation"). Night of the Zealot's `campaign.json` gets `rtnotz-replacement-sets`. The bookmark (`inspired/AHC_CYOA-main/Return To Bookmarks/Return To Bookmarks - For Reading.pdf`) prints the pairs backwards ("Ghouls replaces Ghouls of Umôrdhoth"); per the setup cards and ArkhamCards the new sets replace the old:

  | Replacement set | Replaces |
  | --- | --- |
  | Ghouls of Umôrdhoth | Ghouls |
  | The Devourer's Cult | Dark Cult |

  Return to the Night of the Zealot always uses the replacement sets; `return_cult` joins the cultist deck without replacing anything.

## Open questions

- None. The bookmark's other variant (shuffle the old and new set together and draw a set of the original size) is not offered; the replacement-sets option is the only one (user decision).
