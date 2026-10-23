// Spreading Flames: Bystander parleys, the agendas' tests and Fire!, the acts' end-of-round advances and backs
import {
  activeInvs,
  ask,
  card,
  cardsIn,
  def,
  discard,
  emit,
  enemiesAt,
  findByCode,
  inv,
  invName,
  locationByName,
  moveCard,
  playerCount,
  push,
  shuffle,
  spendableGroupClues,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type InvId,
  type Step,
} from "../../../../src/engine/api";
import type { Effect, Skill } from "../../../../src/content/schema";
import { drawFire } from "../../../packs/core_2026/scripts/12129";

const FIRE = "12129";
const SERVANT = "12114";
const ROOM = "12113";
const QUAD = "12116";
const DORMS = "12117";

const setAside = (g: G, code: string) =>
  Object.values(g.s.cards).filter((c) => c.code === code && c.zone === "setAside");
const discardEnemies = (g: G) => {
  for (const e of cardsIn(g, "enemy")) discard(g, e.id);
};

export default {
  conditions: {
    oneOrTwoPlayers: (g: G) => playerCount(g) <= 2,
  },
  fns: {
    /** each investigator, in player order, makes the test */
    eachTest(g: G, ctx: EffCtx, args: { skill: Skill; difficulty: number; onFail: Effect[] }) {
      push(
        g,
        ...activeInvs(g).map((i) => ({
          t: "Effects" as const,
          effects: [
            {
              op: "skillTest" as const,
              skill: args.skill,
              difficulty: args.difficulty,
              onFail: args.onFail,
            },
          ],
          ctx: { ...ctx, you: i, inv: i },
        })),
      );
    },
    discardBystander(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = enemiesAt(g, inv(g, ctx.you!).location).filter((e) => e.code === "12123");
      if (!here.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Discard a Bystander",
        here.map((e) => ({ id: e.id, label: def(g, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick !== undefined) discard(g, pick);
    },
    /** Lit Up: if they are still set aside, n set-aside Fire! go to the encounter discard pile */
    fireToDiscard(g: G, _ctx: EffCtx, n: number) {
      for (const c of setAside(g, FIRE).slice(0, n)) moveCard(g, c.id, "encounterDiscard");
    },
    drawFire(g: G, ctx: EffCtx) {
      drawFire(g, ctx.you ?? g.s.lead);
    },
    leadDrawsFire(g: G) {
      drawFire(g, g.s.lead);
    },
    /** Up in Flames: each investigator who has not resigned is defeated and suffers 1 physical trauma */
    upInFlames(g: G) {
      for (const i of activeInvs(g)) push(g, { t: "Defeated", inv: i, by: "damage" });
    },
    /** an act advanced at the end of the round by spending clues (at Orne Library, for `at`) */
    endOfRoundAdvance(g: G, _ctx: EffCtx, at: string | undefined, step?: Step) {
      if (!g.s.act) return;
      const cost = (def(g, g.s.act).actClues ?? 0) * playerCount(g);
      const loc = at ? findByCode(g, at, ["location"])?.id : undefined;
      const who = activeInvs(g).filter((i) => !loc || inv(g, i).location === loc);
      const clues = at ? who.reduce((n, i) => n + inv(g, i).clues, 0) : spendableGroupClues(g);
      if (!who.length || clues < cost) return;
      const yes = ask<boolean>(
        g,
        step!,
        g.s.lead,
        "generic",
        `Spend ${cost} clues as a group to advance the act?`,
        [
          { id: "yes", label: `Advance act (spend ${cost} clues)`, value: true },
          { id: "no", label: "Not yet", value: false },
        ],
        { key: "chooseOne" },
      );
      if (!yes) return;
      let n = cost;
      for (const i of [g.s.lead, ...who.filter((x) => x !== g.s.lead)].filter((x) =>
        who.includes(x),
      )) {
        const take = Math.min(n, inv(g, i).clues);
        inv(g, i).clues -= take;
        n -= take;
      }
      push(g, { t: "AdvanceAct" });
    },
    /** ...There's Fire: the dorms and the quad, the Servant of Flame, Fire! in your friend's room */
    thereIsFire(g: G) {
      discardEnemies(g);
      for (const code of [DORMS, QUAD]) {
        const c = setAside(g, code)[0];
        if (c) moveCard(g, c.id, "location");
      }
      const servant = setAside(g, SERVANT)[0];
      const dorms = findByCode(g, DORMS, ["location"]);
      if (servant && dorms) {
        moveCard(g, servant.id, "limbo");
        push(g, { t: "Spawn", enemy: servant.id, inv: null, at: dorms.id });
      }
      const room = findByCode(g, ROOM, ["location"]);
      const fires = setAside(g, FIRE);
      if (room && fires.length) {
        moveCard(g, fires[0].id, "attached", { location: room.id });
        emit(g, "attach", `Fire! is attached to ${def(g, room.id).name}`, { card: fires[0].id });
      }
      for (const c of setAside(g, FIRE)) moveCard(g, c.id, "encounterDiscard");
    },
    /** In the Open: the Servant set aside, healed; enemies discarded; your friend's room gone; the campus opens */
    inTheOpen(g: G) {
      const servant = Object.values(g.s.cards).find(
        (c) => c.code === SERVANT && c.zone !== "setAside" && c.zone !== "removed",
      );
      if (servant) moveCard(g, servant.id, "setAside");
      delete g.s.flags[`defeated:${SERVANT}`];
      discardEnemies(g);
      const room = findByCode(g, ROOM, ["location"]);
      if (room) {
        const quad = findByCode(g, QUAD, ["location"]);
        for (const i of activeInvs(g))
          if (inv(g, i).location === room.id && quad) inv(g, i).location = quad.id;
        card(g, room.id).clues = 0;
        moveCard(g, room.id, "removed");
      }
      for (const name of ["Orne Library", "Science Hall", "Warren Observatory"]) {
        const c = Object.values(g.s.cards).find(
          (x) => x.zone === "setAside" && def(g, x.id).name === name,
        );
        if (c) moveCard(g, c.id, "location");
      }
    },
    /** The Servant Unleashed: Dr. Armitage joins, the Servant returns to the quad, clues there, Fire! for the lead */
    servantUnleashed(g: G, _ctx: EffCtx, _args: unknown, step?: Step) {
      const armitage = setAside(g, "12115")[0];
      if (armitage) {
        const who = ask<InvId>(
          g,
          step!,
          g.s.lead,
          "target",
          "Who takes control of Dr. Henry Armitage?",
          activeInvs(g).map((i) => ({
            id: i,
            label: invName(g, i),
            card: inv(g, i).cardId,
            value: i,
          })),
          { auto: true, key: "chooseInvestigator" },
        );
        if (who === undefined) return;
        // he takes up no ally slot during this scenario: no slot check
        moveCard(g, armitage.id, "play");
        card(g, armitage.id).controller = who;
        emit(g, "control", `${invName(g, who)} takes control of Dr. Henry Armitage`, {
          inv: who,
          card: armitage.id,
        });
      }
      const quad = locationByName(g, "Miskatonic Quad");
      const servant = setAside(g, SERVANT)[0];
      if (servant && quad) {
        card(g, servant.id).damage = 0;
        moveCard(g, servant.id, "limbo");
        push(g, { t: "Spawn", enemy: servant.id, inv: null, at: quad.id });
      }
      if (quad) card(g, quad.id).clues += 3 * playerCount(g);
      // the lead searches the encounter deck and discard pile for 1 Fire! per investigator and draws them
      const fires = [...g.s.encounterDeck, ...g.s.encounterDiscard]
        .filter((id) => g.s.cards[id].code === FIRE)
        .slice(0, playerCount(g));
      for (const id of fires) {
        moveCard(g, id, "limbo");
        push(g, { t: "Revelation", inv: g.s.lead, card: id });
      }
      shuffle(g.s, g.s.encounterDeck);
    },
  },
  hooks: {
    checkObjectives(g: G) {
      const act = g.s.act ? card(g, g.s.act).code : null;
      if (act === "12110") {
        const quad = findByCode(g, QUAD, ["location"]);
        const live = activeInvs(g);
        if (quad && live.length && live.every((i) => inv(g, i).location === quad.id))
          push(g, { t: "AdvanceAct" });
      }
      if (act === "12112" && g.s.flags[`defeated:${SERVANT}`]) push(g, { t: "AdvanceAct" });
    },
  },
} satisfies CardScript;
