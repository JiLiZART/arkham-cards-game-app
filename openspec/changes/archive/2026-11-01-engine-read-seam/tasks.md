## 1. Views and setters in the core

- [x] 1.1 Readonly views: `card`, `cardIf`, `inv`, `invIf`, `allCards`, `cardsIn`, `enemies`, `locations`, `controlled`, `threatArea`, `engagedWith`, `findByCode` return `Readonly` types (piles `readonly InstId[]`); internal mutable lookups for the core only. Typecheck lists every write through a view.
- [x] 1.2 Named setters for the writes 1.1 lists, tests first: exhaust/ready, reveal, setLocation, setController, attach/detach, investigator actions, status and trauma (only those the writes need).

## 2. Engine modules off the state

- [x] 2.1 `effects.ts` onto views, setters and accessors; corpus green.
- [x] 2.2 `rules/cards.ts`, `rules/enemies.ts`, `rules/investigators.ts`; corpus green.
- [x] 2.3 `rules/flow.ts`, `rules/scenario.ts`, `rules/tokens.ts`, `campaign.ts`, `decks.ts`, `bot.ts`, `upgrade.ts`; corpus green.
- [x] 2.4 Script object writes (51) onto setters; corpus and guard tests green.

## 3. UI and online play

- [x] 3.1 `cardOf(state, id)`, `invOf(state, i)`, `cardsOf(state)` in the core (read views over a state), tests first.
- [x] 3.2 The 44 `src/ui` and `src/net` files onto them; UI-logic tests green; a browser pass over the table, the hand and a skill test.

## 4. Enforcement and verification

- [x] 4.1 `.oxlintrc.json`: `g.s` refused in `src/engine/**` but the core files; `game.cards` / `game.invs` (and `state.*`, `s.*`) refused in `src/ui/**` and `src/net/**`; tests exempt. `pnpm lint` clean.
- [x] 4.2 `pnpm typecheck`, `pnpm lint`, `pnpm test` (corpus included), `pnpm check:content`, `pnpm format`.
- [x] 4.3 `openspec validate engine-read-seam --type change --strict`.
