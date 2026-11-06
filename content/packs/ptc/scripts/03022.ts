// "Let me handle this!" — after another investigator draws a non-peril encounter card, before it resolves: you are
// considered to have drawn it, with +2 to each of your skills while its revelation resolves
import {
  addTempMod,
  card,
  type CardScript,
  cancelEvent,
  def,
  type GameContext,
  moveCard,
  queue,
  removeTempMods,
  resolveRevelation,
  runScript,
  type ScriptRun,
  spawn,
  ZONE,
} from "../../../../src/engine/api";

const SKILLS = ["willpower", "intellect", "combat", "agility"] as const;

export default {
  abilities: [
    {
      kind: "reaction",
      fromHand: true,
      trigger: "encounterDrawn",
      label: '"Let me handle this!": you draw that encounter card instead',
      usableBy: "anyone",
      condition: {
        all: [
          { not: { eventInvestigatorIsYou: true } },
          { not: { eventCard: { keyword: "peril" } } },
        ],
      },
      run: "handle",
    },
  ],
  fns: {
    handle(game: GameContext, run: ScriptRun) {
      const drawn = run.ctx.card;
      if (!drawn || !run.ctx.key || card(game, drawn).zone !== ZONE.Resolving) return;
      // the other investigator's draw is called off without discarding the card: it is yours now
      cancelEvent(game, run.ctx.key);
      moveCard(game, drawn, ZONE.Limbo);
      for (const s of SKILLS) addTempMod(game, { stat: s, value: 2 }, run.you, "phase", run.source);
      queue(
        game,
        def(game, drawn).type === "enemy"
          ? spawn({ enemy: drawn, inv: run.you })
          : resolveRevelation({ inv: run.you, card: drawn }),
        runScript({ code: "03022", fn: "done", ctx: run.ctx }),
      );
    },
    /** the +2 lasts while the revelation resolves */
    done(game: GameContext, run: ScriptRun) {
      removeTempMods(game, run.source);
    },
  },
} satisfies CardScript;
