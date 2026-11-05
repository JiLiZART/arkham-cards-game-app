// The Essex County Express: the train is one row of the map, left to right, the Engine Car rightmost; each car is linked
// to its neighbours, so a car leaving play (the agendas remove the leftmost) takes its links with it and the rest stays
// a line. Act 1 advances when an investigator enters the Engine Car, act 2 when its clues are gone; agenda 5's back
// defeats everyone (→R2), and every investigator defeated otherwise is no resolution, which the campaign plays as R2.
import {
  card,
  cardIf,
  type CardScript,
  cellOf,
  currentAct,
  def,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  inv,
  link,
  locationAt,
  locations,
  moveCard,
  placeInvestigator,
  setCell,
  shuffleList,
  turnOrder,
  ZONE,
  queue,
  advanceAct,
  endScenario,
} from "../../../../src/engine/api";

export const ENGINE_CARS = ["02175", "02176", "02177"];
export const TRAIN_CARS = ["02167", "02168", "02169", "02170", "02171", "02172", "02173", "02174"];
/** agenda 5's back has defeated everyone: the scenario ends in R2 */
export const SUCKED_IN = "essexSuckedIn";

/** the location next to this one on the map's row: to its left (-1) or its right (+1) */
export function besides(game: GameContext, loc: InstId | null, side: -1 | 1): InstId | null {
  const at = loc ? cellOf(game, loc) : null;
  return at ? locationAt(game, [at[0] + side, at[1]]) : null;
}

/** the cars in play, left to right */
export const train = (game: GameContext): InstId[] =>
  locations(game)
    .filter((l) => cellOf(game, l.id))
    .sort((a, b) => cellOf(game, a.id)![0] - cellOf(game, b.id)![0])
    .map((l) => l.id);

/** the Engine Car in play, by name: Return to The Essex County Express has a fourth */
export const engineCar = (game: GameContext) =>
  locations(game).find((l) => def(game, l.id).name === "Engine Car");

/** an unrevealed car can't be entered while the location to its left has clues on it */
export function lockedBehind(game: GameContext, id: InstId) {
  const c = card(game, id);
  if (c.zone !== ZONE.Location || c.revealed) return [];
  const left = besides(game, id, -1);
  return left && card(game, left).clues > 0
    ? [{ target: id, mod: { flag: "cannotMoveInto" as const } }]
    : [];
}

/** one Engine Car at random, six of the Train Cars at random to its left, the rest out of the game; everyone starts in
 * the leftmost (revealed by the setup, its forced effect not triggered). Return to The Essex County Express adds cars */
export function buildTrain(game: GameContext, trainCars: string[], engineCars: string[]) {
  const engines = [...engineCars];
  const cars = [...trainCars];
  shuffleList(game, engines);
  shuffleList(game, cars);
  const line = [...cars.slice(0, 6), engines[0]].map(
    (code) => findByCode(game, code, [ZONE.SetAside])!.id,
  );
  line.forEach((id, col) => {
    moveCard(game, id, ZONE.Location);
    setCell(game, id, [col, 0]);
    if (col) link(game, line[col - 1], id);
  });
  for (const code of [...cars.slice(6), ...engines.slice(1)])
    moveCard(game, findByCode(game, code, [ZONE.SetAside])!.id, ZONE.Removed);
  for (const i of turnOrder(game)) placeInvestigator(game, i, line[0]);
}

export default {
  fns: {
    train(game: GameContext) {
      buildTrain(game, TRAIN_CARS, ENGINE_CARS);
    },
  },
  hooks: {
    checkObjectives(game: GameContext) {
      const act = cardIf(game, currentAct(game))?.code;
      const engine = engineCar(game);
      if (!engine) return;
      // act 1: "if an investigator enters the Engine Car, immediately advance"
      if (act === "02165" && turnOrder(game).some((i) => inv(game, i).location === engine.id))
        queue(game, advanceAct());
      // act 2: "if there are no clues in the Engine Car, immediately advance"
      if (act === "02166" && engine.revealed && engine.clues === 0) queue(game, advanceAct());
    },
    allEliminated(game: GameContext) {
      queue(game, endScenario({ id: flags.named(game, SUCKED_IN) ? "R2" : "none" }));
    },
  },
} satisfies CardScript;
