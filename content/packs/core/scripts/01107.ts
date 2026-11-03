// They're Getting Out! (The Gathering, agenda 3)
import {
  canEnemyEnter,
  type CardScript,
  currentAct,
  currentAgenda,
  def,
  emit,
  enemies,
  findByCode,
  type GameContext,
  inv,
  setCardLocation,
  stepsToward,
  turnOrder,
  EVENT,
  ZONE,
  queue,
  placeDoom,
  endScenario,
  defeatInvestigator,
} from "../../../../src/engine/api";

const ghouls = (game: GameContext) =>
  enemies(game).filter((e) => def(game, e.id).traits.includes("Ghoul"));

export default {
  abilities: [
    { kind: "forced", trigger: "enemyPhaseEnds", run: "ghoulsMove" },
    { kind: "forced", trigger: "roundEnds", run: "ghoulDoom" },
    { kind: "revelation", run: "back" },
  ],
  fns: {
    ghoulsMove(game: GameContext) {
      const parlor = findByCode(game, "01115", [ZONE.Location]);
      if (!parlor) return;
      for (const e of ghouls(game)) {
        if (e.engagedWith || !e.location) continue;
        const next = stepsToward(game, e.location, [parlor.id]).find((l) =>
          canEnemyEnter(game, e.id, l),
        );
        if (next) {
          const from = e.location;
          setCardLocation(game, e.id, next);
          emit(game, EVENT.EnemyMove, `${def(game, e.id).name} moves toward the Parlor`, {
            card: e.id,
            data: { from, to: next },
          });
        }
      }
    },
    ghoulDoom(game: GameContext) {
      const rooms = ["01112", "01115"]
        .map((c) => findByCode(game, c, [ZONE.Location])?.id)
        .filter(Boolean);
      const n = ghouls(game).filter((e) => rooms.includes(e.location!)).length;
      if (n && currentAgenda(game)) queue(game, placeDoom({ card: currentAgenda(game)!, n }));
    },
    back(game: GameContext) {
      const act = currentAct(game) ? (def(game, currentAct(game)!).stage ?? 1) : 3;
      if (act < 3) {
        queue(game, endScenario({ id: "R3" }));
        return;
      }
      // each investigator that has not resigned is defeated and suffers 1 physical trauma
      for (const i of turnOrder(game))
        if (inv(game, i).status === "playing")
          queue(game, defeatInvestigator({ inv: i, by: "damage" }));
    },
  },
} satisfies CardScript;
