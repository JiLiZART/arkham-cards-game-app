// The Way Out (The Pallid Mask, act 3a): at the end of each round, with The Gate to Hell in play, the location
// farthest from it is discarded: each investigator there moves to a connecting location of their choice and each enemy
// there to one too, each taking 2 damage. Objective (the scenario's check): each undefeated investigator at The Gate to
// Hell. Back (The Catacombs Collapse): Resolution 1.
import {
  asString,
  card,
  type CardScript,
  connections,
  def,
  distances,
  emit,
  enemies,
  findByCode,
  type GameContext,
  inv,
  invsAt,
  locations,
  placeInvestigator,
  type ScriptRun,
  setCardLocation,
  setEngaged,
  EVENT,
  ZONE,
  queue,
  damageEnemy,
  dealDamage,
  endScenario,
  removeLocation,
  runScript,
} from "../../../../src/engine/api";
import { GATE } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

const CODE = "03245";

export default {
  abilities: [
    { kind: "forced", trigger: "roundEnds", condition: { script: "gateInPlay" }, run: "collapse" },
    { kind: "revelation", run: "wayOut" },
  ],
  conditions: {
    gateInPlay: (game: GameContext) => !!findByCode(game, GATE, [ZONE.Location]),
  },
  fns: {
    collapse(game: GameContext, run: ScriptRun) {
      const gate = findByCode(game, GATE, [ZONE.Location]);
      if (!gate) return;
      const dist = distances(game, gate.id);
      const others = locations(game).filter((l) => l.id !== gate.id && dist.has(l.id));
      if (!others.length) return;
      const far = Math.max(...others.map((l) => dist.get(l.id)!));
      const doomed = run.chooseCard(
        others.filter((l) => dist.get(l.id) === far).map((l) => l.id),
        { text: "Which location collapses?", key: "tpmCollapse" },
        { who: run.you },
      );
      const ctx = { ...run.ctx, location: doomed };
      queue(
        game,
        ...invsAt(game, doomed).map((i) =>
          runScript({ code: CODE, fn: "flee", ctx: { ...ctx, you: i }, args: doomed }),
        ),
        runScript({ code: CODE, fn: "enemiesFlee", ctx, args: doomed }),
        removeLocation({ location: doomed, investigators: "defeat" }),
      );
    },
    /** an investigator at the collapsing location moves to a connecting one and takes 2 damage */
    flee(game: GameContext, run: ScriptRun) {
      const from = asString(run.args);
      if (!from || inv(game, run.you).location !== from) return;
      const exits = connections(game, from);
      if (!exits.length) return;
      const to = run.chooseCard(exits, { text: "Flee to which location?", key: "tpmFlee" });
      placeInvestigator(game, run.you, to);
      emit(game, EVENT.Move, `${inv(game, run.you).name} flees to ${def(game, to).name}`, {
        inv: run.you,
        card: to,
      });
      queue(
        game,
        dealDamage({ inv: run.you, damage: 2, horror: 0, direct: false, source: run.source }),
      );
    },
    /** each enemy still there moves to a connecting location and takes 2 damage */
    enemiesFlee(game: GameContext, run: ScriptRun) {
      const from = asString(run.args);
      if (!from) return;
      const exits = connections(game, from, true);
      for (const e of enemies(game).filter((x) => x.location === from)) {
        const to =
          exits.find((l) => invsAt(game, l).includes(card(game, e.id).engagedWith ?? "")) ??
          exits[0];
        if (!to) continue;
        if (
          card(game, e.id).engagedWith &&
          inv(game, card(game, e.id).engagedWith!).location !== to
        )
          setEngaged(game, e.id, null);
        setCardLocation(game, e.id, to);
        queue(game, damageEnemy({ enemy: e.id, amount: 2, by: null, source: run.source }));
      }
    },
    wayOut(game: GameContext) {
      queue(game, endScenario({ id: "R1" }));
    },
  },
} satisfies CardScript;
