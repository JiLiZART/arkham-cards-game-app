// Historical Society, Dusty Archives (Return to Echoes of the Past, Basement) — while you have at least 1 hidden card in
// your hand you cannot investigate it (its unrevealed side's reveal on a spawn is the Echoes agendas' rule).
import {
  card,
  type CardScript,
  type GameContext,
  inv,
  invsAt,
  isHidden,
} from "../../../../src/engine/api";

export default {
  modifiers: (game: GameContext, id: string) =>
    card(game, id).revealed
      ? invsAt(game, id)
          .filter((i) => inv(game, i).hand.some((h) => isHidden(game, h)))
          .map((i) => ({ target: i, mod: { flag: "cannotInvestigate" as const } }))
      : [],
} satisfies CardScript;
