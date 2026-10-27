import type { StoreApi } from "zustand";
import { diffArrivals, takeArrival } from "./arrivals";
import { deckPick } from "./optionHome";
import { viewerOf, type UiState } from "../state/store";
import { useView } from "../state/view";

/**
 * Cards drawn into the on-screen hand (a mulligan redraw too, not the opening hand) stop in the showcase until the player
 * sends them on; a card picked out of a deck in the showcase goes straight to the fan. Undo, loads and new games add nothing.
 */
export function trackShowcase(store: StoreApi<UiState>) {
  return store.subscribe((s, prev) => {
    if (s.setup !== prev.setup) {
      if (useView.getState().showcase.length) useView.setState({ showcase: [] });
      return;
    }
    if (!s.game || !prev.game || s.game === prev.game || s.actions.length <= prev.actions.length)
      return;
    // a mulligan redraw belongs to whoever just answered, though the next investigator's mulligan is already pending
    const redraw = prev.game.pending?.kind === "mulligan";
    const viewer = redraw ? viewerOf(prev.game) : viewerOf(s.game);
    const picked = new Set(deckPick(prev.game, viewerOf(prev.game)));
    const drawn = diffArrivals(prev.game, s.game).filter(
      (a) =>
        a.to === "hand" &&
        a.from === "deck" &&
        !a.opening &&
        a.owner === viewer &&
        !picked.has(a.id),
    );
    if (!drawn.length) return;
    // the showcase flies these in itself; the fan takes them later from there
    for (const a of drawn) takeArrival(a.id);
    useView.setState((v) => ({
      showcase: [...v.showcase, ...drawn.map((a) => a.id)],
      // their table stays on screen until the cards are taken; the hand-off follows by itself
      ...(redraw ? { viewing: viewer } : {}),
    }));
  });
}
