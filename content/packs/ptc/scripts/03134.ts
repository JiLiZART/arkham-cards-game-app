// Historical Society (Reading Room) — [action]: Investigate. If you succeed, instead of discovering clues, take 1 doom
// off an enemy with doom: it becomes a clue on you. (Group limit once per round.)
import {
  addCounter,
  type CardScript,
  def,
  emit,
  enemies,
  type GameContext,
  invName,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "action",
      designator: "investigate",
      usableBy: "atLocation",
      label: "Reading Room: investigate to take 1 doom off an enemy as a clue",
      limit: { per: "round", count: 1, group: true },
      effects: [{ op: "investigate", insteadOfClues: [{ op: "script", fn: "doomToClue" }] }],
    },
  ],
  fns: {
    doomToClue(game: GameContext, run: ScriptRun) {
      const withDoom = enemies(game).filter((e) => e.doom > 0);
      if (!withDoom.length) return;
      const e = run.chooseCard(
        withDoom.map((x) => x.id),
        { text: "Choose an enemy with doom on it", key: "eotpReadingRoom" },
      );
      addCounter(game, e, "doom", -1);
      addCounter(game, run.you, "clues", 1);
      emit(
        game,
        EVENT.Clues,
        `${invName(game, run.you)} takes 1 doom off ${def(game, e).name} as a clue`,
        {
          inv: run.you,
          card: e,
          data: { n: 1 },
        },
      );
    },
  },
} satisfies CardScript;
