## 1. Rules

- [x] 1.1 Generic validator over the full option grammar with plain-word refusals in English and Russian; tests per option kind (Zoey, Carolyn Fern, a trait rule, an exclusion, at least) and the refusal for deck-creation choices (Lola Hayes).
- [x] 1.2 Experience cost of a deck change (pure) with a test per rule: level-0 card, new card, same-title upgrade, Exceptional, Myriad, signatures free.

## 2. Builder

- [x] 2.1 Builder on the catalog list: start from starter, saved or empty deck; "+" or the reason; any card removable; validation as it changes; save; the 5-swap limit removed.
- [x] 2.2 Upgrade mode from the campaign log: experience left, refusals, save updates the campaign's deck and experience; the next scenario uses it.

## 3. Verification

- [x] 3.1 Tests, lint, build, content check; build Zoey from empty, start a campaign with her, upgrade Roland after The Gathering; desktop and phone; drive-calm to round 3.
- [x] 3.2 README; `openspec validate deck-builder --type change --strict`.
