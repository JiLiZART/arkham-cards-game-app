// Paint the Town Red — draw a non-Elite enemy from the top 9 of the encounter deck; gain resources equal to its printed health
import {
  addCounter,
  ask,
  type CardScript,
  def,
  type EffCtx,
  emit,
  type GameContext,
  type InstId,
  inv,
  isElite,
  moveCard,
  pile,
  push,
  shuffleDeck,
  type Step,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", designator: "parley", run: "paint" }],
  fns: {
    paint(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const top = pile(game, ZONE.EncounterDeck).slice(0, 9);
      const pool = top.filter((id) => def(game, id).type === "enemy" && !isElite(game, id));
      const pick = ask<InstId | "none">(
        game,
        step!,
        you,
        CHOICE.Generic,
        "Paint the Town Red: draw an enemy",
        [
          ...pool.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          { id: "none", label: "Take nothing", value: "none" },
        ],
        { key: "searchTop", vars: { n: 9 }, shown: top.filter((id) => !pool.includes(id)) },
      );
      if (pick === undefined) return;
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
