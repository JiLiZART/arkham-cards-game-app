## Why

The Path to Carcosa is a generated campaign (ADR-0007): its 8 scenarios set up from an approximated import, play with placeholder token tables, have no scenario scripts, and 37 of their 302 cards work (fewer in truth: Echoes of the Past and A Phantom of Truth count 16 core Midnight Masks cards they never use). Every generated setup is wrong somewhere (missing locations, missing set-aside cards, no random versions, log-dependent branches dropped), connections are `[]` or a grid guess, and five scenarios end with nothing when no resolution is reached. Once the foundations land (`campaign-flow-compiler-fixes` for the play order, interludes and epilogue; `scenario-import-fixes` for the Midnight Masks subset and setup-card coverage; `engine-scenario-structure`, `engine-generic-keywords` and `engine-location-instances-grid` for dual agendas, flips, Hidden and the catacombs grid), the campaign can be finished in one change, as `docs/campaign-program.md` lists it.

## What Changes

- **The campaign becomes hand-kept.** `content/campaigns-generated/the-path-to-carcosa/` moves to `content/campaigns/the-path-to-carcosa/` (`generated` dropped, as the program's step 7), with a `scripts/` folder like Night of the Zealot's. The import never overwrites it again.
- **Every scenario plays to its resolutions**, in play order: Curtain Call, The Last King, Echoes of the Past, The Unspeakable Oath, A Phantom of Truth, The Pallid Mask, Black Stars Rise, Dim Carcosa. Each gets the guide's setup (locations by floor and by random pick, set-aside piles, Bystanders with clues, the Catacombs deck, Flood or Vortex, the start location by log), its real token table for all four difficulties, a scenario script `scripts/<scenario-id>.ts`, printed connections, and a `none` route (Echoes → R4, Black Stars Rise → R3, Dim Carcosa → R4/R5 by Conviction and Doubt, The Last King by resigned or defeated, The Unspeakable Oath's insanity and R1).
- **Every encounter card of `ptc`, `eotp`, `tuo`, `apot`, `tpm`, `bsr` and `dca` works** (252 cards; 3 today): data in `content/packs/ptc/cards.json`, scripts in `content/packs/ptc/scripts/<code>.ts` for cards the vocabulary can't express.
- **Vocabulary the cycle needs and no foundation change owns**: token X sources (`horrorOnYou`, `shroudOfYourLocation`, `baseShroudOfYourLocation`, `highestDoomOnEnemy`, `doomOnEnemies`, `highestDoomOnAgenda`, `doomOnAgendas`, `distanceFromStart`) with a cap; token results `cancelCommittedSkills`, `moveEnemies` toward the nearest investigator, `loseResources` by the amount failed, `enemyAttacksYou`, `placeDoom` on each agenda, "automatically fail instead", `loseActions`, a clue from the bank; Parley with costs and a `parleyed` window; clues on enemies and assets, and taking control of them; a cost modifier while at a location; a flat clue cost to enter; an enemy at no location; damage only from named sources; spawn from the victory display; how an act advanced; remembered scenario flags; a Doubt/Conviction compare for scripts and the flow.
- **Flow gaps closed by the scenario recording what it knows** instead of asking: which act 2 Curtain Call played, Last King's clues on the act and its interviewed and slain VIPs, Sebastien in the victory display, Daniel's fate, The Pallid Mask's Conviction or Doubt, each possessed investigator. "Remove all" tokens removes all; the scenario files' duplicated token adds go.
- `ENGINE_VERSION` bump: scenarios in progress restart, campaign logs kept.

Not here: Return to The Path to Carcosa (`campaign-return-to-the-path-to-carcosa`), Enthralling Encore (`campaign-side-enthralling-encore`), the player cards and investigators of these packs (`player-cards-ptc`), Hidden (`engine-generic-keywords`), two agenda decks, flips and swaps, cards beneath cards, the horror-defeat replacement (`engine-scenario-structure`), the catacombs grid (`engine-location-instances-grid`), the Midnight Masks subset and setup-card coverage (`scenario-import-fixes`), the play order (`campaign-flow-compiler-fixes`), locales (`i18n-all-locales`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-play`: The Path to Carcosa is playable start to end: each scenario's setup, tokens, connections, resolutions and no-resolution route; the flow's questions answered by the scenarios.
- `game-engine`: Parley with costs and a window after it; clues on enemies and assets; a location-keyed cost modifier; a flat clue cost to enter; an enemy at no location; damage restricted to named sources; token X sources and results the reference cards need; how an act advanced; remembered flags.
- `card-content`: the encounter cards of the seven packs declared; the vocabulary additions; the `logCompare` flow condition.

## Impact

- `content/campaigns/the-path-to-carcosa/` (moved; `campaign.json`, `flow.json`, 8 scenario files, 8 scenario scripts), `content/packs/ptc/cards.json` and `content/packs/ptc/scripts/`, `content/i18n/{en,ru}/ui.json` (prompt and ability labels), `content/coverage.json`, `docs/campaign-program.md` (rows `ptc`, `eotp`, `tuo`, `apot`, `tpm`, `bsr`, `dca` ticked).
- `src/content/schema.ts` (token X sources and results, costs, conditions, ops), `src/engine/effects/` (new ops), `src/engine/rules/round.ts` (parley costs and window), `src/engine/rules/enemies.ts` (clues on enemies, damage sources, no location), `src/engine/rules/investigators.ts` (`enterCost` flat variant, location cost modifier), `src/engine/rules/scenario.ts` (act-advance cause, remembered flags), `src/engine/rules/tokens.ts`, `src/engine/queries.ts`, `src/engine/campaign/flow.ts` (`logCompare`, `removeAllChaosTokens`, split XP), `src/engine/api.ts` (verbs the scripts use), `src/engine/index.ts` (`ENGINE_VERSION`).
- Depends on: `campaign-flow-compiler-fixes`, `scenario-import-fixes`, `engine-scenario-structure`, `engine-generic-keywords`, `engine-location-instances-grid`. Followed by `campaign-return-to-the-path-to-carcosa` and `player-cards-ptc`.
