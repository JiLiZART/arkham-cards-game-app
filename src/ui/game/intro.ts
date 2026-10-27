import type { StoreApi } from "zustand";
import type { GameState } from "../../engine/types";
import { mapMoving, mapPending } from "./arrivals";
import type { UiState } from "../state/store";
import { useView, type IntroStep } from "../state/view";

/** the introduction starts when a live game leaves setup (the last mulligan); a new, loaded or imported game ends any running one */
export function trackIntro(store: StoreApi<UiState>) {
  return store.subscribe((s, prev) => {
    if (s.setup !== prev.setup) {
      if (useView.getState().intro) useView.setState({ intro: null });
      return;
    }
    if (
      s.game &&
      prev.game &&
      s.game !== prev.game &&
      mulliganing(prev.game) &&
      !mulliganing(s.game)
    )
      useView.setState({ intro: { step: "story", setup: s.setup } });
  });
}

/** still in the mulligan (a paced game stays in "setup" while it waits to begin the first phase) */
export const mulliganing = (g: GameState) => g.phase === "setup" && g.pending?.kind !== "phase";

/** what is still off the table: nothing is set up during the mulligan, and the introduction brings agenda, act and map in turn */
export function introHides(game: GameState, step: IntroStep | undefined) {
  const setup = mulliganing(game);
  const before = (s: IntroStep) => !!step && INTRO_STEPS.indexOf(step) <= INTRO_STEPS.indexOf(s);
  return {
    agenda: setup || before("agenda"),
    act: setup || before("act"),
    map: setup || before("act"),
  };
}

export const INTRO_STEPS: IntroStep[] = ["story", "agenda", "act", "deal"];

/** calls `done` once every dealt location has landed and flipped (quiet for a moment), or after `max` ms */
export function whenDealt(done: () => void, max = 9000): () => void {
  const start = performance.now();
  let last = start;
  let raf = 0;
  const tick = () => {
    const now = performance.now();
    if (mapPending.size || mapMoving.size) last = now;
    if (now - last >= 300 || now - start >= max) done();
    else raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
