## 1. The conductor, test first

- [ ] 1.1 `src/ui/game/conductor.test.ts`: unit cases for `conduct` — an attack at Normal advances by timer after its `DURATION`, at Slow after 1.6x, at Tap by the player; a hit from a card adds the streak lead-in; a test token advances by the screen at every pace; a test result drawn by hand waits for the player; an encounter card and a weakness wait for the player at every pace; an event that waits for settling doesn't play until `settledFor` is it; a centre event asks for an `event:` claim and plays only when it heads the stage; a non-centre event plays while only a `test:` claim holds the stage and not while a `title:` claim does.
- [ ] 1.2 `src/ui/game/conductor.ts`: `conduct`, the timing table, `ANIMATED`, `HELD`, `TAP`, `holdsForTap`, `needsNext` (copied from `store.ts:40-90` and `Hud.tsx:58-84`), until 1.1 passes.
- [ ] 1.3 Corpus case in the same test: load one recording from `src/engine/replays/`, queue its events as `enqueue` does, step through `conduct` at Normal, Slow and Tap, and assert each event's `advance` kind and that every event plays once.

## 2. EventPlayer as an adapter

- [ ] 2.1 `EventPlayer` calls `conduct`, claims the returned claim through `useStage`, writes `playing` and the spotlight, and sets one timeout when `advance.by === "timer"`; `DURATION`, `SLOW`, `CENTER`, `waitsForSettle` leave `Hud.tsx`.
- [ ] 2.2 `store.ts` and `StepCaption` import the pace tables and `needsNext` from the conductor; the copies in `store.ts` are removed. `pnpm typecheck` and `pnpm test` green.

## 3. Typed stage claims and named predicates

- [ ] 3.1 Tests first in `conductor.test.ts`: `stageKey` for each of the 7 kinds; `stageFreeForEvents`, `stageFreeForPrompts`, `stageEmpty` for an empty stage, a lone `test:`, `test:` with `pause:`, and each other kind.
- [ ] 3.2 `StageKind` constant object, `stageKey`, `kindOf` and the three predicates; `useStage` and `claimStage` in `view.ts` take a `StageClaim`; `stage.test.ts` still passes unchanged in meaning.
- [ ] 3.3 The 7 claim sites build claims with `stageKey`: `SkillTestScreen`, `Showcase`, `IntroOverlay`, and `Hud.tsx` (event, pause/title, turn).
- [ ] 3.4 The 7 freedom checks use the predicates: `Hud.tsx:107` and `feed.ts:257` (`stageFreeForEvents`), `Hud.tsx:315`, `InvestigatorChoice.tsx:32`, `TipLayer.tsx:96` (`stageFreeForPrompts`), `Floats.tsx:92` and `Reveal.tsx:181` (`stageEmpty`). No `startsWith(` on a stage key is left outside `conductor.ts` (grep).

## 4. Verification

- [ ] 4.1 Browser pass on a dev server of your own (`pnpm dev --port 5174`, Playwright, screenshots under `.playwright-mcp/`), desktop and phone: an enemy phase at Normal, Slow and Tap; a skill test drawn by hand with a fast ability's damage mid-test; an encounter card in the showcase; a phase title followed by an encounter; a tip during a paced phase pause. Order and holds as before. Stop the server.
- [ ] 4.2 `pnpm lint:fix`, `oxfmt` on the files this change touches only, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `openspec validate ui-event-conductor --type change --strict`.
