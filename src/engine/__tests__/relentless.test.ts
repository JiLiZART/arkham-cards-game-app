import { afterEach, describe, expect, it } from "vitest";
import { card } from "../context";
import { enemyHere, game, inject } from "../kits/driver";
import { db, gOf } from "../kits/testkit";
import { STEP } from "../steps/step";

const ROLAND = "01001";
const MINION = "01160"; // Ghoul Minion, Relentless for the test
const saved = db.cards[MINION].keywords;
afterEach(() => {
  db.cards[MINION].keywords = saved;
});

const attacksBy = (r: ReturnType<typeof game>, enemy: string, from: number) =>
  r.state.log.slice(from).filter((e) => e.type === "attack" && e.card === enemy).length;

describe("Relentless", () => {
  it("attacks, readies, attacks again, then is exhausted: once each enemy phase", () => {
    db.cards[MINION].keywords = ["relentless"];
    let e = "";
    const r0 = game({ investigators: [ROLAND], prep: (g) => (e = enemyHere(g, ROLAND, MINION)) });
    const r = inject(r0, () => {}, { t: STEP.EnemyAttacks });
    expect(attacksBy(r, e, r0.state.log.length)).toBe(2);
    expect(card(gOf(r), e).exhausted).toBe(true);
  });

  it("an enemy without it attacks once", () => {
    let e = "";
    const r0 = game({ investigators: [ROLAND], prep: (g) => (e = enemyHere(g, ROLAND, MINION)) });
    const r = inject(r0, () => {}, { t: STEP.EnemyAttacks });
    expect(attacksBy(r, e, r0.state.log.length)).toBe(1);
  });
});
