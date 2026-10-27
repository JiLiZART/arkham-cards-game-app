import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import { pick, start } from "../engine/testkit";
import { trackShowcase } from "./showcase";
import type { UiState } from "./store";
import { useView } from "./view";

describe("trackShowcase", () => {
  it("a mulligan redraw stops in the showcase, on the redrawing investigator's table", () => {
    const r0 = start("the-gathering", ["01001", "01002"], 1);
    const store = createStore<Pick<UiState, "game" | "setup" | "actions">>(() => ({
      game: r0.state,
      setup: {} as never,
      actions: [],
    }));
    trackShowcase(store as never);
    useView.setState({ showcase: [], viewing: null });
    const [a, b] = r0.state.invs["01001"].hand;
    const r1 = pick(pick(r0, a), b);
    store.setState({ game: r1.state, actions: [{}, {}] as never });
    const r2 = pick(r1, "done");
    store.setState({ game: r2.state, actions: [{}, {}, {}] as never });
    // Daisy's mulligan is next, but Roland's two new cards wait for him
    expect(r2.state.pending?.inv).toBe("01002");
    const hand = r2.state.invs["01001"].hand;
    expect(useView.getState().showcase).toHaveLength(2);
    expect(useView.getState().showcase.every((id) => hand.includes(id))).toBe(true);
    expect(useView.getState().viewing).toBe("01001");
  });

  it("the opening hand does not", () => {
    const store = createStore<Pick<UiState, "game" | "setup" | "actions">>(() => ({
      game: null,
      setup: null,
      actions: [],
    }));
    trackShowcase(store as never);
    useView.setState({ showcase: [] });
    store.setState({ game: start("the-gathering", ["01001"], 1).state, setup: {} as never });
    expect(useView.getState().showcase).toEqual([]);
  });
});
