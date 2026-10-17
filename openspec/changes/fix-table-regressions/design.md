## Context

Six regressions and one rules gap were found playing the table after the last five changes. Each was reproduced or located in the code:

- **Stat bar.** `02ea428` (player-bar) removed `StatBar` from `Hud.tsx` and the right-edge tokens; the component body (`StatBody`) survived for the avatar sheet. `STAT_BAR_W` (420) is still what the fan's width is computed from.
- **Hand count.** `HandCount` draws `Glyph name="card"`. `Glyph` renders the symbol's name as text when `hasSymbol()` is false, so a page whose sprite lacks `card` shows the word in the 38 px token-row font. The user sees the word even after a hard reload, so the cause is not only a stale sprite; the fix removes the dependency instead of chasing it.
- **Clue and resource art.** `537e529` (svg-icons) deleted the five token PNGs, `tokenStack.ts` and the stacked `TokenPile`, and mapped `clue`/`resource` to the sprite. The user wants the cardboard art back everywhere.
- **Skill-test soft lock.** `players.ts` `canAct()` treats any commit window whose decider is not the active investigator as a help window: the view lands on the active investigator, the avatar pulses, and `choicesOffered()` is false. The instruction bar then prints the decider's instruction ("Daisy Walker: tap a card to help Roland…, then Done") with no buttons. Reproduced with a Rotting Remains revelation for Roland while Daisy at his location had a committable card: the same happens, worse, for Daisy's *own* treachery test in the mythos phase, where no hand-off is intended at all.
- **Flashlight.** `payCost()` in `cards.ts` discards a card at 0 uses only when its data says `discardWhenEmpty` (First Aid, Forbidden Knowledge). Flashlight, .45 Automatic and Shrivelling stay in play with nothing to do.
- **Abandon.** `Title.tsx` computes `hasSave` once (`useMemo(…, [])`); the title stays mounted across `abandon()`, so Continue remains and `resume()` returns false with no save. Reproduced in the browser.

Constraints: the in-force ADRs are 0001 to 0006 (none superseded). ADR-0003 (one generated sprite) keeps PNG art for cardboard tokens the icon set does not draw; ADR-0004 (viewing is view state) governs the hand-off; ADR-0005 (one layout mode) governs how the dock hides on phones; ADR-0002 (presentation follows the clock) is untouched. The engine stays pure, deterministic and replayable; no save format change.

## Goals / Non-Goals

**Goals:**
- Every reported regression fixed with a test that fails first, and a browser check per screen.
- The stat bar back at 75 % with the token row and hand count; the player bar and sheet unchanged.
- No bar, screen or title state where the player is told to do something without a control that does it.

**Non-Goals:**
- Redesigning the player bar or the hand-off (ADR-0004 stays).
- Returning the chaos bag or any other icon to PNG; only clues and resources.
- Phone layout work (the phone-landscape change owns it); here the dock is only hidden in the phone mode.
- A general "discard" action for the player.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
 ┌──────────────────────────── browser app (React + zustand) ────────────────────────────┐
 │                                                                                        │
 │  src/engine (pure)                      src/ui                                         │
 │  ┌──────────────────────┐   actions     ┌────────────────────┐   shownInv/canAct       │
 │  │ rules/cards.ts       │◀─────────────▶│ store.ts (gameStore)│◀──────┐                │
 │  │  payCost → +Step     │               │ abandon/resume     │       │                 │
 │  │  "DiscardIfEmpty"    │               └─────────┬──────────┘  ┌────┴──────────────┐  │
 │  │ rules/skillTest.ts   │                         │ game        │ players.ts (pure) │  │
 │  │  (unchanged)         │                         ▼             │ canAct: help or   │  │
 │  └──────────────────────┘               ┌────────────────────┐  │ reaction only     │  │
 │                                         │ hud/Hud.tsx        │  │ landingView       │  │
 │  assets                                 │  ├ PlayerBar (as is)│  └───────────────────┘  │
 │  ┌──────────────────────┐   <img>       │  ├ InstructionBar  │   "X can act" + button  │
 │  │ public/icons/*.png   │◀──────────────│  ├ StatBar (back)  │   zoom .75, token row   │
 │  │  clue, clue-3,       │               │  │  └ StatBody      │                         │
 │  │  resource, -3, -5    │               │  │     ├ TokenPile  │   stacks 5/3/1, 3/1     │
 │  │ public/icons/sprite  │◀──<use>───────│  │     └ HandCount  │   card back + number    │
 │  │ public/table/back-   │◀──<img>───────│  └ SkillTestScreen │   (unchanged)           │
 │  │   player.png         │               └────────────────────┘                         │
 │  └──────────────────────┘               ┌────────────────────┐                         │
 │                                         │ menu/Title.tsx     │   hasSave per render    │
 │                                         └────────────────────┘                         │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

- Boundaries: the engine stays ignorant of presentation; the only engine change is a trailing discard step. Everything else is UI or assets.
- `players.ts` keeps the pure `(game, view)` model of ADR-0004; only the predicate for "help" narrows.
- The hand count reads a table asset the app already ships (`backUrl("player")`), not the sprite.

## Decisions

### 1. The stat bar returns as the old component, scaled with `zoom`
Restore `StatBar` in `Stats.tsx` from `02ea428^` and mount it in `Hud.tsx` again, reading `useShown()` (ADR-0004: the investigator on screen, not `viewerOf`). Shrink with one CSS rule, `.stat-dock { zoom: 0.75 }`, and set `STAT_BAR_W = 315` so the fan's width and left edge follow. `zoom` is standard in every current browser and keeps hit testing and `getBoundingClientRect` right, unlike `transform: scale`, and avoids retyping a dozen pixel sizes. Investigator-card options stay on the avatars and the sheet (player-bar's decision); the dock's portrait opens the card modal as before. In the phone layout mode (ADR-0005) the dock is not rendered. Alternative rejected: a new compact component (more code, two sources of truth with the sheet).

### 2. The hand count is a card-back image
`HandCount` renders `<img src={backUrl("player")}>` at 40 px tall (its own aspect) followed by the number, in both the dock and the sheet. No sprite symbol, no `Glyph`, so no text fallback can appear. Alternative rejected: diagnosing the user's sprite first; the image is also the more "cardboard" look the user asked for.

### 3. Clue and resource art restored from git, stacks included
`git checkout 537e529^ -- public/icons/{clue,clue-3,resource,resource-3,resource-5}.png src/ui/hud/tokenStack.ts src/ui/hud/tokenStack.test.ts`, then `icons.ts` maps `clue`, `resource` and the stacked names to `{ png }` again and `TokenPile` stacks as before (fewest tokens, overlapping). Because every caller goes through `Icon`, the rail, feed, glance chips, details and location piles switch with no change of their own. `extract-assets.sh` gets its five map lines back so a re-run keeps them. `icons.test.ts` and `check:content` expectations are updated to the new split (the sprite still has `clue`/`resource` symbols; they are simply unused). The chaos bag stays in the sprite. This narrows ADR-0003's PNG exception to "cardboard tokens", which clues and resources are; the ADR's decision (one sprite for drawn icons) stands, so no superseding ADR.

### 4. A help window is a commit to someone else's test
`canAct()` returns a commit entry only when `game.skillTest` exists and `game.skillTest.inv !== p.inv`; reactions as before. For the decider's own test `canAct` is null, so `landingView` is null, the view switches to the decider as for any decision, and the existing privacy hand-off box covers private hands. Tests in `players.test.ts` cover the three cases (own test, help, reaction).

### 5. The instruction bar never shows an instruction without a control
In `InstructionBar`, when `!offered` and `canAct(game)` names someone, render the can-act label (`players.canCommit` / `players.mayReact`, already translated for the avatar) and one button that does what the avatar tap does (`useView.getState().setViewing(null)`). The avatar keeps pulsing; the bar gives the second, obvious way out. Alternative rejected: offering Done from the wrong table (breaks ADR-0004's "choices offered only on the decider's table").

### 6. Empty uses discard as a trailing engine step
Replace the immediate discard in `payCost` with a step pushed after the ability's effects: `{ t: "DiscardIfEmpty", card }` (handled in `cards.ts`), which discards when `uses <= 0` and either `discardWhenEmpty` or `allAbilitiesSpendUses(def)` (every non-constant ability has `cost.uses > 0` and there is no constant ability). Trailing, so Flashlight's investigation sees its own modifier; a step, so replay and undo are untouched. Engine tests: Flashlight's last supply, .45 Automatic with ammo left, a synthetic def with a constant ability, undo. The rules deviation is recorded in the spec and the README.

### 7. The title reads the save on every render
Drop the memo: `const hasSave = !!safeStorage().getItem(SAVE_KEY)` per render (one `localStorage` read when the title shows is nothing). Continue renders only when `game || campaign || hasSave`. The abandon handler already clears the store and the key.

## Risks / Trade-offs

- [`zoom` on a fixed dock interacts with flights and tips anchored to its elements] → the dock's rects come from `getBoundingClientRect`, which includes zoom; verify a hit streak to the dock's portrait (if any) and the tip anchors in the browser.
- [The dock and the fan compete for the bottom edge at 1280 px wide] → `STAT_BAR_W` 315 gives the fan 105 px more than before player-bar; run the fan scripts.
- [Restored PNGs at 16 px (glance chips) look soft] → they are the same art that was in the rail before; accepted by the user ("everywhere").
- [Automatic discard surprises a player who knows the printed rules] → stated in the README play notes and the feed line ("Flashlight is used up").
- [Narrowing `canAct` changes when the avatar pulses] → `check-players.js` keeps the help-window case; a new script covers the own-test case.
- [Archive order] → the deltas modify requirements that live in unarchived changes; archive svg-icons, skill-test-screen, card-draw-showcase, hand-cards-glance, player-bar and new-game-flow first.

## Migration Plan

Code only; no save or content format change. Deploy as usual. Rollback is a revert of the commit.

## Open Questions

- None blocking. If the user's browser still shows a word for the hand count after decision 2, the cause lies outside the sprite (a cached bundle), to be checked with their console during apply.
