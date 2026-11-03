// Paint the Town Red — draw a non-Elite enemy from the top 9 of the encounter deck; gain resources equal to its printed health
import {
  addCounter,
  type CardScript,
  def,
  emit,
  type GameContext,
  type InstId,
  inv,
  isElite,
  moveCard,
  pile,
  push,
  shuffleDeck,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", designator: "parley", run: "paint" }],
  fns: {
    paint(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const top = pile(game, ZONE.EncounterDeck).slice(0, 9);
      const pool = top.filter((id) => def(game, id).type === "enemy" && !isElite(game, id));
      const pick = run.choose<InstId | "none">(
        [
          ...pool.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          { id: "none", label: "Take nothing", value: "none" },
        ],
        { text: "Paint the Town Red: draw an enemy", key: "searchTop", vars: { n: 9 } },
        {
          auto: false,
          kind: CHOICE.Generic,
          who: you,
          shown: top.filter((id) => !pool.includes(id)),
        },
      );
      if (pick !== "none") {
        const health = def(game, pick).enemy?.health ?? 0;
        moveCard(game, pick, ZONE.Limbo);
        addCounter(game, you, "resources", health);
        emit(
          game,
          EVENT.Encounter,
          `${inv(game, you).name} draws ${def(game, pick).name} and gains ${health} resources`,
          {
            inv: you,
            card: pick,
            data: { n: health },
          },
        );
        push(game, { t: STEP.Spawn, enemy: pick, inv: you });
      }
      shuffleDeck(game, "encounter");
    },
  },
} satisfies CardScript;
