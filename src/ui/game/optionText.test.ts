import { describe, expect, it } from "vitest";
import { pick, skipMulligans, start } from "../../engine/testkit";
import { abilityRef, optionLabel } from "./optionText";

const ROLAND = "01001";
const game = () => {
  let r = skipMulligans(start("the-gathering", [ROLAND], 1));
  if (r.state.pending?.options.some((o) => o.label === "Roland Banks")) r = pick(r, "Roland Banks");
  return r.state;
};

describe("optionLabel", () => {
  it("an ability's button in the game's language, after the card's name in it", () => {
    const g = game();
    const card = g.invs[ROLAND].cardId;
    const o = {
      id: `${card}:0`,
      label: "Roland: discover 1 clue at your location",
      card,
      value: `${card}:0`,
    };
    expect(abilityRef(o, g)).toEqual({ code: ROLAND, index: 0 });
    expect(optionLabel(o, g, "ru")).toBe("Роланд Бэнкс: найти 1 улику в вашей локации");
    expect(optionLabel(o, g, "en")).toBe("Roland Banks: discover 1 clue at your location");
  });

  it("a turn's ability option and a fast ability in a test are found the same way", () => {
    const g = game();
    const card = g.invs[ROLAND].cardId;
    expect(
      abilityRef({ id: "x", label: "x", value: { kind: "ability", card, index: 0 } }, g),
    ).toEqual({ code: ROLAND, index: 0 });
    expect(abilityRef({ id: "y", label: "y", value: { ability: { card, index: 0 } } }, g)).toEqual({
      code: ROLAND,
      index: 0,
    });
  });

  it("an assignment option in the game's language, with the asset's name in it", () => {
    const g = game();
    const o = {
      id: "c1",
      label: "Assign 1 damage to Research Librarian (defeated)",
      value: "c1",
      key: "option.assignDamage",
      vars: { code: "01032", defeated: 1 },
    };
    expect(optionLabel(o, g, "en")).toBe("Assign 1 damage to Research Librarian (defeated)");
    expect(optionLabel(o, g, "ru")).toMatch(/^Назначить 1 рану: .+ \(карта уничтожается\)$/);
    const h = { ...o, key: "option.assignHorror", vars: { code: "01032", defeated: 0 } };
    expect(optionLabel(h, g, "en")).toBe("Assign 1 horror to Research Librarian");
    expect(optionLabel(h, g, "ru")).toMatch(/^Назначить 1 ужас: /);
  });

  it("an option with only a string of its own (what to prevent)", () => {
    const g = game();
    const o = {
      id: "horror",
      label: "Prevent horror",
      value: "horror",
      key: "option.preventHorror",
    };
    expect(optionLabel(o, g, "en")).toBe("Prevent horror");
    expect(optionLabel(o, g, "ru")).toBe("Предотвратить ужас");
  });

  it("anything else keeps the engine's label", () => {
    const g = game();
    expect(optionLabel({ id: "pass", label: "Pass", value: "pass" }, g, "ru")).toBe("Pass");
    expect(abilityRef({ id: "pass", label: "Pass", value: "pass" }, g)).toBeNull();
  });

  it("a label with no card name before it is translated whole", () => {
    const g = game();
    const id = Object.values(g.cards).find((c) => c.code === "01122")?.id;
    if (!id) return;
    expect(
      optionLabel(
        { id: "r", label: "Resign", card: id, value: { kind: "ability", card: id, index: 0 } },
        g,
        "ru",
      ),
    ).toBe("Сдаться");
  });
});
