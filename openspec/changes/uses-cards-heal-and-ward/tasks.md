## 1. Engine

- [x] 1.1 Trigger `attackDealsDamage`; `AssignDamage` for an enemy attack opens it before assigning (`windowed`); effect `preventDamage { amount, kind }` recording against the window's key, a choice when `either` and both were dealt; the windowed step subtracts it; tests: prevented damage, prevented horror, a choice when both, all prevented assigns nothing, a treachery's damage opens no window, an attack with nothing to answer the window asks nothing new.
- [x] 1.2 Assignment option labels by key (`option.assignDamage` / `option.assignHorror`, `card`, `defeated`), in English and Russian; `optionLabel` and the strip's button render them; tests (an asset at 0 of 1 health reads "(defeated)", one with room doesn't).
- [x] 1.3 `cost.takeDamage` (direct damage on the controller); `heal` with `targetAlly: "atLocation" | "controlled"` offering Ally assets alongside the investigators; schema and validation; tests.
- [ ] 1.4 `ENGINE_VERSION` 3; a test that a version-2 save restarts its scenario with its campaign kept.

## 2. The cards

- [ ] 2.1 Flesh Ward's ability; tests: the spec's scenarios (cancel 1 of 1 damage and 1 horror, choose horror, 3 charges left, exhausted; not offered for a treachery; exhausted it is not offered again).
- [ ] 2.2 The healing cards' abilities and labels (Clarity of Mind ×2, Smoking Pipe, Painkillers, Strange Solution, First Aid 3, Healing Words ×2, Sinha's Medical Kit, Extra Rations, Canteen); a test per card (uses spent, cost paid, the heal landing where printed; First Aid 3 on an Ally; Extra Rations discarded when empty; Healing Words 3 placed point by point).
- [ ] 2.3 `npm run coverage`; the 12 cards work; `docs/campaign-program.md` counts updated for the packs touched.

## 3. Verification

- [ ] 3.1 Browser: Nathaniel Cho with Flesh Ward fights a Ghoul Minion and is attacked: Flesh Ward is offered before assignment, using it leaves 3 charges and cancels the chosen point; then an attack with Flesh Ward exhausted shows "Assign 1 damage to Flesh Ward (defeated)"; in English and Russian; 0 console errors.
- [ ] 3.2 `npm test`, lint, typecheck, build, `check:content` by exit code; `openspec validate uses-cards-heal-and-ward --type change --strict`.
