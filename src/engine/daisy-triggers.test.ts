import { describe, expect, it } from "vitest";
import { card, createCard, def, findByCode, moveCard, type G } from "./core";
import { db, gOf, giveCard, mutate, pick, putEnemy, skipMulligans, start } from "./testkit";
import { run, type Result } from "./engine";

const DAISY = "01002";
const ROLAND = "01001";

const toTurn = (r: Result, who = DAISY) => {
  while (r.state.pending?.inv !== who || r.state.pending.kind !== "turn")
    r = pick(r, r.state.pending!.options.at(-1)!.label);
  return r;
};
const inPlay = (g: G, code: string, who = DAISY) => {
  const id = createCard(g, code, "limbo", who);
  moveCard(g, id, "play");
  g.s.cards[id].controller = who;
  if (g.db.cards[code].uses) g.s.cards[id].uses = g.db.cards[code].uses!.count;
  return id;
};
const of = (r: Result, code: string) => Object.values(r.state.cards).filter((c) => c.code === code);

describe("Daisy's deck: triggers", () => {
  it("Research Librarian reacts to itself entering play, not to another asset", () => {
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 3));
    r = toTurn(
      mutate(r, (g) => {
        g.s.invs[DAISY].resources = 10;
        giveCard(g, DAISY, "01032");
        giveCard(g, DAISY, "01031");
      }),
    );
    r = pick(r, /^Play Research Librarian/);
    expect(r.state.pending?.options.map((o) => o.label)).toEqual([
      "Research Librarian: search for a Tome",
      "Pass",
    ]);
    r = pick(r, "pass");
    r = pick(r, /^Play Old Book of Lore/);
    expect(r.state.pending?.kind).toBe("turn");
  });

  it("Arcane Initiate places doom on itself only when it enters play", () => {
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 3));
    r = toTurn(
      mutate(r, (g) => {
        g.s.invs[DAISY].resources = 10;
        inPlay(g, "01063");
        giveCard(g, DAISY, "01031");
      }),
    );
    r = pick(r, /^Play Old Book of Lore/);
    expect(of(r, "01063")[0].doom).toBe(0);
  });

  // Hallway connects to Cellar and Parlor; Daisy in the Cellar, Barricade on the Parlor
  const house = (barricadeOn: string) => {
    let ids: string[] = [];
    let b = "";
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 3, { chaosBag: ["0"] as never }));
    r = mutate(r, (g) => {
      ids = ["01112", "01114", "01115"].map((c) => findByCode(g, c, ["setAside", "location"])!.id);
      for (const id of ids) {
        if (g.s.cards[id].zone !== "location") moveCard(g, id, "location");
        g.s.cards[id].revealed = true;
      }
      g.s.flags.connections = [
        ["01112", "01114"],
        ["01112", "01115"],
      ];
      for (const e of Object.values(g.s.cards))
        if (e.zone === "enemy") moveCard(g, e.id, "encounterDiscard");
      g.s.invs[DAISY].location = ids[1];
      b = createCard(g, "01038", "limbo", DAISY);
      moveCard(g, b, "attached", {
        location: ids[["01112", "01114", "01115"].indexOf(barricadeOn)],
      });
    });
    return { r, b, hall: ids[0], cellar: ids[1], parlor: ids[2] };
  };

  it("Barricade stays when an investigator leaves another location, goes when one leaves its own", () => {
    let { r, b } = house("01115");
    r = pick(toTurn(r), /Move to Hallway/);
    while (r.state.pending?.kind !== "turn") r = pick(r, r.state.pending!.options[0].id);
    expect(r.state.cards[b].zone).toBe("attached");

    ({ r, b } = house("01114"));
    r = pick(toTurn(r), /Move to Hallway/);
    while (r.state.pending?.kind !== "turn") r = pick(r, r.state.pending!.options[0].id);
    expect(r.state.cards[b].zone).toBe("discard");
  });

  it("They're Getting Out! ghouls do not move into a barricaded location unless Elite", () => {
    const h = house("01112");
    let ghoul = "",
      priest = "";
    const r = mutate(h.r, (g) => {
      ghoul = putEnemy(g, "01160", h.cellar);
      priest = putEnemy(g, "01116", h.cellar);
      g.s.invs[DAISY].location = h.parlor;
      (db.scripts["01107"] as unknown as { fns: Record<string, (g: G) => void> }).fns.ghoulsMove(g);
    });
    expect(card(gOf(r), ghoul).location).toBe(h.cellar);
    expect(card(gOf(r), priest).location).toBe(h.hall);
  });

  it("They're Getting Out! ghouls and hunters move into the unrevealed Parlor ('you cannot move into' binds investigators only)", () => {
    const h = house("01114");
    let ghoul = "",
      hunter = "";
    const r = mutate(h.r, (g) => {
      g.s.cards[h.parlor].revealed = false;
      ghoul = putEnemy(g, "01160", h.hall);
      g.s.invs[DAISY].location = h.cellar;
      (db.scripts["01107"] as unknown as { fns: Record<string, (g: G) => void> }).fns.ghoulsMove(g);
    });
    expect(card(gOf(r), ghoul).location).toBe(h.parlor);
    // a hunter heading for the investigators in the Parlor steps in too
    const g = gOf(r);
    moveCard(g, ghoul, "encounterDiscard");
    hunter = putEnemy(g, "01116", h.hall); // Ghoul Priest, hunter
    g.s.invs[ROLAND].location = h.parlor;
    g.s.invs[DAISY].location = h.parlor;
    g.s.pending = null;
    g.s.queue = [{ t: "HunterMoves" }];
    run(g);
    expect(card(g, hunter).location).toBe(h.parlor);
  });

  it("Forbidden Knowledge's horror cost can go on Holy Rosary, then the resource is gained", () => {
    let fk = "",
      rosary = "";
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 3));
    r = toTurn(
      mutate(r, (g) => {
        fk = inPlay(g, "01058");
        rosary = inPlay(g, "01059");
      }),
    );
    const res = r.state.invs[DAISY].resources;
    r = pick(r, /Forbidden Knowledge: take/);
    expect(r.state.pending?.kind).toBe("assign");
    expect(r.state.invs[DAISY].resources).toBe(res);
    r = pick(r, rosary);
    expect(r.state.pending?.kind).toBe("turn");
    expect(card(gOf(r), rosary).horror).toBe(1);
    expect(r.state.invs[DAISY].horror).toBe(0);
    expect(r.state.invs[DAISY].resources).toBe(res + 1);
    expect(card(gOf(r), fk)).toMatchObject({ uses: 3, exhausted: true });
    expect(def(gOf(r), fk).name).toBe("Forbidden Knowledge");
  });
});
