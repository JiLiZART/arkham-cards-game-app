// Altered Beast — with no Abomination enemy in play it surges; else it heals one of them and attaches to it (its forced
// horror on entering is in cards.json)
import {
  attachTo,
  type CardScript,
  def,
  emit,
  enemies,
  flags,
  type GameContext,
  moveCard,
  setCounter,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "alter" }],
  fns: {
    alter(game: GameContext, run: ScriptRun) {
      const abominations = enemies(game)
        .filter((e) => def(game, e.id).traits.includes("Abomination"))
        .map((e) => e.id);
      if (!abominations.length) {
        flags.surge.set(game, run.source, true);
        return;
      }
      const beast = run.chooseCard(abominations, {
        text: "Choose an Abomination enemy for Altered Beast",
        key: "alteredBeast",
      });
      setCounter(game, beast, "damage", 0);
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, beast);
      emit(game, EVENT.Attach, `Altered Beast is attached to ${def(game, beast).name}`, {
        card: run.source,
      });
    },
  },
} satisfies CardScript;
