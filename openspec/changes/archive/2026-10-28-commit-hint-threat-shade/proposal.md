## Why

In a skill test's commit window the hand works as it always does: hovering a card shows its full rules text, and nothing says that tapping it does not play the card. New players commit an asset or event expecting its text to happen, when only its skill icons are added to the test. Separately, on the desktop the viewer's engaged enemies and threat-area cards sit in a row at the top centre of the table, straight over the map, where a location card behind them makes their faces and badges hard to read; the hand fan already solves the same problem with a shade of night under the cards.

## What Changes

- **Commit window says what a card gives.** While a commit window is open on the viewer's table, the details column of a hand card that can be committed leads with a Commit row: the icons of the card that count for this test (the tested skill's icons and its wild icons) and the total they add, "+N". Under it, one line says what happens to the card:
  - an asset or event: it is not played, only its icons count, its text does not apply; its rules-text row is dimmed;
  - a skill card: its text applies while it is committed (Vicious Blow's extra damage, Guts's draw); its text stays bright.
- **The instruction bar says it too.** The commit instruction reads "Tap a card to add its {skill} icons to the test, then Done" (and the helper's version likewise), in both locales.
- **A shade under the threat row.** The desktop threat row (engaged enemies and threat-area cards at the top centre) gets a shade like the hand fan's: a dark gradient from under the top bar fading down into the table, faded at both ends, drawn only while the row has cards, moving and hiding with the row. The phone column is unchanged.
- Not in scope: the engine (what a card contributes is already decided there), the glance badge on fan cards, the commit "+N" on placed cards (already shown), and the "Play area strip" layout requirement. That requirement still describes the threats as a column on the right while the code has had them in a top-centre row since the table rework of 2026-10-15; the open change `asset-area-stacks` keeps that wording. This change adds a requirement for the row's shade and leaves the layout wording to a later sync.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `game-table-ui`: "Hand card details" — in a commit window a committable card's column leads with a Commit row (counting icons, "+N") and a line saying whether the card's text applies; a non-skill card's text is dimmed. "Instruction bar" — the commit instruction names the icons being added. New requirement "Threat row shade" — the desktop threat row has a shade of night under its cards.

## Impact

- `src/ui/game/details.ts`: a new `commit` detail row built from the pending commit options and the live test (`game.skillTest.skill`, the card's `icons`), placed after the name row; the `text` row carries a dimmed flag for non-skill cards.
- `src/ui/hud/HandDetails/HandDetails.tsx` and its CSS Module: render the Commit row (label, icons, "+N", note) and the dimmed text.
- `src/ui/hud/PlayStrip/PlayStrip.module.css`: a `::before` shade on `.threats`, after the hand fan's.
- `content/i18n/en/ui.json`, `content/i18n/ru/ui.json`: the Commit row's label and the two notes, the reworded `instruction.commit` and `instruction.commitOther`.
- Tests: `src/ui/game/details.test.ts` (or beside it) for the row's presence, icons and note by card type; the existing instruction-bar scenario text in the spec changes with the wording.
- No engine change, no new dependency. The engine's option labels ("Commit X (+N)") stay as they are; the UI computes "+N" from the card's icons and the test's skill (the same count as `iconsFor` without Mind over Matter's stand-in, a case this change does not cover).
