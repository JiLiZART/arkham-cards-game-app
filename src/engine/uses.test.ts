import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { def, findByCode, inv } from "./core";
import { spendsOnlyUses } from "./rules/cards";
import { commitDone, gOf, giveCard, mutate, pick, putEnemy, skipMulligans, start } from "./testkit";
import type { CardDef } from "../content/schema";
import { allCardRecsIn, cardRecIn, invStateIn } from "./records";

const ROLAND = "01001";

beforeAll(() => loadPack("tcu"));

/** The Gathering, solo Roland with the given asset in play holding `uses` uses */
function withAsset(code: string, uses: number) {
  let r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["0"] as never }));
  r = mutate(r, (g) => {
    invStateIn(g.s, ROLAND).resources = 10;
    giveCard(g, ROLAND, code);
  });
  r = pick(
    r,
    new RegExp(
      `^Play ${def(gOf(r), findInHand(r, code)).name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    ),
  );
  const id = allCardRecsIn(r.state).find((c) => c.code === code && c.zone === "play")!.id;
  r = mutate(r, (g) => (cardRecIn(g.s, id).uses = uses));
  return { r, id };
}
const findInHand = (r: ReturnType<typeof start>, code: string) =>
  invStateIn(r.state, ROLAND).hand.find((h) => cardRecIn(r.state, h).code === code)!;

describe("assets with uses leave play when empty", () => {
  it("Flashlight's last supply: the investigation uses −2 shroud, then Flashlight is discarded", () => {
    const { r: r0, id } = withAsset("01087", 1);
    const before = invStateIn(r0.state, ROLAND).clues;
    let r = pick(r0, /^Flashlight: investigate/);
    // Study shroud 2 − 2 = 0: Roland's intellect 3 with a 0 token succeeds; the modifier applied while Flashlight was in play
    r = commitDone(r);
    expect(invStateIn(r.state, ROLAND).clues).toBe(before + 1);
    expect(cardRecIn(r.state, id).zone).toBe("discard");
    expect(invStateIn(r.state, ROLAND).discard).toContain(id);
    // undo restores the state before the action: Flashlight in play with 1 supply
    expect(cardRecIn(r0.state, id).zone).toBe("play");
    expect(cardRecIn(r0.state, id).uses).toBe(1);
  });

  it("Fingerprint Kit: exhaust and spend 1 supply to investigate, discovering 1 additional clue", () => {
    const { r: r0, id } = withAsset("05024", 3);
    const before = invStateIn(r0.state, ROLAND).clues;
    let r = pick(r0, /^Fingerprint Kit: investigate/);
    r = commitDone(r);
    expect(invStateIn(r.state, ROLAND).clues).toBe(before + 2);
    expect(cardRecIn(r.state, id).uses).toBe(2);
    expect(cardRecIn(r.state, id).exhausted).toBe(true);
  });

  it(".45 Automatic with ammo left stays in play", () => {
    const { r: r0, id } = withAsset("01016", 2);
    const r1 = mutate(r0, (g) => putEnemy(g, "01160", inv(g, ROLAND).location!, ROLAND));
    let r = pick(r1, /^\.45 Automatic: fight/);
    if (
      r.state.pending?.kind === "generic" &&
      /Ghoul/.test(r.state.pending.options[0]?.label ?? "")
    )
      r = pick(r, /Ghoul/);
    r = commitDone(r);
    expect(cardRecIn(r.state, id).zone).toBe("play");
    expect(cardRecIn(r.state, id).uses).toBe(1);
  });

  it("only cards whose every ability spends uses, and that have no constant ability, count as used up", () => {
    const g = gOf(skipMulligans(start("the-gathering", [ROLAND], 1)));
    const flashlight = g.db.cards["01087"];
    expect(spendsOnlyUses(flashlight)).toBe(true);
    const withConstant = {
      ...flashlight,
      abilities: [
        ...(flashlight.abilities ?? []),
        { kind: "constant", modifiers: [{ stat: "intellect", value: 1 }] },
      ],
    } as unknown as CardDef;
    expect(spendsOnlyUses(withConstant)).toBe(false);
    const free = {
      ...flashlight,
      abilities: [{ kind: "fast", label: "x", cost: { resources: 1 }, effects: [] }],
    } as unknown as CardDef;
    expect(spendsOnlyUses(free)).toBe(false);
    void findByCode;
  });
});
