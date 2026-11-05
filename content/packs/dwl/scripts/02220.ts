// Kidnapped! — revelation: with no Ally asset, take 2 damage and discard it; else test willpower (4) or agility (4), on
// a failure one of your Allies joins the potential sacrifices, and it attaches to the current agenda. Forced, when that
// agenda advances: a potential sacrifice at random goes underneath the agenda deck
import {
  attachTo,
  type CardScript,
  controlled,
  currentAgenda,
  def,
  emit,
  type GameContext,
  moveCard,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffects,
  runScript,
} from "../../../../src/engine/api";
import {
  sacrifice,
  SACRIFICES,
} from "../../../campaigns/the-dunwich-legacy/scripts/blood-on-the-altar";

const allies = (game: GameContext, you: string) =>
  controlled(game, you)
    .filter((c) => def(game, c.id).type === "asset" && def(game, c.id).traits.includes("Ally"))
    .map((c) => c.id);

export default {
  abilities: [
    { kind: "revelation", run: "kidnap" },
    { kind: "forced", trigger: "agendaAdvances", run: "sacrifice" },
  ],
  fns: {
    kidnap(game: GameContext, run: ScriptRun) {
      if (!allies(game, run.you).length) {
        queue(game, resolveEffects({ effects: [{ op: "takeDamage", amount: 2 }], ctx: run.ctx }));
        return;
      }
      queue(
        game,
        resolveEffects({
          effects: [
            {
              op: "skillTest",
              skill: ["willpower", "agility"],
              difficulty: 4,
              onFail: [{ op: "script", fn: "taken" }],
            },
          ],
          ctx: run.ctx,
        }),
        runScript({ code: "02220", fn: "attach", ctx: run.ctx }),
      );
    },
    /** an Ally the investigator controls joins the potential sacrifices */
    taken(game: GameContext, run: ScriptRun) {
      const options = allies(game, run.you);
      if (!options.length) return;
      const ally = run.chooseCard(options, {
        text: "Choose an Ally to add to the potential sacrifices",
        key: "kidnappedAlly",
      });
      moveCard(game, ally, ZONE.SideDeck, { deck: SACRIFICES });
      emit(game, EVENT.Discard, `${def(game, ally).name} is kidnapped`, {
        inv: run.you,
        card: ally,
      });
    },
    attach(game: GameContext, run: ScriptRun) {
      const agenda = currentAgenda(game);
      if (!agenda) return;
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, agenda);
      emit(game, EVENT.Attach, `Kidnapped! is attached to ${def(game, agenda).name}`, {
        card: run.source,
      });
    },
    sacrifice(game: GameContext, run: ScriptRun) {
      if (run.ctx.card) sacrifice(game, run.ctx.card);
    },
  },
} satisfies CardScript;
