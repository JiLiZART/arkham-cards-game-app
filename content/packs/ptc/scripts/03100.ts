// The King's Edict — each [[Cultist]] enemy in play takes 1 clue from its location; until the end of the round each
// gets +1 fight for each clue and doom on it (counted as the edict resolves); no clue moved: it gains surge.
import {
  addCounter,
  addTempMod,
  card,
  type CardScript,
  def,
  emit,
  enemies,
  flags,
  type GameContext,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "edict" }],
  fns: {
    edict(game: GameContext, run: ScriptRun) {
      const cultists = enemies(game).filter((e) => def(game, e.id).traits.includes("Cultist"));
      let moved = 0;
      for (const e of cultists) {
        if (!e.location || card(game, e.location).clues <= 0) continue;
        addCounter(game, e.location, "clues", -1);
        addCounter(game, e.id, "clues", 1);
        moved++;
        emit(game, EVENT.Clues, `1 clue moves to ${def(game, e.id).name}`, {
          card: e.id,
          data: { n: 1, placed: true },
        });
      }
      for (const e of cultists) {
        const n = card(game, e.id).clues + card(game, e.id).doom;
        if (n) addTempMod(game, { stat: "fight", value: n }, e.id, "round", run.source);
      }
      if (!moved) flags.surge.set(game, run.source, true);
    },
  },
} satisfies CardScript;
