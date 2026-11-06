## Context

After `ui-input-gate`, one function says whether the pending choice can be answered. Which surface offers which option is still spread over five mechanisms:

| Mechanism                                              | Where                                       | Read by                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `optionHome` / `onRail` / `inBar` / `optionOwner`      | `src/ui/game/optionHome.ts`                 | `ActionRail.tsx` (rail, bar), `Investigators.tsx` (invModal), `optionHome.test.ts`                                            |
| `useOptionsByCard` / `useCardClick`                    | `src/ui/game/cardClick.ts`                  | `Table.tsx`, `PlayStrip.tsx`, `ScenarioPanel.tsx`, `HoverCard.tsx`, `PlayerBar.tsx`, `SkillTestScreen.tsx`, `AssetsModal.tsx` |
| `useCardOptions(ids)`                                  | `Modals.tsx:68`                             | card modal, `CardOptions.tsx`, `Stats.tsx`, `Investigators.tsx`, `Hud.tsx` (`PhoneDrawers`)                                   |
| hand-written `options.filter/find(o => o.card === id)` | `HandFan.tsx:80`, `Showcase.tsx:90`, `:119` | the hand, the showcase pick                                                                                                   |
| `investigatorOptions`, `deckOptions`                   | `src/ui/state/players.ts`                   | `PlayerBar.tsx`, `Stats.tsx` (via `abilityOptionsOf`), `PileColumn.tsx`, `Hud.tsx`                                            |

`optionHome` is what the reachability test checks; the by-card maps are what the screen shows. They agree because a card sits in one zone, not because one decides for the other. The rail's kinds and the deck's Draw read `(o.value as { kind?: string }).kind`; the engine types turn options as `TurnAction`.

## Goals / Non-Goals

**Goals:**

- One pure function places every option in a home (plus the few listed mirrors), for a given layout mode.
- Every surface reads its slice of that result; no surface filters `pending.options` by card itself.
- The reachability test checks the placement the screen uses, in both modes.

**Non-Goals:**

- When a choice can be answered (`ui-input-gate`).
- How an option is labelled (`optionText.ts`, `railItem`) or laid out within a surface.
- Typing `ChoiceOption.value` in the engine (open question).
- What the table draws while events play (`ui-presented-table`).

## Decisions

### 1. Before and after (component view of the UI container)

Before:

```
                      game.pending.options
     +--------------+------+-------+-----------+--------------+
     |              |              |           |              |
  optionHome    useOptionsByCard  useCardOptions  filter(card)  investigatorOptions
  onRail/inBar  (cardClick.ts)    (Modals.tsx)    x3            deckOptions
     |              |              |           |              |
  ActionRail     map, strip,     card modal,   HandFan,      PlayerBar, Stats,
  Investigators  panel, hover,   stats, phone  Showcase      PileColumn,
  optionHome     player bar,     drawers,                    PhoneDrawers
  .test.ts  <--  test screen,    inv modal
  (checks this)  assets modal
```

After:

```
  game.pending, looking, mode            useInputGate()   (ui-input-gate)
            |                                  |
            v                                  v
  +----------------------------------+   +-------------------------+
  | placeOptions(game, looking, mode)|-->| usePlacement()          |
  | src/ui/game/optionHome.ts  pure  |   | memo per pending.seq,   |
  | -> Record<OptionHome,            |   | mode, looking; empty    |
  |      { options, byCard }>        |   | homes when gate closed  |
  +----------------------------------+   +------------+------------+
            ^                                         |
  optionHome.test.ts (both modes:          usePlaced(home)
  >=1 rendered home, one card home)                  |
                                                     v
     hand -> HandFan        board -> Table, PlayStrip, AssetsModal
     strip -> ScenarioPanel, PhoneDrawers           skilltest -> SkillTestScreen
     showcase -> Showcase   mulligan -> MulliganRow  phase -> phase title
     avatar -> PlayerBar    sheet -> Stats           invModal -> Investigators
     rail -> ActionRail     bar -> InstructionBar    deck -> PileColumn, PhoneDrawers
     any card home -> card modal, CardOptions, HoverCard (by card id)
```

### 2. The shape

```ts
type OptionHome =
  | "hand"
  | "board"
  | "strip"
  | "avatar"
  | "sheet"
  | "invModal"
  | "rail"
  | "bar"
  | "deck"
  | "skilltest"
  | "mulligan"
  | "phase"
  | "showcase";
interface Slice {
  options: ChoiceOption[];
  byCard: Map<InstId, ChoiceOption[]>;
}
type Placement = Record<OptionHome, Slice>;
function placeOptions(game: GameState, looking: Looking, mode: LayoutMode): Placement;
```

- `optionHome(o, s, viewer)` stays as the per-option primary home; `placeOptions` calls it, splits `avatar` into `avatar` (answers among investigators) and `sheet` (the decider's own ability) as `investigatorOptions` does, and adds the mirrors.
- Mirrors: Investigate in `rail` and `board`; the turn's Draw in `rail` and `deck`; a waiting draw (`pending.kind === "draw"`) in `deck`; on the phone, `rail` and `strip` options also in `bar`. These are the only options in two slices.
- Card-keyed homes (`hand`, `board`, `strip`, `avatar`, `sheet`, `invModal`, `skilltest`, `mulligan`, `showcase`) fill `byCard`; an option is in at most one of them.
- The card modal, `CardOptions` and the hover card take the union of card-keyed `byCard` for the card they show (open question whether they should).
- Rejected: a placement per surface (`handOptions()`, `boardOptions()`…): the "exactly one home" property can't be checked across separate functions.
- Rejected: keep `useOptionsByCard` and drop `optionHome`: the test would then check nothing the screen uses, and the rail/bar split still needs homes.

### 3. Typed rail kinds

`turnAction(o, pending): TurnAction | null` narrows `o.value` when `pending.kind === "turn"`; `RAIL_KINDS` and the Draw mirror use it. No engine change; `TurnAction` is already exported from `src/engine/world/types.ts`.

### 4. The test

`optionHome.test.ts` keeps its three bot playthroughs and runs `placeOptions` for `desktop` and `phone` at each step. For each option: it is in at least one home in the mode's rendered set (`desktop`: every home but phone bar copies; `phone`: every home but `rail`); it is in at most one card-keyed home; a mirror is one of the four listed. The existing zone checks per home stay.

## Risks / Trade-offs

- [A surface relied on a by-card lookup across homes (the hover card shows a hand card's options)] -> the union lookup keeps it; the test lists which homes it unions.
- [Memoising on `pending.seq` misses a change in `looking` or `mode`] -> the memo key includes both; a test switches `viewing` and checks the slices change.
- [More surfaces depend on one module] -> it is pure and covered by the playthrough test; a surface change that needs a new home changes the test first.

## Migration Plan

No saved data changes. Add `placeOptions` and its test beside `optionHome`, switch surfaces one at a time (each switch removes its local filter), then delete `useOptionsByCard`, `useCardOptions`, `onRail`, `inBar`, `investigatorOptions` and `deckOptions`. Rollback is a revert.

## Open Questions

- Should the card modal and hover card offer options at all?
- Should the phone keep both places for the act's options?
- Should the engine type `ChoiceOption.value` per choice kind?
- Should `phase` and `mulligan` stay homes?

No in-force ADR needs revisiting: ADR-0005 (one layout mode read by components) becomes one mode argument to the placement; ADR-0004 (viewing is view state) is the `looking` argument.
