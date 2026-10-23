// Queen of Ash: the sewers and the cistern, Elokoss's two sides, the harbinger's codex, the sluice gate
import {
  activeInvs,
  ask,
  card,
  cardsIn,
  def,
  discard,
  emit,
  enemies,
  findByCode,
  inv,
  invsAt,
  moveCard,
  playerCount,
  push,
  shuffle,
  stepsToward,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";
import type { ChaosToken, Effect } from "../../../../src/content/schema";
import { drawFire } from "../../../packs/core_2026/scripts/12129";

const FIRE = "12129";
const CISTERN = "12174";
const SLUICE = "12175";
const TUNNELS = ["12183", "12184", "12185", "12186", "12187"];

const setAside = (g: G, code: string) =>
  Object.values(g.s.cards).filter((c) => c.code === code && c.zone === "setAside");
const cistern = (g: G) => findByCode(g, CISTERN, ["location"]);
const elokoss = (g: G) => enemies(g).find((e) => e.code === "12179" || e.code === "12179b");
const firesAt = (g: G, loc: InstId | null) =>
  cardsIn(g, "attached").filter((c) => c.code === FIRE && c.location === loc);
const BAG: Record<string, ChaosToken[]> = {
  easy: ["elderThing"],
  standard: ["elderThing", "tablet"],
  hard: ["elderThing", "tablet", "skull"],
  expert: ["elderThing", "tablet", "cultist", "skull"],
};

function eachTest(g: G, ctx: EffCtx, skill: "willpower", difficulty: number, onFail: Effect[]) {
  push(
    g,
    ...activeInvs(g).map((i) => ({
      t: "Effects" as const,
      effects: [{ op: "skillTest" as const, skill, difficulty, onFail }],
      ctx: { ...ctx, you: i, inv: i },
    })),
  );
}

/** the harbinger of Elokoss, unmasked: what they do for the investigators (the campaign log names them) */
const HARBINGER: [string, Effect[]][] = [
  [
    "david_harbinger",
    [{ op: "searchAndPlay", filter: { trait: ["Tome", "Spell"] }, costMod: -99, deckOnly: true }],
  ],
  ["cornelia_harbinger", [{ op: "heal", damage: 3 }]],
  ["naomi_harbinger", [{ op: "gainResources", amount: 5 }]],
  [
    "earl_harbinger",
    [
      {
        op: "searchAndPlay",
        filter: { type: "asset", trait: "Weapon" },
        costMod: -99,
        deckOnly: true,
      },
    ],
  ],
  [
    "abigail_harbinger",
    [
      {
        op: "chooseOne",
        options: [
          { label: "Draw 3 cards", effects: [{ op: "drawCards", amount: 3 }] },
          { label: "Draw 2 cards", effects: [{ op: "drawCards", amount: 2 }] },
          { label: "Draw 1 card", effects: [{ op: "drawCards", amount: 1 }] },
          { label: "Draw no cards", effects: [] },
        ],
      },
    ],
  ],
  ["margaret_harbinger", [{ op: "heal", horror: 3 }]],
];

export default {
  conditions: {
    fireHere: (g: G, ctx: EffCtx) => !!ctx.you && firesAt(g, inv(g, ctx.you).location).length > 0,
  },
  fns: {
    setup(g: G) {
      g.s.chaosBag.push(...BAG[g.s.difficulty]);
      if (g.s.campaignLog.scoured_arkham_for_answers) for (const i of g.s.order) inv(g, i).clues++;
      if (g.s.campaignLog.stirred_up_trouble) {
        // the cult has heard of your violence: 1 Cultist per investigator, each at a different Sewer Tunnels
        const cultists = Object.values(g.s.cards)
          .filter(
            (c) =>
              c.zone === "encounterDeck" &&
              ["ashen_pilgrims", "cultists_ch2"].includes(def(g, c.id).encounterSet ?? "") &&
              def(g, c.id).traits.includes("Cultist"),
          )
          .map((c) => c.id);
        shuffle(g.s, cultists);
        const tunnels = TUNNELS.map((t) => findByCode(g, t, ["location"])).filter(Boolean);
        cultists.slice(0, playerCount(g)).forEach((id, k) => {
          moveCard(g, id, "limbo");
          push(g, { t: "Spawn", enemy: id, inv: null, at: tunnels[k]!.id });
        });
      }
    },
    drawFire(g: G, ctx: EffCtx) {
      drawFire(g, ctx.you ?? g.s.lead);
    },
    /** Expert and Hard: at a Ritual Site, the tablet fails the test */
    ritualSiteFails(g: G, ctx: EffCtx) {
      const loc = inv(g, ctx.you!).location;
      if (g.s.skillTest && loc && def(g, loc).traits.includes("Ritual Site"))
        g.s.skillTest.autoFail = true;
    },
    flameInTheDark(g: G, ctx: EffCtx) {
      const servant = setAside(g, "12180")[0];
      const c = cistern(g);
      if (servant && c) {
        moveCard(g, servant.id, "limbo");
        push(g, { t: "Spawn", enemy: servant.id, inv: null, at: c.id });
      }
      eachTest(g, ctx, "willpower", 4, [{ op: "takeHorror", amount: 1, direct: true }]);
    },
    /** The Mother Arrives: Elokoss on her Mother of Flame side; special agenda 3a is the act and the agenda */
    motherArrives(g: G) {
      const c = cistern(g);
      const actOne = g.s.act && card(g, g.s.act).code === "12172";
      const faint = elokoss(g);
      if (actOne || !faint) {
        if (c && !card(g, c.id).revealed)
          push(g, { t: "Script", code: "__engine", fn: "revealLocation", ctx: { location: c.id } });
        const mother = setAside(g, "12179b")[0];
        if (mother && c) {
          moveCard(g, mother.id, "limbo");
          push(g, { t: "Spawn", enemy: mother.id, inv: null, at: c.id });
        }
      } else {
        // flipped: the same card, its damage and attachments kept
        faint.code = "12179b";
        emit(g, "flip", "Elokoss awakens: Mother of Flame", { card: faint.id });
      }
      if (g.s.act) moveCard(g, g.s.act, "removed");
      for (const id of g.s.actDeck.splice(0)) moveCard(g, id, "removed");
    },
    /** The Ritual Site: Elokoss stirs, Fire! for the investigator there, the knights and heralds join the deck, the sluice */
    ritualSite(g: G) {
      const c = cistern(g);
      const faint = setAside(g, "12179")[0];
      if (faint && c) {
        moveCard(g, faint.id, "limbo");
        push(g, { t: "Spawn", enemy: faint.id, inv: null, at: c.id });
      }
      const fires = setAside(g, FIRE);
      const there = c ? invsAt(g, c.id)[0] : undefined;
      if (fires[0] && there) {
        moveCard(g, fires[0].id, "limbo");
        push(g, { t: "Revelation", inv: there, card: fires[0].id });
      }
      for (const x of [...setAside(g, FIRE), ...setAside(g, "12177"), ...setAside(g, "12178")])
        moveCard(g, x.id, "encounterDeck");
      shuffle(g.s, g.s.encounterDeck);
      const sluice = setAside(g, SLUICE)[0];
      if (sluice) moveCard(g, sluice.id, "location");
    },
    douse(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = firesAt(g, inv(g, ctx.you!).location);
      if (!here.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Discard a Fire!",
        here.map((f) => ({ id: f.id, label: def(g, f.id).name, card: f.id, value: f.id })),
        { auto: true, key: "chooseOne" },
      );
      if (pick !== undefined) discard(g, pick);
    },
    /** each Cultist enemy moves once toward Underground Cistern */
    cultistsGather(g: G) {
      const c = cistern(g);
      if (!c) return;
      for (const e of enemies(g)) {
        if (!def(g, e.id).traits.includes("Cultist") || !e.location || e.location === c.id)
          continue;
        const next = stepsToward(g, e.location, [c.id])[0];
        if (!next) continue;
        e.location = next;
        e.engagedWith = null;
        emit(g, "enemyMove", `${def(g, e.id).name} moves to ${def(g, next).name}`, {
          card: e.id,
          data: { to: next },
        });
      }
    },
    /** the sluice gate opens: each enemy is defeated, and the deluge takes everyone who stayed (R3) */
    deluge(g: G) {
      for (const e of enemies(g))
        moveCard(g, e.id, def(g, e.id).victory !== undefined ? "victory" : "encounterDiscard");
      push(g, { t: "Resolution", id: "R3" });
    },
    codexPhi(g: G, ctx: EffCtx) {
      emit(
        g,
        "codex",
        "By defeating the Servant of Flame, you have brought them to their senses. As you take off their mask, they look up at you, confused.",
      );
      const found = HARBINGER.find(([key]) => g.s.campaignLog[key]);
      if (!found) return;
      for (const i of activeInvs(g))
        push(g, { t: "Effects", effects: found[1], ctx: { ...ctx, you: i, inv: i } });
    },
  },
  hooks: {
    checkObjectives(g: G) {
      const c = cistern(g);
      // its clues are always replenished
      if (c && card(g, c.id).revealed && card(g, c.id).clues === 0)
        card(g, c.id).clues = 2 * playerCount(g);
      const act = g.s.act ? card(g, g.s.act).code : null;
      if (act === "12172" && c && activeInvs(g).some((i) => inv(g, i).location === c.id)) {
        push(g, { t: "AdvanceAct" });
        return;
      }
      if (g.s.flags["defeated:12179"] || g.s.flags["defeated:12179b"])
        push(g, { t: "Resolution", id: "R1" });
    },
  },
} satisfies CardScript;
