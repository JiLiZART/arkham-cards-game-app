// The First Night (A Phantom of Truth, agenda 1; agendas 2 and 3 share its rule and its back's steps): while
// Conviction leads, the doom on other cards counts against this agenda's, not toward it. Back (Daybreak): each
// investigator disengages and may move to a connecting location; The Organist moves 1 location away from the nearest
// investigator.
import {
  card,
  type CardScript,
  connections,
  def,
  enemies,
  type GameContext,
  type HookRun,
  inv,
  type ScriptRun,
  setEngaged,
  turnOrder,
  queue,
  moveInvestigator,
  runScript,
} from "../../../../src/engine/api";
import {
  convictionLeads,
  doomInPlay,
  organistAway,
} from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";

const FIRST_NIGHT = "03201";

/** "doom on cards other than this agenda subtract from the total doom in play": below the threshold, no advance */
export function nightThreshold(game: GameContext, run: HookRun) {
  if (!convictionLeads(game)) return false;
  const own = card(game, run.source).doom;
  const others = doomInPlay(game) - own;
  return own - others < (def(game, run.source).doom ?? Infinity);
}

/** "Each investigator disengages … and may move to a connecting location. Move The Organist 1 location away …" */
export function daybreak(game: GameContext) {
  for (const i of turnOrder(game))
    for (const e of enemies(game).filter((x) => x.engagedWith === i)) setEngaged(game, e.id, null);
  queue(
    game,
    ...turnOrder(game).map((i) =>
      runScript({ code: FIRST_NIGHT, fn: "mayMove", ctx: { you: i, source: null } }),
    ),
    runScript({ code: FIRST_NIGHT, fn: "organistAway", ctx: { source: null } }),
  );
}

export default {
  abilities: [{ kind: "revelation", run: "daybreak" }],
  fns: {
    daybreak,
    mayMove(game: GameContext, run: ScriptRun) {
      const here = inv(game, run.you).location;
      if (!here || inv(game, run.you).status !== "playing") return;
      const to = run.choose<string | null>(
        [
          ...connections(game, here).map((l) => ({
            id: l,
            label: def(game, l).name,
            card: l,
            value: l,
          })),
          { id: "stay", label: "Stay", value: null, key: "option.apotStay" },
        ],
        { text: "You may move to a connecting location", key: "apotMayMove" },
        { auto: false },
      );
      if (to) queue(game, moveInvestigator({ inv: run.you, to }));
    },
    organistAway,
  },
  hooks: { doomThreshold: nightThreshold },
} satisfies CardScript;
