## Context

The engine is deterministic. `replay(db, setup, actions)` rebuilds any state from the setup (seed included) and the recorded choices, and the store keeps `actions` and saves them.

The UI animates state changes after the fact:

- `arrivals.ts` diffs each new state against the last one and records where each moved card came from;
- `HandFan` flies draws through the show spot (`flyDraw` in `flights.ts`) without stopping;
- `EventPlayer` and `PhaseTitle` in `Hud.tsx` play log events on timers;
- the chaos draw is `TokenDraw` (by hand) or `TokenPop` in `Reveal.tsx` (automatic).

Players already get a few related tools:

- During their own commit window they can take a committed card back (`un:` options), but not after Done.
- The scenario introduction (`intro.ts`, `IntroOverlay`) shows how to block `store.choose` while an overlay owns the screen, and how to fly a centred card to an HUD slot.

## Goals / Non-Goals

**Goals:**

- Give players time to read drawn and searched cards.
- Make phase changes deliberate.
- Make hits from cards traceable.
- Allow mistakes to be undone without breaking determinism.
- Put the act button where the eye already is.

**Non-Goals:**

- A showcase for other investigators' draws, or for the opening hand or mulligan.
- Undo across hidden information. That would need a different RNG model and would let players fish for better draws.
- A settings toggle for pacing or the showcase. Add one if players ask.
- Animating every possible effect: only damage, horror, resources, clues and actions get streaks.

## Decisions

### 1. The phase pause is an engine step, not a UI hold

At the start of each titled phase, `flow.ts` pushes a `PhasePause` step that asks the lead investigator, with kind `"phase"` and a single option `continue`. It runs only when `setup.pacePhases` is true:

- `scenarioSetup` in the UI sets it;
- the testkit and old saves don't, so existing tests and saves replay unchanged.

The bot picks `continue`.

_Why not a UI hold?_ The engine runs ahead: by the time the "Enemy phase" title shows, the state already holds the attacks and upkeep. A UI hold would mean buffering states, and the table underneath would already show the next phase. That is the "you see the next phase, then the next" symptom. A recorded choice keeps replay exact and lets the title simply be the pending choice.

The UI side:

- `PhaseTitle` renders the persistent title when `pending.kind === "phase"`, with the Continue button and Space/Enter.
- `HandOff` ignores `"phase"` pending choices, so no device hand-off is needed.
- `optionHome` homes the option to the title.
- Unpaced games keep the timed title.

### 2. Undo = replay without the tail, bounded by a reveal counter

`GameState.counters.reveal` is bumped once by `dispatch` when a choice revealed something, judged by comparing the state before and after:

- the RNG moved (shuffles, token draws, random picks);
- a card left any player deck or the encounter deck;
- a `look` event fired;
- the new pending choice shows cards that are still in a deck.

One check after every choice covers every rule path. Bumping in each draw/search helper would miss new effects. A fuzz test asserts that deck, bag and RNG changes always bump it.

The store keeps `undoFloor`: the number of actions at the last point where the counter changed. On each `choose`, if `next.counters.reveal !== prev.counters.reveal`, the floor becomes `actions.length`. `undo()` then:

1. requires `actions.length > undoFloor`, and that the game isn't in setup or the intro;
2. replays `actions.slice(0, -1)`;
3. sets `game`;
4. clears `queue` and `current`.

On load and import, the floor is recomputed once by walking the replay. There is a cheap path for this: compare the counter after each step while replaying.

_Alternatives:_

- Keeping a stack of past states: more memory, and it duplicates `replay`.
- An engine-level "undo point" step: that leaks UI policy into the rules.

Undone actions are simply dropped from the list, so saves contain no undo markers.

The UI must cope with a log that gets shorter:

- `PhaseTitle`'s `seen.n` is clamped;
- the feed derives from `game.log`, so it re-renders;
- `diffArrivals` already handles any prev/next pair (commit → hand animates as a take-back).

### 3. Showcase is a hold on the arrivals pipeline

A new `showcase` slice in `view.ts` holds `{ ids, mode: "draw" | "pick" }`.

**Draw mode:**

- `HandFan`'s arrival handling sends non-opening `deck → hand` arrivals for the on-screen investigator into the showcase instead of calling `flyDraw`.
- The fan keeps those cards out of the layout, the same way `MulliganRow` hides its picks.
- `Showcase.tsx` flies them from the deck pile rect to centred slots, using `flyGhost`/`centreTransform` like `IntroOverlay`.
- On dismiss, the cards are released to the fan through `noteLocalMove`, so they fly from their showcase rects.

Choices are blocked while the slice is set: `store.choose` checks it, as it does for the intro.

**Pick mode** is derived, not stored:

- Pick mode applies when `pending.inv` is on screen, the pending choice is a generic pick, and every card option's card is in that investigator's `deck` or `discard`.
- `optionHome` returns `"showcase"` for those options.
- Clicking a card calls `choose`. The resulting `deck → hand` arrival is tagged so the fan flies it from the showcase rect, using the existing `rememberRect`/`last` origin path in `originRect`, without stopping again.

### 4. Hit streaks from `data.source`

The engine adds `data.source` to `damage`, `assetDamage`, resource-loss and clues-dropped events.

`HitFx` (in `Floats.tsx`) plays the hits as plain DOM elements over everything:

- **Pulse:** a red glowing frame laid over the source's screen box. The box is an HTML `[data-card]` if one is shown (strip, panel, resolve spot); otherwise it is the map card's projected rect from the existing `mapProjector`, which works outside dev.
- **Streak:** flies from the source to the portrait (stat bar, `.inv-token[data-inv]`, or the map mini), and the target then flashes.

This means `CardMesh` and the 3D scene need no changes.

**Timing:**

- A sourced `damage` event waits for the table to settle, like a chaos draw (`waitsForSettle` in the event player). The streak then plays, and the event's floating numbers start once it has landed (`EventFx` waits for the same settle plus the streak).
- Losses that aren't animated events play from the log after a settle. One effect's hits play together, and different effects play about 550 ms apart.

### 5. Chaos bag entrance

- `TokenDraw` starts with the bag at the `#chaos-bag` rect and animates it to the centre (WAAPI, 450 ms). The circles render after `finished`. After the pick, the bag animates back.
- `TokenPop` gains a small bag ghost that scales out of the button before the token leaves it.

### 6. Buttons on the act card

- `ScenarioPanel` wraps each `MiniCard` for the act and agenda and renders `OptionButtons` (from `Modals.tsx`) absolutely over its lower part, with `stopPropagation` so the card's click still opens the viewer.
- `DeckViewer` moves `OptionButtons` into the current `dv-item`, over its front face.
- `optionHome` homes act/agenda options to `"actCard"` so they don't also appear in the prompt banner.

### 7. Investigate in the rail

`ActionRail`'s button table gets `kind === "investigate"` (intellect icon, `rail.investigate`). The location keeps its click: `optionHome` lists the option for both the rail and the card. The existing `useOptionsByCard` is unaffected, because the rail reads options by kind.

## Risks / Trade-offs

- **[The pause adds a click per phase]:** about 4 clicks a round. → Space/Enter works, and the title is where the eye is. If it proves tedious, a "pace" toggle in settings can set `pacePhases` false for new games.
- **[The showcase blocks the flow on every draw]:** → One click or a key dismisses it. Drawing several cards (upkeep plus effects) batches them into one showcase.
- **[Replay cost on undo]:** a full replay per undo. → Replays are already used on load and take milliseconds for one scenario. If it ever matters, cache the state at `undoFloor`.
- **[Reveal counter coverage]:** a forgotten reveal path would let undo re-roll hidden information. → A fuzz test replays random bot games and asserts that every state change touching deck zones, `chaosBag` or `rng` also bumped the counter.
- **[Showing map card rects for streaks needs the 3D → screen projection outside dev]:** → Promote the existing `__arkhamRects` bookkeeping into a small exported map in `layout.ts`. Do not depend on the dev hook.

## Migration Plan

- Saves without `pacePhases` replay exactly as before.
- New games pace their phases.
- No data migration is needed.

## Open Questions

- None blocking. On one shared device, anyone can physically press the lead investigator's Continue; the button only names who it belongs to.
