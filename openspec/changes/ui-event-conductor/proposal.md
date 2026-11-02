## Why

ADR-0002 makes every presentation channel follow one clock, but that clock is worked out inside a component no test reaches: `EventPlayer` in `src/ui/hud/Hud/Hud.tsx:88-158` decides when the current event may start (the test key, centre events, the settle wait), whether it waits for a tap, and how long it holds the screen (`DURATION`, `HIT_MS`, `SLOW`, the 1800 ms test result), all as hooks and effects. `src/ui/hud/Hud/` has one test file, `formatText.test.ts`. The pace tables it reads (`ANIMATED`, `HELD`, `TAP`, `holdsForTap`, `needsNext`) sit in `src/ui/state/store.ts:40-90`, away from it.

The stage that orders the middle of the screen (`useView().stage`, `useStage` in `src/ui/state/view.ts:159`) is a list of strings whose prefix says who holds it (`test:`, `event:`, `pause:`, `title:`, `turn:`, `showcase`, `intro`: 7 kinds). "Is the stage free?" is asked inline at 7 sites with 3 different meanings:

- only a skill test holds it: `Hud.tsx:107` (`EventPlayer`), and its negation `captionStageBusy` in `src/ui/game/feed.ts:257`;
- only a skill test or a phase pause holds it: `Hud.tsx:315` (`AutoSwitch`), `InvestigatorChoice.tsx:32`, `TipLayer.tsx:96`;
- nothing holds it: `Floats.tsx:92` (and `whenStageFree`), `Reveal.tsx:181`.

A new overlay that claims the stage has to know every one of these and decide, case by case, which of them it should block. Nothing types the keys, so a typo in a prefix silently frees the stage.

## What Changes

- **A pure conductor.** One function in `src/ui/game/conductor.ts`, `conduct({ current, stage, settledFor, pace, byHand })`, returns `{ playing, waitsForTap, advanceAfterMs }`: whether the current event is on screen now, whether it waits for the player, and after how long it moves on by itself. The timing table (`DURATION`, the hit lead-in, the slow factor, the result hold) and the pace tables (`ANIMATED`, `HELD`, `TAP`, `holdsForTap`, `needsNext`) move beside it; the store's `enqueue` and `heldCards` import `ANIMATED` and `HELD` from there.
- **`EventPlayer` becomes an adapter.** It reads the store, calls `conduct`, writes `view.playing` and the spotlight, and sets one timeout for `advanceAfterMs`. No rule stays in the component.
- **Typed stage claims.** A claim is `{ kind, id }` with `kind` one of the 7 above, built by `stageKey(kind, id)`; `useStage` and `claimStage` take it. The stored list stays strings, so the existing stage tests and the queue behaviour don't change.
- **Named stage predicates.** Three functions in the conductor's module replace the 7 inline checks: `stageFreeForEvents` (only a test holds it), `stageFreeForPrompts` (only a test or a pause: the tip layer, the auto-switch, the investigator choice), and `stageEmpty` (floats, the encounter reveal). `captionStageBusy` becomes `!stageFreeForEvents`.
- **Tests in Node.** A recorded event list from the replay corpus is stepped through `conduct` at each pace, asserting what plays, what waits for a tap, and the hold times the "Pace setting" requirement names.
- No change to what the player sees: same order, same timings, same holds.

Assumed (to confirm with the user in grill-me):

- The conductor is a plain module under `src/ui/game/`, next to `feed.ts` and `arrivals.ts`, not a store slice: it has no state of its own; `current`, `queue` and `pace` stay in the game store, `stage`, `settledFor` and `playing` in the view store (ADR-0004).
- The settle wait (`whenSettled`, the arrivals module) stays an input to `conduct` (`settledFor`), not something it runs.
- `PhaseTitle` and `TurnTitle` keep their own queues of titles; only their claims become typed. Folding the title queues into the conductor is left out.
- The stage stays a FIFO of claims (the "One thing at a time" requirement); only how claims are named and how freedom is asked changes.
- This change lands after or alongside `ui-input-gate`, whose gate reads `stageFreeForPrompts` rather than its own copy of the check, and is independent of `ui-presented-table` and `ui-option-placement`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: "One thing at a time" names the three ways the middle of the screen counts as free and which surfaces wait on each, so they can be tested; "Pace setting" states that each event's hold is decided in one place from the event, the pace and the draw-by-hand setting.

## Impact

- New `src/ui/game/conductor.ts` and `conductor.test.ts`.
- `src/ui/hud/Hud/Hud.tsx` (`EventPlayer`, `AutoSwitch`, the title claims), `src/ui/state/store.ts` (the pace tables move out; re-exported or imports updated), `src/ui/state/view.ts` (`useStage`, `claimStage` take a typed claim).
- The 7 predicate sites above, and the 7 `useStage` callers (`SkillTestScreen`, `Showcase`, `IntroOverlay`, `Hud.tsx` three times).
- No engine change, no save change, no online-play change: every browser runs its own clock today and still will.
- New ADR-0032 refining ADR-0002: the clock is one pure function, and stage claims and predicates are named.

## Open questions

1. Should the title queues of `PhaseTitle` and `TurnTitle` (which read `game.log` and wait for `whenSettled`) move into the conductor too, so the whole presentation timeline is one tested function, or stay in their components as assumed?
2. Is the difference between "free for events" (a pause blocks events) and "free for prompts" (a pause doesn't block tips or the auto-switch) intended, or should the event player also play through a phase pause? The code says the former; the spec doesn't say.
3. `AutoSwitch` and `InvestigatorChoice` also check `!intro && showcase.length === 0`, although the intro and the showcase claim the stage. Are those extra checks still needed (a showcase with `busy` true doesn't claim), or can `stageFreeForPrompts` alone decide?
4. Should the timings (`DURATION` and the rest) become a table the spec quotes, or stay an implementation detail checked only against "at least 1.6 times as long"?
