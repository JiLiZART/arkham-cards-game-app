import { beforeEach, describe, expect, it } from "vitest";
import { useView } from "./view";

const view = () => useView.getState();

describe("a view another player shows", () => {
  beforeEach(() => {
    useView.setState({ modal: null, shownBy: null, menu: null, moveDrag: null, intro: null });
  });

  it("opens, naming who shows it", () => {
    expect(view().showFrom("Ana", { deck: "agenda" })).toBe(true);
    expect(view().modal).toEqual({ deck: "agenda" });
    expect(view().shownBy).toBe("Ana");
  });

  it("is dropped while this player has a view open", () => {
    view().setModal({ card: "c1" });
    expect(view().showFrom("Ana", { deck: "act" })).toBe(false);
    expect(view().modal).toEqual({ card: "c1" });
    expect(view().shownBy).toBeNull();
  });

  it("replaces a view that was itself shown", () => {
    view().showFrom("Ana", { deck: "act" });
    expect(view().showFrom("Ben", { card: "c2" })).toBe(true);
    expect(view().modal).toEqual({ card: "c2" });
    expect(view().shownBy).toBe("Ben");
  });

  it("is dropped during a menu, a drag or the scenario introduction", () => {
    view().openMenu(0, 0, []);
    expect(view().showFrom("Ana", { deck: "act" })).toBe(false);
    view().closeMenu();
    useView.setState({ moveDrag: { inv: "i", targets: {}, rects: [], dx: 0, dy: 0, over: null } });
    expect(view().showFrom("Ana", { deck: "act" })).toBe(false);
    useView.setState({ moveDrag: null, intro: { step: "story", setup: null } });
    expect(view().showFrom("Ana", { deck: "act" })).toBe(false);
    expect(view().modal).toBeNull();
  });

  it("is forgotten when this player opens or closes a view", () => {
    view().showFrom("Ana", { deck: "act" });
    view().setModal(null);
    expect(view().shownBy).toBeNull();
    view().showFrom("Ana", { deck: "act" });
    view().setModal({ card: "c1" });
    expect(view().shownBy).toBeNull();
  });
});
