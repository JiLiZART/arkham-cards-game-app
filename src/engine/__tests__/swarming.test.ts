import { afterEach, describe, expect, it } from "vitest";
import { card, cardsBeneath, inv, leadInvestigator, setEngaged } from "../context";
import { game, inject } from "../kits/driver";
import { db, gOf } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const DAISY = "01002";
const HOST = "01161"; // Ravenous Ghoul: health 3, Swarming for the test
const saved = db.cards[HOST].keywords;
afterEach(() => {
  db.cards[HOST].keywords = saved;
});

/** the host drawn by `who` (or spawned with no drawer), its swarm made */
function drawn(who: string | null, swarming = 2) {
  db.cards[HOST].keywords = [{ swarming }];
  let host = "";
  let deckTop: string[] = [];
  const r0 = game({
    investigators: [ROLAND, DAISY],
    prep: (g) => {
      host = createCard(g, HOST, ZONE.Limbo);
      deckTop = inv(g, who ?? leadInvestigator(g)).deck.slice(0, swarming);
    },
  });
  const r = inject(
    r0,
    () => {},
    who
      ? { t: STEP.Spawn, enemy: host, inv: who }
      : { t: STEP.Spawn, enemy: host, inv: null, at: inv(gOf(r0), ROLAND).location },
  );
  return { r, host, deckTop };
}
const swarm = (r: ReturnType<typeof game>, host: string) => cardsBeneath(gOf(r), host);

describe("Swarming", () => {
  it("Swarming 2 drawn by Daisy puts her top 2 cards facedown beneath it", () => {
    const { r, host, deckTop } = drawn(DAISY);
    expect(swarm(r, host)).toEqual(deckTop);
    expect(deckTop.every((id) => card(gOf(r), id).zone === ZONE.Beneath)).toBe(true);
  });

  it("with no investigator drawing it, the lead's deck gives the swarm", () => {
    const { r, host, deckTop } = drawn(null);
    expect(swarm(r, host)).toEqual(deckTop);
  });

  it("attacks once for itself and once for each swarm card", () => {
    const { r, host } = drawn(DAISY);
    const r1 = inject(r, (g) => setEngaged(g, host, DAISY), { t: STEP.EnemyAttacks });
    expect(
      r1.state.log.slice(r.state.log.length).filter((e) => e.type === "attack" && e.card === host),
    ).toHaveLength(3);
  });

  it("damage goes to a swarm card first, which returns to the bottom of its owner's deck, the excess carrying over", () => {
    const { r, host, deckTop } = drawn(DAISY, 1);
    const r1 = inject(r, () => {}, { t: STEP.DamageEnemy, enemy: host, amount: 4, by: null });
    const g = gOf(r1);
    expect(swarm(r1, host)).toEqual([]);
    expect(inv(g, DAISY).deck.at(-1)).toBe(deckTop[0]);
    expect(card(g, deckTop[0]).damage).toBe(0);
    // 3 to the swarm card (the host's health), 1 to the host
    expect(card(g, host).damage).toBe(1);
  });

  it("the host isn't defeated while swarm cards remain", () => {
    const { r, host } = drawn(DAISY, 1);
    const r1 = inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: host, by: null });
    expect(card(gOf(r1), host).zone).toBe(ZONE.Enemy);
  });

  it("addSwarm adds a swarm card from the deck of the investigator resolving it", () => {
    const { r, host } = drawn(DAISY, 1);
    const top = inv(gOf(r), ROLAND).deck[0];
    const r1 = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "addSwarm", amount: 1 },
      ctx: { source: host, you: ROLAND },
    });
    expect(swarm(r1, host)).toContain(top);
  });

  it("a host leaving play another way sends its swarm cards to the bottom of their owner's deck", () => {
    const { r, host, deckTop } = drawn(DAISY, 1);
    const r1 = inject(r, (g) => moveCard(g, host, ZONE.EncounterDiscard));
    expect(inv(gOf(r1), DAISY).deck.at(-1)).toBe(deckTop[0]);
  });
});
