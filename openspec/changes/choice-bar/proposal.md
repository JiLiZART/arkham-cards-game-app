## Why

A choice is asked in one corner and answered in another: the question is a sentence top-centre, Done or Pass sits bottom-right on the rail, and the things to tap glow somewhere on the map, in the strip, in the hand or on the portrait, among everything else that isn't an option. The wording is the engine's ("assign damage 1", "commit cards to your intellect test") rather than an instruction. For a targeted question the player has to find the glow. Card games put the instruction and its confirm button together and make the legal targets the only bright things on screen.

## What Changes

- **Instruction bar.** The prompt banner becomes an instruction bar: the deciding investigator's portrait, a plain-words instruction with a verb and a target ("Tap a card to commit, then Done"), and the choice's primary options as buttons in the bar itself: Done, Pass, Keep hand, Redraw, Take nothing, Resign, End turn. The rail keeps only the actions that stand for something to do: Draw, Resource, Investigate.
- **Plain instructions.** Every prompt key gets an instruction string in English and Russian written for someone who has never played: what to tap and what happens then. The prompt's own sentence stays for the Journal and as the fallback.
- **Choice spotlight.** When the choice is about particular things (a target, cards to commit, where to assign damage, which card to discard, where an enemy spawns), everything that isn't an option dims: the map through the dim plane, the strip, the hand and the portraits through a dimmed class. The options stay bright and outlined. Choosing an action on your turn and the phase pause dim nothing.
- **One slot for "what".** While events play the bar shows nothing of its own (the step caption from `phase-director` takes the slot when that change is in); when a choice is pending it shows the instruction. The top-centre always says either what is happening or what to do.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: adds the instruction bar and the choice spotlight.

## Impact

- `src/ui/hud/ActionRail.tsx`: `PromptBanner` becomes `InstructionBar` with the primary buttons; `ActionRail` filters to the action buttons; `railItem` tells primary from action.
- `src/ui/feed.ts` (`promptParts`) or a new `src/ui/instruction.ts`: instruction text per prompt key, with tests.
- `src/ui/optionHome.ts`: a `"bar"` home for primary options.
- `src/ui/view.ts` and `src/ui/spotlight.ts`: the spotlight takes a second source, `spotlightOfChoice(game, viewer)`; events win while playing.
- `src/ui/scene/Table.tsx`, `hud/Panels.tsx`, `hud/HandFan.tsx`, `hud/Stats.tsx`: `dimmed` classes on non-option HTML cards and portraits when a choice spotlight is on.
- `content/i18n/{en,ru}/ui.json`: `instruction.*` strings.
- Depends on `phase-director` only for sharing the slot; it can be built before it.
