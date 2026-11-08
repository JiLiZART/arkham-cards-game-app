// Return to Echoes of the Past (setup card 52028): the base scenario's script, with the box's rules over it — a fourth
// floor, the Basement, two of its three Historical Societies in play below the Ground Floor with the third Quiet Halls
// (the scenario file's setup), and "after the investigators advance to act 2 or act 3: spawn a set-aside Keeper of the
// Oath in any empty Historical Society location" (the lead chooses which).
import {
  type CardScript,
  composeScript,
  def,
  enemiesAt,
  findByCode,
  type GameContext,
  type InstId,
  invsAt,
  leadInvestigator,
  locations,
  moveCard,
  queue,
  runScript,
  type ScriptRun,
  spawn,
  ZONE,
} from "../../../../src/engine/api";
import base, {
  FLOORS,
  isSociety,
  layFloors,
} from "../../the-path-to-carcosa/scripts/echoes-of-the-past";

const ID = "return-to-echoes-of-the-past";
const KEEPER = "52033";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    /** the base's three floors, and "the 3 [[Basement]] locations … form a bottom row below the 3 [[Ground Floor]]" */
    floors(game: GameContext) {
      layFloors(game, [...FLOORS, ["Basement", 3]]);
    },
    keeper(game: GameContext, run: ScriptRun) {
      const keeper = findByCode(game, KEEPER, [ZONE.SetAside]);
      const empty = locations(game)
        .filter(
          (l) =>
            isSociety(game, l.id) && !invsAt(game, l.id).length && !enemiesAt(game, l.id).length,
        )
        .map((l) => l.id);
      if (!keeper || !empty.length) return;
      const at = run.chooseCard(
        empty,
        {
          text: "Keeper of the Oath spawns at which empty Historical Society?",
          key: "keeperSpawn",
        },
        { who: run.you },
      );
      moveCard(game, keeper.id, ZONE.Limbo);
      queue(game, spawn({ enemy: keeper.id, inv: null, at }));
    },
  },
  hooks: {
    actAdvanced(game: GameContext, act: InstId) {
      const stage = def(game, act).stage;
      if (stage === 2 || stage === 3)
        queue(
          game,
          runScript({ code: ID, fn: "keeper", ctx: { source: null, you: leadInvestigator(game) } }),
        );
    },
  },
};

export default composeScript(base, returnTo);
