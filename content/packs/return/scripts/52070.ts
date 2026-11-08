// The Sign of Hastur — Peril. Revelation: attach it to the current agenda or the current act (limit 1 per agenda/act).
// Forced, each time an investigator takes 1 or more horror: they take 1 additional horror.
import {
  allCards,
  attachTo,
  type CardScript,
  currentAct,
  currentAgenda,
  def,
  type EffCtx,
  emit,
  EVENT,
  flags,
  type GameContext,
  type InstId,
  moveCard,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

const SIGN = "52070";
/** the agenda or act has no Sign of Hastur attached yet */
const free = (game: GameContext, to: InstId | null): to is InstId =>
  !!to &&
  !allCards(game).some((c) => c.code === SIGN && c.zone === ZONE.Attached && c.attachedTo === to);

export default {
  abilities: [
    { kind: "revelation", run: "attach" },
    { kind: "forced", trigger: "damageDealt", condition: { script: "takesHorror" }, run: "more" },
  ],
  conditions: {
    takesHorror: (_game: GameContext, ctx: EffCtx) => !!ctx.inv && (ctx.dealt?.[1] ?? 0) > 0,
  },
  fns: {
    attach(game: GameContext, run: ScriptRun) {
      const agenda = currentAgenda(game);
      const act = currentAct(game);
      const options = [
        ...(free(game, agenda)
          ? [
              {
                id: "agenda",
                label: "Attach it to the current agenda",
                value: agenda,
                key: "option.signOfHastur.agenda",
              },
            ]
          : []),
        ...(free(game, act)
          ? [
              {
                id: "act",
                label: "Attach it to the current act",
                value: act,
                key: "option.signOfHastur.act",
              },
            ]
          : []),
      ];
      // both have one: it has nowhere to go and is discarded
      if (!options.length) return;
      const to = run.choose<InstId>(options, {
        text: "The Sign of Hastur: attach it",
        key: "signOfHastur",
      });
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, to);
      emit(game, EVENT.Attach, `The Sign of Hastur is attached to ${def(game, to).name}`, {
        card: run.source,
      });
    },
    /** 1 more horror in the same assignment, so it can't trigger itself again */
    more(game: GameContext, run: ScriptRun) {
      const key = run.ctx.key;
      if (!key) return;
      const [d, h] = flags.prevented.get(game, key) ?? [0, 0];
      flags.prevented.set(game, key, [d, h - 1]);
    },
  },
} satisfies CardScript;
