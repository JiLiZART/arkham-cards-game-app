## Why

Phase 1 of the move to an entity component store (ADR-0021, archived change `engine-replay-oracle-and-seam`) put scripts behind `src/engine/api.ts` and moved counter, pile and flag writes into the core. The store swap of phase 2 still can't happen, because the shape of the state leaks in three places:

- engine modules use `g.s.*` directly 230 times (`cards` 42, `lead` 25, `phase` 14, `encounterDeck` 12, …);
- engine modules and scripts write fields through the card and investigator objects 111 times (`c.exhausted = true`, `e.engagedWith = who`, `me.location = loc`, `me.actionsLeft--`);
- 44 UI and online-play files read `game.cards[id]`, `game.invs[i]` and `Object.values(game.cards)` (about 217 field reads), all read-only.

Each would break when the state stops being one plain object with `cards` and `invs` records.

## What Changes

- **Read views.** `card(g, id)` and `inv(g, id)` (and `cardIf`, `invIf`, `allCards`, `cardsIn` and the other queries) return `Readonly` views. Reading `card(g, id).zone` stays as it is; writing through it is a type error everywhere. In phase 2 the store builds these views from its components, so the ~880 field reads in engine modules, scripts and the UI don't change (ADR-0022).
- **Field setters.** Every write to a card or investigator field outside the core goes through a named core function: the counters already do; new ones cover exhausting and readying, revealing, location and engagement, control and attachment, and the investigator's action counts, status and trauma. The 111 object writes move to them.
- **The core owns the state.** Only the core modules (`core.ts`, `flags.ts`, `engine.ts` for the queue, the pending choice and setup, `rules/skillTest.ts` for the test) touch `g.s`. The other engine modules move their 230 uses to accessors (most exist since phase 1: `currentAct`, `leadInvestigator`, `pile`, `currentTest`, …). The lint rule that refuses `g.s` in scripts extends to every engine module but the core.
- **State lookups for the UI.** `src/ui` and `src/net` read cards and investigators through functions over a state (`cardOf(state, id)`, `invOf(state, i)`, `cardsOf(state)`), not `game.cards` / `game.invs`; the lint rule refuses those two properties there.
- No behaviour change: every recorded game replays unchanged, and `ENGINE_VERSION` and the save format stay.

Decided with the user for phase 2 (recorded here, decided in that change's ADR): ordered piles stay as ordered id arrays, kept as indexes beside a `zone` component, `moveCard` their single writer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-engine`: "Scripts use the engine API" widens to every engine module but the core and to the UI; a new requirement makes card and investigator lookups read-only views.

## Impact

- `src/engine/core.ts` (readonly views, field setters, state lookups), `src/engine/types.ts`, every engine module under `src/engine/` and `src/engine/rules/` but `rules/skillTest.ts`, 51 object writes in `content/**/scripts`.
- 44 files in `src/ui` and `src/net` (reads only), and their tests where they build state.
- `.oxlintrc.json`: `g.s` refused outside the core; `game.cards` / `game.invs` refused in `src/ui` and `src/net`.
- New ADR-0022 for the read-view decision. No save, format or online-play change.
