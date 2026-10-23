## Context

- `PromptBanner` renders `promptParts(p, game, db, locale)` from the pending choice's `promptKey` and `promptVars`; the engine's English `prompt` is the fallback.
- `optionHome` decides where each option is offered; `onRail` sends the no-card options and Investigate to `ActionRail`. `railItem` already distinguishes `primary` (End turn, Done, Pass, Redraw, Keep) from the action buttons.
- The event spotlight (`view.spotlight`, `DimPlane`, `CardMesh.spotlit`, `.mini.dimmed`) dims the map around an event's cards and investigators.
- `useCardClick().byCard` maps card ids to their options; the fan, strip, portrait and map all read it to glow.

## Goals / Non-Goals

**Goals:**

- One component owns the question and its confirm buttons.
- Instructions are data (strings per prompt key), not code.
- The choice spotlight reuses the event spotlight end to end.

**Non-Goals:**

- Rewriting the engine's prompt sentences or keys.
- Captions for automated steps (phase-director). The bar leaves the slot empty while events play.
- Coach marks and tips (first-game-tutorial). The bar's instruction is the same every time; tips add the one-time explanation.

## Decisions

### 1. Primary options move into the bar through `optionHome`

`optionHome` returns `"bar"` for options that `railItem` marks `primary`. `ActionRail` keeps `rail` homes only, so it shows Draw, Resource and Investigate. `InstructionBar` renders the `bar` options with their existing `railItem` labels and symbols. The rail's `busy` dimming applies to the bar's buttons too.

_Alternative:_ End turn stays on the rail as a fixed spot, like a CCG's end-turn button. Rejected for consistency: one place to confirm, and the rail becomes "things to do" only. If the mobile layout later wants End turn by the thumb, the bar moves, not the rule.

### 2. Instructions are `instruction.<promptKey>` strings

`instructionParts(p, game, db, locale)` in `src/ui/instruction.ts` looks up `instruction.<promptKey>` with the same `promptVars` substitution and sentence parts as `promptParts`, falling back to `promptParts` and then to the engine's sentence. Each key in `prompt.*` gets an `instruction.*` sibling in `en` and `ru`; `check:content` verifies both locales have the same keys. Tested in `instruction.test.ts` for substitution and the two fallbacks.

### 3. Choice spotlight is a second spotlight source

`spotlightOfChoice(game, viewer)` returns `{ cards, invs } | null`: null for `turn`, `mulligan`, `phase` and deck picks; otherwise the option cards (map cards, strip cards, hand cards) and the option investigators. `view.spotlight` is set from the event spotlight while `playing`, else from the choice spotlight once the stage is empty and no event is queued. `DimPlane` and `CardMesh` need no change. HTML cards get `dimmed` when a spotlight is on and they aren't in it: `MiniCard` (strip, act, agenda, piles), the fan's cards, `StatBar`'s portrait and the `InvToken`s. One `useDimmed(id | inv)` hook reads the spotlight.

_Why the same `spotlight` field:_ the dim plane's easing and the lift already work; two fields would mean two dims.

### 4. The bar and the caption share one slot

`InstructionBar` renders in the centre column where `PromptBanner` was. It renders nothing while `busy` (events playing or queued). `StepCaption` from phase-director renders in the same column and is empty when a choice is pending, so they never show together.

## Risks / Trade-offs

- **Everything dims too often.** Target choices are frequent inside a turn (commit, assign). The dim is 150 ms in and out and the options are the only bright things, which is the point; if it feels heavy, lower the plane's opacity for choices (0.35 vs 0.55 for events).
- **Instruction strings drift from the prompts.** `check:content` enforces key parity, not meaning. The tutorial change reviews the wording once more.
- **Commit spotlight dims cards the player may still want to read.** Dimmed hand cards remain hoverable and readable; dim is brightness, not opacity.
- **End turn moving off the rail** changes a habit for current players. One-time; the README notes it.

## As built

- **Decision 1:** the bar takes every option of no card except Draw, Resource and Investigate, not only those `railItem` marks primary, so Take nothing, Resign and a card script's unnamed choices answer in the bar too, as the spec lists. `railItem` is unchanged; one `OptionButton` renders both the bar's and the rail's buttons.
- **Decision 2:** `instructionParts` reuses `promptParts` with an `"instruction"` prefix. `check:content` now fails when a locale lacks a `prompt.*` key or its `instruction.*` sibling, and the feed test checks their placeholders match between English and Russian. The turn instruction leaves out "then End turn" because the button sits beside it and the longer sentence wrapped.
- **Decision 3:** `spotlightNow(game, viewer, playing, idle)` picks the source: the playing event's spotlight (even when it lights nothing), else the choice's once nothing plays, waits or holds the stage. A commit's spotlight also keeps the tested location or enemy and the tester bright. Choice spotlights carry `choice: true`, and only they dim the HUD's cards and portraits; an event's still dims the map alone, so short events don't flash the whole screen. Like the map's dim, the HUD dim is off under reduced motion.
