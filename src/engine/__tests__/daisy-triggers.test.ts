import { describe, expect, it } from "vitest";
import { card, def, type GameContext } from "../context";
import { createCard, moveCard } from "../movement";
import { findByCode } from "../queries";
import { db, gOf, giveCard, mutate, pick, putEnemy, skipMulligans, start } from "../kits/testkit";
import { type Result } from "../index";
import { inject, toTurn as driverToTurn } from "../kits/driver";
import { allCardRecsIn, cardRecIn, invStateIn } from "../world/store";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";

const DAISY = "01002";
const ROLAND = "01001";

const toTurn = (r: Result, who = DAISY) => driverToTurn(r, who);
const inPlay = (game: GameContext, code: string, who = DAISY) => {
  const id = createCard(game, code, ZONE.Limbo, who);
  moveCard(game, id, ZONE.Play);
  cardRecIn(game.s, id).controller = who;
  if (game.db.cards[code].uses) cardRecIn(game.s, id).uses = game.db.cards[code].uses!.count;
  return id;
};
const of = (r: Result, code: string) => allCardRecsIn(r.state).filter((c) => c.code === code);

describe("Daisy's deck: triggers", () => {
  it("Research Librarian reacts to itself entering play, not to another asset", () => {
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 3));
    r = toTurn(
      mutate(r, (game) => {
        invStateIn(game.s, DAISY).resources = 10;
        giveCard(game, DAISY, "01032");
        giveCard(game, DAISY, "01031");
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
      mutate(r, (game) => {
        invStateIn(game.s, DAISY).resources = 10;
        inPlay(game, "01063");
        giveCard(game, DAISY, "01031");
      }),
    );
    r = pick(r, /^Play Old Book of Lore/);
    expect(of(r, "01063")[0].doom).toBe(0);
  });

  // Hallway connects to Cellar and Parlor; Daisy in the Cellar, Barricade on the Parlor
  const house = (barricadeOn: string) => {
    let ids: string[] = [];
    let b = "";
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 3, { chaosBag: ["0"] }));
    r = mutate(r, (game) => {
      ids = ["01112", "01114", "01115"].map(
        (c) => findByCode(game, c, [ZONE.SetAside, ZONE.Location])!.id,
      );
      for (const id of ids) {
        if (cardRecIn(game.s, id).zone !== "location") moveCard(game, id, ZONE.Location);
        cardRecIn(game.s, id).revealed = true;
      }
      // the Hallway's printed connections reach the Cellar and the Parlor
      for (const e of allCardRecsIn(game.s))
        if (e.zone === "enemy") moveCard(game, e.id, ZONE.EncounterDiscard);
      invStateIn(game.s, DAISY).location = ids[1];
      b = createCard(game, "01038", ZONE.Limbo, DAISY);
      moveCard(game, b, ZONE.Attached, {
        location: ids[["01112", "01114", "01115"].indexOf(barricadeOn)],
      });
    });
    return { r, b, hall: ids[0], cellar: ids[1], parlor: ids[2] };
  };

  it("Barricade stays when an investigator leaves another location, goes when one leaves its own", () => {
    let { r, b } = house("01115");
    r = pick(toTurn(r), /Move to Hallway/);
    r = driverToTurn(r);
    expect(cardRecIn(r.state, b).zone).toBe("attached");

    ({ r, b } = house("01114"));
    r = pick(toTurn(r), /Move to Hallway/);
    r = driverToTurn(r);
    expect(cardRecIn(r.state, b).zone).toBe("discard");
  });

  it("They're Getting Out! ghouls do not move into a barricaded location unless Elite", () => {
    const h = house("01112");
    let ghoul = "",
      priest = "";
    const r = mutate(h.r, (game) => {
      ghoul = putEnemy(game, "01160", h.cellar);
      priest = putEnemy(game, "01116", h.cellar);
      invStateIn(game.s, DAISY).location = h.parlor;
      (
        db.scripts["01107"] as unknown as { fns: Record<string, (game: GameContext) => void> }
      ).fns.ghoulsMove(game);
    });
    expect(card(gOf(r), ghoul).location).toBe(h.cellar);
    expect(card(gOf(r), priest).location).toBe(h.hall);
  });

  it("They're Getting Out! ghouls and hunters move into the unrevealed Parlor ('you cannot move into' binds investigators only)", () => {
    const h = house("01114");
    let ghoul = "",
      hunter = "";
    const r = mutate(h.r, (game) => {
      cardRecIn(game.s, h.parlor).revealed = false;
      ghoul = putEnemy(game, "01160", h.hall);
      invStateIn(game.s, DAISY).location = h.cellar;
      (
        db.scripts["01107"] as unknown as { fns: Record<string, (game: GameContext) => void> }
      ).fns.ghoulsMove(game);
    });
    expect(card(gOf(r), ghoul).location).toBe(h.parlor);
    // a hunter heading for the investigators in the Parlor steps in too
    const after = inject(
      r,
      (game) => {
        moveCard(game, ghoul, ZONE.EncounterDiscard);
        hunter = putEnemy(game, "01116", h.hall); // Ghoul Priest, hunter
        invStateIn(game.s, ROLAND).location = h.parlor;
        invStateIn(game.s, DAISY).location = h.parlor;
      },
      { t: STEP.HunterMoves },
    );
    expect(card(gOf(after), hunter).location).toBe(h.parlor);
  });

  it("Forbidden Knowledge's horror cost can go on Holy Rosary, then the resource is gained", () => {
    let fk = "",
      rosary = "";
    let r = skipMulligans(start("the-gathering", [DAISY, ROLAND], 3));
    r = toTurn(
      mutate(r, (game) => {
        fk = inPlay(game, "01058");
        rosary = inPlay(game, "01059");
      }),
    );
    const res = invStateIn(r.state, DAISY).resources;
    r = pick(r, /Forbidden Knowledge: take/);
    expect(r.state.pending?.kind).toBe("assign");
    expect(invStateIn(r.state, DAISY).resources).toBe(res);
    r = pick(r, rosary);
    expect(r.state.pending?.kind).toBe("turn");
    expect(card(gOf(r), rosary).horror).toBe(1);
    expect(invStateIn(r.state, DAISY).horror).toBe(0);
    expect(invStateIn(r.state, DAISY).resources).toBe(res + 1);
    expect(card(gOf(r), fk)).toMatchObject({ uses: 3, exhausted: true });
    expect(def(gOf(r), fk).name).toBe("Forbidden Knowledge");
  });
});
