## 1. Data

- [ ] 1.1 `filter.ts` (`matches`, counts, trait and pack lists) with tests, including a Russian search.
- [ ] 1.2 `implemented(db, code)` with tests on core cards (Machete works, a Dunwich card is text only, a vanilla skill works).
- [ ] 1.3 `cardImage` remote fallback for HTML views; the table never uses it; test.

## 2. Screens

- [ ] 2.1 Cards menu item; catalog screen with tabs, loading every pack with progress.
- [ ] 2.2 Filter column (drawer on the phone), result count, paged grid and list view.
- [ ] 2.3 Card page and investigator page with links between cards.

## 3. Verification

- [ ] 3.1 Tests, lint, build, content check; browser checks of the scenarios in English and Russian, desktop and phone; drive-calm to round 3.
- [ ] 3.2 README, ADR-0008; `openspec validate card-catalog --type change --strict`.
