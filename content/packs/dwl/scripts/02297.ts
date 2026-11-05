// Spaces Between (Where Doom Awaits) — revelation: each non-[[Sentinel Hill]] location turns to its unrevealed side, its
// clues gone; the investigators and enemies there move to the nearest [[Sentinel Hill]] location; the turned paths
// change places with each other (Diverging among Diverging, Altered among Altered), so no one knows which is which
import {
  activeInvs,
  card,
  type CardScript,
  cellOf,
  def,
  distances,
  emit,
  enemies,
  EVENT,
  type GameContext,
  type InstId,
  inv,
  locations,
  placeInvestigator,
  setCardLocation,
  setCell,
  setCounter,
  shuffleList,
  unreveal,
} from "../../../../src/engine/api";
import { relink } from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

const HILL = "Sentinel Hill";
const DIVERGING = ["02285", "02286", "02287", "02288"];

/** the nearest Sentinel Hill location to a location (ponytail: the first of a tie; the map never makes one) */
function nearestHill(game: GameContext, from: InstId): InstId | undefined {
  const d = distances(game, from);
  return locations(game)
    .filter((l) => def(game, l.id).traits.includes(HILL) && d.has(l.id))
    .sort((a, b) => d.get(a.id)! - d.get(b.id)!)[0]?.id;
}

export default {
  abilities: [{ kind: "revelation", run: "spaces" }],
  fns: {
    spaces(game: GameContext) {
      const flipped = locations(game)
        .filter((l) => !def(game, l.id).traits.includes(HILL))
        .map((l) => l.id);
      if (!flipped.length) return;
      for (const l of flipped) {
        unreveal(game, l);
        setCounter(game, l, "clues", 0);
      }
      relink(game);
      for (const l of flipped) {
        const to = nearestHill(game, l);
        if (!to) continue;
        for (const i of activeInvs(game).filter((x) => inv(game, x).location === l)) {
          placeInvestigator(game, i, to);
          emit(game, EVENT.Move, `${inv(game, i).name} moves to ${def(game, to).name}`, {
            inv: i,
            card: to,
            data: { from: l },
          });
        }
        for (const e of enemies(game).filter((x) => x.location === l))
          setCardLocation(game, e.id, to);
      }
      // the turned paths of each kind trade places on the map
      for (const kind of [true, false]) {
        const same = flipped.filter((l) => DIVERGING.includes(card(game, l).code) === kind);
        const cells = same.map((l) => cellOf(game, l));
        shuffleList(game, cells);
        same.forEach((l, k) => {
          const c = cells[k];
          if (c) setCell(game, l, c);
        });
      }
    },
  },
} satisfies CardScript;
