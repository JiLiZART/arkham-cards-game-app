// Teamwork — the investigators at your location give or trade Item and Ally assets and resources, one at a time, until
// done (you make the choices for the group)
import {
  addCounter,
  argField,
  asString,
  card,
  type CardScript,
  checkSlots,
  def,
  emit,
  EVENT,
  type GameContext,
  inv,
  invName,
  invsAt,
  queue,
  runScript,
  type ScriptRun,
  setController,
  ZONE,
  cardsIn,
  CHOICE,
} from "../../../../src/engine/api";

const here = (game: GameContext, run: ScriptRun) => invsAt(game, inv(game, run.you).location);
const tradable = (game: GameContext, run: ScriptRun) =>
  cardsIn(game, ZONE.Play).filter(
    (c) =>
      !!c.controller &&
      here(game, run).includes(c.controller) &&
      def(game, c.id).type === "asset" &&
      def(game, c.id).traits.some((t) => t === "Item" || t === "Ally"),
  );

export default {
  abilities: [{ kind: "onPlay", run: "trade" }],
  fns: {
    trade(game: GameContext, run: ScriptRun) {
      const invs = here(game, run);
      if (invs.length < 2) return;
      const pick = run.choose<string>(
        [
          ...tradable(game, run).map((c) => ({
            id: `asset:${c.id}`,
            label: `Give ${def(game, c.id).name}`,
            card: c.id,
            value: `asset:${c.id}`,
            key: "option.teamworkAsset",
            vars: { code: c.code },
          })),
          ...invs
            .filter((i) => inv(game, i).resources > 0)
            .map((i) => ({
              id: `res:${i}`,
              label: `Give 1 resource from ${invName(game, i)}`,
              card: inv(game, i).cardId,
              value: `res:${i}`,
              key: "option.teamworkResource",
              vars: { inv: i },
            })),
          { id: "done", label: "Done", value: "done", key: "option.done" },
        ],
        { text: "Teamwork: give or trade", key: "teamwork" },
        { auto: false, kind: CHOICE.Generic },
      );
      if (pick === "done") return;
      queue(game, runScript({ code: "02018", fn: "give", ctx: run.ctx, args: { what: pick } }));
    },
    give(game: GameContext, run: ScriptRun) {
      const what = asString(argField(run.args, "what")) ?? "";
      const [kind, id] = what.split(/:(.*)/s);
      const from = kind === "asset" ? card(game, id).controller : id;
      if (!from) return;
      const to = run.chooseInvestigator(
        here(game, run).filter((i) => i !== from),
        { text: "Choose who receives it", key: "teamworkTo" },
      );
      if (kind === "asset") {
        setController(game, id, to);
        emit(game, EVENT.Control, `${invName(game, to)} takes control of ${def(game, id).name}`, {
          inv: to,
          card: id,
        });
      } else {
        addCounter(game, from, "resources", -1);
        addCounter(game, to, "resources", 1);
        emit(
          game,
          EVENT.Resource,
          `${invName(game, from)} gives 1 resource to ${invName(game, to)}`,
          {
            inv: to,
            data: { n: 1 },
          },
        );
      }
      queue(
        game,
        ...(kind === "asset" ? [checkSlots({ inv: to, card: id })] : []),
        runScript({ code: "02018", fn: "trade", ctx: run.ctx }),
      );
    },
  },
} satisfies CardScript;
