// Creature Out of Demhe (Dim Carcosa): spawns at Depths of Demhe, massive (data). "When Creature out of Demhe's
// location or a connecting location is flipped over, if Creature out of Demhe is ready: It attacks each investigator
// at that location": the scenario's flipLocation asks for these attacks before the location flips.
import {
  attackKey,
  type CardScript,
  enemies,
  type GameContext,
  type InstId,
  invsAt,
  type Queued,
  enemyAttacks,
} from "../../../../src/engine/api";

export const CREATURE = "03335";

/** each ready Creature out of Demhe at or beside the flipped location attacks each investigator there */
export function creatureAttacks(game: GameContext, loc: InstId, near: InstId[]): Queued[] {
  return enemies(game)
    .filter((e) => e.code === CREATURE && !e.exhausted && !!e.location && near.includes(e.location))
    .flatMap((e) =>
      invsAt(game, loc).map((i) =>
        enemyAttacks({ enemy: e.id, inv: i, aoo: false, key: attackKey(game) }),
      ),
    );
}

export default {} satisfies CardScript;
