import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import { cardsOf, inv } from "../../context";
import { game, inject } from "../../kits/driver";
import { db, gOf } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";
import { fromArkhamDb, validateDeck } from "../decks";

const ROLAND = "01001";
const MIRROR = "05313"; // Hallowed Mirror
const MELODY = "05314"; // Soothing Melody, bonded to it (3 copies)

beforeAll(() => loadPack("tcu"));

const roland = (extra: Record<string, number>) => {
  const cards = { ...db.decks["roland-starter"].cards };
  // one Machete makes room
  if (cards["01020"] > 1) cards["01020"]--;
  else delete cards["01020"];
  return {
    id: "t",
    name: "t",
    investigator: ROLAND,
    cards: { ...cards, ...extra },
    randomBasicWeakness: true,
  };
};

describe("Bonded", () => {
  it("a deck with Hallowed Mirror starts with three Soothing Melody set aside for its owner, out of the deck", () => {
    const deck = Object.entries(roland({ [MIRROR]: 1 }).cards).flatMap(([c, n]) =>
      Array<string>(n).fill(c),
    );
    let r = game({ investigators: [ROLAND], extra: { investigators: [{ code: ROLAND, deck }] } });
    const melodies = cardsOf(r.state).filter((c) => c.code === MELODY);
    expect(melodies.map((c) => [c.zone, c.owner])).toEqual([
      [ZONE.SetAside, ROLAND],
      [ZONE.SetAside, ROLAND],
      [ZONE.SetAside, ROLAND],
    ]);
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "putBondedInHand", code: MELODY },
      ctx: { you: ROLAND },
    });
    expect(
      inv(gOf(r), ROLAND).hand.filter(
        (id) => cardsOf(r.state).find((c) => c.id === id)?.code === MELODY,
      ),
    ).toHaveLength(1);
  });

  it("a deck that lists a bonded card is refused; its host's bonded cards don't count toward the size", () => {
    expect(validateDeck(db, roland({ [MIRROR]: 1 })).map((p) => p.reason?.key)).toEqual([]);
    const listed = roland({ [MIRROR]: 1, [MELODY]: 1 });
    expect(validateDeck(db, listed).map((p) => p.reason?.key)).toContain("deck.bonded");
  });

  it("an ArkhamDB deck's bonded cards are dropped", () => {
    const d = fromArkhamDb({ investigator_code: ROLAND, slots: { [MIRROR]: 1, [MELODY]: 3 } }, db);
    expect(d.cards).toEqual({ [MIRROR]: 1 });
  });
});
