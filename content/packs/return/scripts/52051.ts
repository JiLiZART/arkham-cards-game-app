// Research Site (Return to The Pallid Mask; a Catacombs location) — [reaction] after you successfully investigate it:
// reveal any Catacombs location (group limit once per game). Forced: when it is revealed, the topmost Catacombs goes
// into play above, below or to the right of any other location (the revealer chooses the location, then the spot).
import {
  asString,
  card,
  type CardScript,
  cellOf,
  type GameContext,
  locationAt,
  locations,
  queue,
  revealLocation,
  runScript,
  type ScriptRun,
} from "../../../../src/engine/api";
import {
  catacombsOneOf,
  type Dir,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

const CODE = "52051";
const DIRS: Dir[] = ["above", "below", "right"];
const STEP: Record<Dir, [number, number]> = {
  left: [-1, 0],
  right: [1, 0],
  above: [0, -1],
  below: [0, 1],
};
/** a free spot above, below or to the right of the location */
const hasRoom = (game: GameContext, loc: string) => {
  const c = cellOf(game, loc);
  return !!c && DIRS.some((d) => !locationAt(game, [c[0] + STEP[d][0], c[1] + STEP[d][1]]));
};

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "successfulInvestigate",
      label: "Research Site: reveal any Catacombs location",
      limit: { per: "game", count: 1, group: true },
      condition: { all: [{ eventInvestigatorIsYou: true }, { script: "anyHidden" }] },
      run: "study",
    },
    { kind: "forced", trigger: "revealed", run: "reveal" },
  ],
  conditions: {
    anyHidden: (game: GameContext) => locations(game).some((l) => !l.revealed),
  },
  fns: {
    study(game: GameContext, run: ScriptRun) {
      const hidden = locations(game).filter((l) => !l.revealed);
      if (!hidden.length) return;
      const pick = run.chooseCard(
        hidden.map((l) => l.id),
        { text: "Reveal which Catacombs location?", key: "researchSiteReveal" },
      );
      queue(game, revealLocation(pick));
    },
    reveal(game: GameContext, run: ScriptRun) {
      const others = locations(game)
        .filter((l) => l.id !== run.source && hasRoom(game, l.id))
        .map((l) => l.id);
      if (!others.length) return;
      const at = run.chooseCard(others, {
        text: "Research Site: put the next Catacombs beside which location?",
        key: "researchSitePlace",
      });
      queue(game, runScript({ code: CODE, fn: "place", ctx: run.ctx, args: at }));
    },
    place(game: GameContext, run: ScriptRun) {
      const at = asString(run.args);
      if (at && card(game, at)) catacombsOneOf(game, run, at, DIRS);
    },
  },
} satisfies CardScript;
