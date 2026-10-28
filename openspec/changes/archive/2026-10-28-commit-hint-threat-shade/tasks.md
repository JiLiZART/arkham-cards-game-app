## 1. Commit row in the details column

- [x] 1.1 In `src/ui/game/details.ts` add the `commit` variant to `DetailRow` (`icons`, `n`, `note`, `textApplies`) and an optional `dim` on the `text` row; add `commitRow(db, game, id, locale)` returning the row while `game.pending?.kind === "commit"`, an option with `value.commit === id` is pending and `game.skillTest` is live; icons = the tested skill's icons then wild, `n` their sum; `textApplies` = the card's type is `skill`. Comment the Mind over Matter limit.
- [x] 1.2 Add i18n keys in `content/i18n/en/ui.json` and `content/i18n/ru/ui.json`: `card.commit` (row label), `card.commit.icons` ("Not played: only its icons count, its text does not apply"), `card.commit.skill` ("Its text applies while committed").
- [x] 1.3 Tests in `src/ui/game/details.test.ts`: an asset in a fight commit window gets the row with `["combat"]`, `n: 1`, `textApplies: false` and a dimmed text row; a skill card gets `textApplies: true` and bright text; a wild-icon card counts its wilds; a card with no option has no row; outside a commit window no row.
- [x] 1.4 In `src/ui/hud/HandDetails/HandDetails.tsx` insert the row after the name (after `blockedRow` when both exist), render it (label, icons at the column's icon size, "+N" in `hd-num`, the note on its own line) and render the dimmed text row with a class from `HandDetails.module.css`.

## 2. Instruction wording

- [x] 2.1 Reword `instruction.commit` and `instruction.commitOther` in both locales to say the card's icons are added to the {skill} test, then Done.
- [x] 2.2 Update any test or snapshot that asserts the old instruction text (`grep -rn "commit it to the" src`).

## 3. Threat row shade

- [x] 3.1 In `src/ui/hud/PlayStrip/PlayStrip.module.css` add a shade under `.threats` after the hand fan's recipe (vertical gradient from the top, side fade by `mask-image`, negative inset, `z-index: -1`, no pointer), making sure the row's `overflow-x: auto` does not clip it (wrapper or inner scroll track per design decision 5).
- [ ] 3.2 Check in the browser on a dev server on port 5174 at 1920×1080 and 1366×768: an engaged enemy over a location reads on the shade, the shade slides aside with the row during a token draw, no shade with an empty row, the phone layout unchanged; save screenshots under `.playwright-mcp/`.

## 4. Checks

- [x] 4.1 `pnpm lint:fix`, `pnpm format:fix`, `pnpm typecheck`, `pnpm test`, `pnpm check:content`.
- [x] 4.2 `openspec validate commit-hint-threat-shade --type change --strict`.
