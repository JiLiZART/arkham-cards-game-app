import { beforeAll, describe, expect, it } from "vitest";
import { loadPacksFor } from "../../content";
import { card, inv, push } from "../context";
import { createCard, moveCard } from "../movement";
import { run } from "../steps/dispatch";
import {
  DECK_BY_INV,
  deckCodes,
  gOf,
  mutate,
  options,
  pick,
  skipMulligans,
  start,
} from "../kits/testkit";
import type { Result } from "../index";
import { cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";

const NATHANIEL = "60101";
const WARD = "60106";
const MINION = "01160"; // Ghoul Minion: 1 damage, 1 horror

beforeAll(async () => {
  DECK_BY_INV[NATHANIEL] = "60101-starter";
  await loadPacksFor(deckCodes("60101-starter"));
});

/** Nathaniel with Flesh Ward in play (4 charges unless `uses`), a Ghoul Minion engaged, his turn ended: the attack is next */
function attacked(opts: { uses?: number; exhausted?: boolean } = {}): { r: Result; ward: string } {
  let r = skipMulligans(start("the-gathering", [NATHANIEL], 1, { chaosBag: ["0"] as never }));
  while (r.state.pending && r.state.pending.kind !== "turn")
    r = pick(
      r,
      r.state.pending.options.some((o) => o.id === "pass")
        ? "pass"
        : r.state.pending.options[0].label.startsWith("Done")
          ? /^Done/
          : /./,
    );
  let ward = "";
  r = mutate(r, (game) => {
    ward = createCard(game, WARD, ZONE.Limbo, NATHANIEL);
    moveCard(game, ward, ZONE.Play);
    cardRecIn(game.s, ward).uses = opts.uses ?? 4;
    cardRecIn(game.s, ward).exhausted = !!opts.exhausted;
    const e = createCard(game, MINION, ZONE.Limbo);
    moveCard(game, e, ZONE.Enemy, { location: inv(game, NATHANIEL).location });
    cardRecIn(game.s, e).engagedWith = NATHANIEL;
  });
  r = pick(r, "End turn");
  for (let k = 0; k < 40 && r.state.pending; k++) {
    const p = r.state.pending;
    if (
      p.kind === "turn" ||
      p.kind === "assign" ||
      p.options.some((o) => /Flesh Ward/.test(o.label) && p.kind === "reaction")
    )
      break;
    if (r.state.log.some((e) => e.type === "attack")) break;
    r = pick(
      r,
      p.options.some((o) => o.id === "pass")
        ? "pass"
        : p.options[0].label.startsWith("Done")
          ? /^Done/
          : /./,
    );
  }
  return { r, ward };
}
const finish = (r: Result): Result => {
  for (let k = 0; k < 40 && r.state.pending && r.state.pending.kind !== "turn"; k++) {
    const p = r.state.pending;
    r = pick(
      r,
      p.kind === "assign"
        ? new RegExp(`to ${inv(gOf(r), NATHANIEL).name}`)
        : p.options.some((o) => o.id === "pass")
          ? "pass"
          : p.options[0].label.startsWith("Done")
            ? /^Done/
            : /./,
    );
  }
  return r;
};

describe("Flesh Ward", () => {
  it("is offered before the points are assigned; using it exhausts it, spends a charge and cancels the chosen point", () => {
    const { r: r0, ward } = attacked();
    expect(r0.state.pending?.kind).toBe("reaction");
    expect(options(r0).some((l) => /Flesh Ward/.test(l))).toBe(true);
    let r = pick(r0, /Flesh Ward/);
    expect(options(r)).toEqual(["Prevent damage", "Prevent horror"]);
    r = pick(r, "Prevent horror");
    // paid when used (the upkeep readies it later)
    expect(card(gOf(r), ward)).toMatchObject({ exhausted: true, uses: 3, zone: "play" });
    r = finish(r);
    expect(invStateIn(r.state, NATHANIEL)).toMatchObject({ damage: 1, horror: 0 });
  });

  it("choosing damage leaves the horror", () => {
    const { r: r0 } = attacked();
    let r = pick(r0, /Flesh Ward/);
    r = pick(r, "Prevent damage");
    r = finish(r);
    expect(invStateIn(r.state, NATHANIEL)).toMatchObject({ damage: 0, horror: 1 });
  });

  it("is not offered when it is exhausted or has no charge", () => {
    for (const o of [{ exhausted: true }, { uses: 0 }]) {
      const { r } = attacked(o);
      expect(r.state.pending?.kind, JSON.stringify(o)).not.toBe("reaction");
    }
  });

  it("spending its last charge leaves it in play", () => {
    const { r: r0, ward } = attacked({ uses: 1 });
    let r = pick(r0, /Flesh Ward/);
    r = pick(r, "Prevent horror");
    r = finish(r);
    expect(card(gOf(r), ward)).toMatchObject({ uses: 0, zone: "play" });
  });

  it("is not offered for damage that is not from an attack", () => {
    let r = skipMulligans(start("the-gathering", [NATHANIEL], 1, { chaosBag: ["0"] as never }));
    const game = gOf(r);
    game.s = structuredClone(r.state);
    moveCard(game, createCard(game, WARD, ZONE.Limbo, NATHANIEL), ZONE.Play);
    game.s.pending = null;
    game.s.queue.length = 0;
    push(game, {
      t: STEP.AssignDamage,
      inv: NATHANIEL,
      damage: 0,
      horror: 1,
      direct: false,
      source: null,
    });
    run(game);
    // straight to who takes the horror: no window for the ward
    expect((game.s.pending as { kind?: string } | null)?.kind).toBe("assign");
    r = { state: game.s, events: [] };
    r = pick(r, new RegExp(`to ${inv(gOf(r), NATHANIEL).name}`));
    expect(invStateIn(r.state, NATHANIEL).horror).toBe(1);
  });
});
