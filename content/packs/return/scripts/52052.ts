// Sea of Skulls (Return to The Pallid Mask; a Catacombs location) — Forced: after you end your turn there, take 1 direct
// horror or choose and discard 3 cards from your hand. Forced: when it is revealed, the topmost Catacombs goes into play
// above, below or to the right of the location farthest from it (the revealer choosing among the farthest, then the
// spot), marked with a horror token; for the rest of the game Sea of Skulls connects to the marked location (the
// scenario's `connections` hook reads `seaLinked`).
import {
  addCounter,
  asString,
  type CardScript,
  cellOf,
  distances,
  flags,
  type GameContext,
  type InstId,
  locationAt,
  locations,
  queue,
  runScript,
  type ScriptRun,
} from "../../../../src/engine/api";
import {
  catacombsOneOf,
  type Dir,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

const CODE = "52052";
const DIRS: Dir[] = ["above", "below", "right"];
const OFFSET: Record<Dir, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  above: [0, -1],
  below: [0, 1],
};
const spots = (game: GameContext, loc: InstId) => {
  const c = cellOf(game, loc);
  return c ? DIRS.map((d) => [c[0] + OFFSET[d][0], c[1] + OFFSET[d][1]] as [number, number]) : [];
};
/** the location marked by Sea of Skulls, connected to it for the rest of the game */
export const seaLinked = (game: GameContext, loc: InstId) =>
  flags.rememberedFact.get(game, `rtpmSeaLink:${loc}`) === true;

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "turnEnds",
      condition: { eventAtThisLocation: true },
      effects: [
        {
          op: "chooseOne",
          options: [
            {
              label: "Take 1 direct horror",
              effects: [{ op: "takeHorror", amount: 1, direct: true }],
            },
            {
              label: "Choose and discard 3 cards from your hand",
              condition: { cardsInHand: { min: 3 } },
              effects: [{ op: "discardFromHand", amount: 3 }],
            },
          ],
        },
      ],
    },
    { kind: "forced", trigger: "revealed", run: "reveal" },
  ],
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      const dist = distances(game, run.source);
      const room = locations(game).filter(
        (l) => l.id !== run.source && spots(game, l.id).some((c) => !locationAt(game, c)),
      );
      if (!room.length) return;
      const far = Math.max(...room.map((l) => dist.get(l.id) ?? 0));
      const at = run.chooseCard(
        room.filter((l) => (dist.get(l.id) ?? 0) === far).map((l) => l.id),
        {
          text: "Sea of Skulls: put the next Catacombs beside which location?",
          key: "seaOfSkullsPlace",
        },
      );
      queue(game, runScript({ code: CODE, fn: "place", ctx: run.ctx, args: at }));
    },
    place(game: GameContext, run: ScriptRun) {
      const at = asString(run.args);
      if (!at) return;
      const before = new Set(locations(game).map((l) => l.id));
      catacombsOneOf(game, run, at, DIRS);
      const placed = locations(game).find((l) => !before.has(l.id));
      if (!placed) return;
      addCounter(game, placed.id, "horror", 1);
      flags.rememberedFact.set(game, `rtpmSeaLink:${placed.id}`, true);
    },
  },
} satisfies CardScript;
