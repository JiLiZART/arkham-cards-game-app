import { describe, expect, it } from "vitest";
import { cardOf, cardsOf, invOf, setCounter } from "../context";
import {
  addLocation,
  enemyHere,
  evade,
  fight,
  game,
  investigate,
  lastTest,
  move,
  rigBag,
  toTurn,
  until,
  untilWindow,
  windowOf,
} from "../kits/driver";
import { HALLWAY, MINION, ROLAND, DAISY, STUDY } from "../kits/natkit";
import { gOf } from "../kits/testkit";

const reveals = (r: ReturnType<typeof game>) =>
  r.state.log.filter((e) => e.type === "testResult").flatMap((e) => e.data!.tokens as string[]);

describe("scenario driver", () => {
  it("game stops at Roland's first turn", () => {
    const r = game({ investigators: [ROLAND] });
    expect(r.state.pending?.kind).toBe("turn");
    expect(r.state.pending?.inv).toBe(ROLAND);
  });

  it("a rigged bag reveals only its tokens, without a cast", () => {
    let r = game({ investigators: [ROLAND], bag: ["skull"] });
    r = investigate(r);
    expect(reveals(r)).toEqual(["skull"]);
  });

  it("rigBag replaces the bag mid-game", () => {
    let r = game({ investigators: [ROLAND], bag: ["skull"] });
    r = rigBag(r, ["elderSign"]);
    r = investigate(r);
    expect(reveals(r)).toEqual(["elderSign"]);
  });

  it("toTurn stops at the named investigator's turn", () => {
    let r = game({ investigators: [ROLAND, DAISY] });
    r = toTurn(r, DAISY);
    expect(r.state.pending?.kind).toBe("turn");
    expect(r.state.pending?.inv).toBe(DAISY);
  });

  it("untilWindow stops at the reaction window and windowOf names it", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["+1"],
      prep: (g) => setCounter(g, enemyHere(g, ROLAND, MINION), "damage", 1),
    });
    expect(windowOf(r)).toBeNull();
    r = untilWindow(fight(r, MINION), "enemyDefeated");
    expect(windowOf(r)).toBe("enemyDefeated");
    expect(r.state.pending?.options.some((o) => o.label.startsWith("Roland"))).toBe(true);
  });

  it("until throws past its cap and lists the prompts it saw", () => {
    const r = game({ investigators: [ROLAND] });
    expect(() => until(r, () => false, 3)).toThrow(/prompts seen/);
  });

  it("investigate takes the action by value and lastTest reads the result", () => {
    let r = game({ investigators: [ROLAND], bag: ["0"] });
    r = investigate(r);
    const t = lastTest(r)!;
    expect(t.skill).toBe("intellect");
    expect(t.difficulty).toBe(2);
    expect(t.success).toBe(true);
  });

  it("fight and evade take the action against the named enemy", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => enemyHere(g, ROLAND, MINION),
    });
    r = fight(r, MINION);
    expect(lastTest(r)!.skill).toBe("combat");
    r = toTurn(r, ROLAND);
    r = evade(r, MINION);
    expect(lastTest(r)!.skill).toBe("agility");
  });

  it("move takes the action to the named location", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => addLocation(g, HALLWAY, [[STUDY, HALLWAY]]),
    });
    r = move(r, HALLWAY);
    const at = invOf(r.state, ROLAND).location!;
    expect(cardOf(r.state, at).code).toBe(HALLWAY);
    expect(cardsOf(gOf(r).s).some((c) => c.code === HALLWAY)).toBe(true);
  });
});
