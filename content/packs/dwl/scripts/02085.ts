// Light of Aforgomon — attached to the current agenda or act (one per card); while it is, all damage and horror are
// direct
import {
  attachTo,
  card,
  type CardScript,
  allCards,
  currentAct,
  currentAgenda,
  def,
  emit,
  type GameContext,
  type InstId,
  moveCard,
  turnOrder,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";

/** the agenda or act already holds a copy */
const taken = (game: GameContext, holder: InstId, code: string) =>
  allCards(game).some(
    (c) => c.code === code && c.zone === ZONE.Attached && c.attachedTo === holder,
  );

export default {
  abilities: [{ kind: "revelation", run: "attach" }],
  fns: {
    attach(game: GameContext, run: ScriptRun) {
      const code = card(game, run.source).code;
      const free = [currentAgenda(game), currentAct(game)].filter(
        (x): x is InstId => !!x && !taken(game, x, code),
      );
      if (!free.length) return;
      const to = run.chooseCard(free, {
        text: "Attach Light of Aforgomon to the agenda or the act",
        key: "aforgomonAttach",
      });
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, to);
      emit(game, EVENT.Attach, `Light of Aforgomon is attached to ${def(game, to).name}`, {
        card: run.source,
      });
    },
  },
  modifiers(game: GameContext, id: InstId) {
    if (card(game, id).zone !== ZONE.Attached || !card(game, id).attachedTo) return [];
    return turnOrder(game).map((i) => ({ target: i, mod: { flag: "directDamage" as const } }));
  },
} satisfies CardScript;
