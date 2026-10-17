## Context

- Decks are files (`content/decks/*.json`, `DeckDef`: id, name, investigator, cards with quantities); `validateDeck(db, deck)` returns messages; `scenarioSetup` adds one random basic weakness at campaign start (`campaign.ts`); card data has `type`, `level` (xp), `factionCode`/class, `deckLimit`, `subtype` basicweakness; investigators have deck options (classes, sizes) in `InvestigatorDef`.
- `new-game-flow`'s deck step calls `customDecks()` and shows "Edit" when an editor is registered.
- Only the core pack is loaded today; `all-cycles-ru-content` would widen the pool without code changes.
- In-force ADRs: 0001–0005; none constrains this.

## Goals / Non-Goals

**Goals:**
- A bounded editor: swap limit, pool from data, validation reused.
- Custom decks as plain `DeckDef`s in local storage; the rest of the game sees them as decks.

**Non-Goals:**
- XP and upgrades; levels above 0; import; cloud sync.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
+-------------------------------------------------------------------------------+
| Browser app                                                                   |
|  content db: decks, cards (type, level, class, deckLimit, weaknesses), invs   |
|            |                                                                  |
|            v                                                                  |
|  +------------------------+  pool, limits   +-----------------------------+   |
|  | decks.ts (pure)        |---------------->| DeckEditor (wizard step)    |   |
|  |  poolFor(inv)          |                 |  grouped list, chips, +/−,  |   |
|  |  applySwaps(deck, ops) |<----------------|  weakness picker, messages, |   |
|  |  swapBudget(deck, ops) |  ops            |  Save (disabled if invalid) |   |
|  |  customDecks() / save  |                 +-----------------------------+   |
|  |  /rename / delete      |                                                   |
|  +-----------+------------+                                                   |
|              | DeckDef[]  (local storage ah:decks)                            |
|              v                                                                |
|  new-game-flow DecksStep: starter + custom decks; scenarioSetup: weakness     |
+-------------------------------------------------------------------------------+
```

## Decisions

### 1. Edits as ops over the starter deck
A custom deck stores its base deck id and a list of ops (`remove code`, `add code`, `weakness code`) plus the resolved `DeckDef`; the resolved deck is what validation and the game use, the ops are what the editor edits and what the 5-removal budget counts. Alternative: store only the resolved deck; rejected, the budget would be unrecoverable after a reload.

### 2. Pool from data
`poolFor(inv)`: cards with `level === 0`, class in the investigator's deck options or neutral, type asset/event/skill, not a signature or weakness, from loaded packs; the deck's own cards included so copies can be restored. Validation decides the rest.

### 3. Storage
`ah:decks` holds `{ id: "custom:<uuid>", name, investigator, base, ops, cards }[]` through `safeStorage()`; `customDecks()` validates each against the loaded packs and marks invalid ones with the reason.

### 4. Weakness choice flows through `GameSetup`
`GameSetup.investigators[].weakness?: code`; `scenarioSetup` uses it instead of drawing a random basic weakness. A small engine-adjacent change in `campaign.ts`, covered by `campaign.test.ts`.

## Risks / Trade-offs

- [Pool is thin with the core set alone] -> the editor says how many cards the pool has; `all-cycles-ru-content` widens it by data.
- [Validation messages are engine strings] -> a `deck.*` string per validation reason, mapped by a code the validator already returns (or added).
- [Glance chips depend on another change] -> the list shows cost and copies always; chips when `glance.ts` exists.

## Migration Plan

Additive; no existing decks change. Rollback: git; saved custom decks are ignored by older builds.

## Open Questions

- Whether a custom deck may also replace a signature's copies count (some investigators have optional signatures). Default: signatures locked.
