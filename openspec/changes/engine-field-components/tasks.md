## 1. Baseline

- [x] 1.1 Record the corpus checksum and the corpus replay time on the current engine (three runs, engine replay only) as the before figures for the budget (1.25x).

## 2. Field tables and the card view (behind `records.ts`)

- [x] 2.1 Types: `World.tables` gains a table per card field (`zone` holding every card, the others default-free) and the `card` table's record becomes the identity (`id`, `code`); `CardInst` stays as the view's type. Tests first in `store.test.ts`.
- [x] 2.2 `cardViewIn`: a getter and setter per field over the tables (absent = default; writing the default deletes the entry), cached per identity record and world; `cardRec*`, `allCardRecs*` return it. Tests first: a held view shows a later write; healing all damage leaves no entry; a spread view is a plain object with every field.
- [x] 2.3 `createCard`, `patchedState`, `withCardsIn` and a `putCardIn` test helper onto the tables; tests that assign whole card records use them. Typecheck clean; full test suite green.

## 3. Fields out of the record, one group at a time

- [x] 3.1 Tokens (`damage`, `horror`, `clues`, `doom`, `uses`, `resources`) read and written through their tables only; corpus replays unchanged.
- [x] 3.2 State (`exhausted`, `revealed`); corpus replays unchanged.
- [x] 3.3 Placement (`location`, `engagedWith`, `attachedTo`); corpus replays unchanged.
- [x] 3.4 `owner`, `controller` and `zone` (pile bookkeeping reads the zone table); corpus replays unchanged. Replay time measured against the budget; over it, stop and report with a profile.

## 4. Entity flag families onto tables

- [x] 4.1 `flags.ts` renders the moved families back as `prefix:id` keys for the snapshot (`flagsForSnapshot`); `snapshotOf` uses it and reads cards through the views. Test first: the snapshot of a state with each family set equals its phase-2 form.
- [x] 4.2 The card families (`noReady`, `surge`, `dying`, `costMod`, `beneath`) store in tables; test that an enemy that doesn't ready is in the table and not in `flags`; corpus replays unchanged.
- [x] 4.3 The investigator families (`aside`, `xp`, `hunch`, `hunchRevealed`) and the pair families (`attacked`, `noAttack`, keyed `enemy:investigator`) store in tables; corpus replays unchanged.

## 5. Versions and saves

- [x] 5.1 `ENGINE_VERSION` 7; `replaysSave` accepts 5, 6 and 7. Tests first in `store.test.ts`: a version-6 save resumes the same game; a version-4 save still restarts.

## 6. Verification

- [x] 6.1 Every recording reproduces its snapshot and event log; corpus checksum unchanged from 1.1; replay time before and after in the summary.
- [x] 6.2 Browser pass (desktop and phone): the table, piles, a skill test with a commit, an enemy taking damage, a reload of a save.
- [x] 6.3 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm check:content`, `pnpm format` (on the files this change touches only), `openspec validate engine-field-components --type change --strict`.
