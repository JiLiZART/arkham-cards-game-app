## 1. Vocabulary

- [ ] 1.1 Failing test first (`src/engine/rules/__tests__/enemies.test.ts`): a non-Elite enemy spawning at a location with flag `cannotSpawnAt` (scope `attachedLocation`) spawns at a chosen connecting location, at the only one without a prompt, and at the location itself when none connects; an Elite enemy spawns there. Then the flag in `src/content/schema.ts` and the check in the spawn step of `src/engine/rules/enemies.ts`.
- [ ] 1.2 Failing test first (`src/engine/effects/__tests__/`): `searchDeck { top: "X" }` in a `skillTestFailed` window offers the top N cards, N the margin failed by, and `top: 3` still offers 3. Then `top` as `Amount` in the schema and `src/engine/effects/search.ts`.

## 2. The cards

- [ ] 2.1 Data in `content/packs/return/cards.json`, a test each through `src/engine/kits/testkit.ts`: 50001, 50003, 50005, 50007, 50009 (the core trainers' abilities: +1 to the printed stat for 1 resource during your test), 50006 Hot Streak (2) (`gainResources 10`), 50004 Barricade (3) (01038's abilities plus `[{flag: cannotSpawnAt, scope: attachedLocation}]`: a spawn at the attached location is redirected, an investigator leaving discards it), 50010 Rabbit's Foot (3) (reaction `skillTestFailed`, margin at least 1, exhaust: `searchDeck {top: "X"}`, draw 1, shuffle).
- [ ] 2.2 `content/packs/return/scripts/50002.ts` (Dynamite Blast (2): `fns: blast.fns` from `core/scripts/01024.ts` as `nat/scripts/60129.ts` does, `aoo: false`; test: no attack of opportunity from an engaged ready enemy, 3 damage at the chosen location) and `50008.ts` (Mind Wipe (3): the core `01068.ts` reaction, its `wipe` calling the core `fns.wipe` after placing `enemyDamage -1` and `enemyHorror -1` until the phase ends; test: a Ghoul Priest's attack deals 1 and 1 and its Retaliate is ignored).
- [ ] 2.3 Labels `ability.<code>.<n>` in `content/i18n/{en,ru}/ui.json` for the two scripted cards and Rabbit's Foot (3); the trainers reuse the core labels' wording.

## 3. Verification

- [ ] 3.1 `ENGINE_VERSION` bump with its restart test.
- [ ] 3.2 `pnpm coverage`: rtnotz player 10 of 10; `docs/campaign-program.md` rtnotz player column at 0 left (encounter column unchanged).
- [ ] 3.3 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm coverage`, `pnpm check:content`, `pnpm test`; `openspec validate player-cards-notz-return --type change --strict`.
