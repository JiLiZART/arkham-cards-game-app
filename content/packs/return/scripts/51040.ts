// Hired Gun (Return to Blood on the Altar) — while it is in play, each Criminal enemy (itself too) gains Hunter and
// "Prey - Most resources", and each copy of Hunted Down gains peril and surge
import {
  allCards,
  type CardScript,
  def,
  enemies,
  type GameContext,
} from "../../../../src/engine/api";

const HUNTED_DOWN = "02099";

export default {
  modifiers(game: GameContext) {
    const criminals = enemies(game).filter((e) => def(game, e.id).traits.includes("Criminal"));
    return [
      ...criminals.flatMap((e) => [
        { target: e.id, mod: { keyword: "hunter" as const } },
        { target: e.id, mod: { prey: { highest: "resources" as const } } },
      ]),
      ...allCards(game)
        .filter((c) => c.code === HUNTED_DOWN)
        .flatMap((c) => [
          { target: c.id, mod: { keyword: "peril" as const } },
          { target: c.id, mod: { keyword: "surge" as const } },
        ]),
    ];
  },
} satisfies CardScript;
