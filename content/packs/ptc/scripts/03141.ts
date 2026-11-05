// Mr. Peabody — [action] Exhaust Mr. Peabody: choose a location. Until Mr. Peabody readies, it gets -1 shroud and
// gains the [[Passageway]] trait (Echoes of the Past's connections read it through `peabodysLocation`).
import {
  type CardScript,
  def,
  emit,
  flags,
  type GameContext,
  locations,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";
import { peabodysLocation } from "../../../campaigns/the-path-to-carcosa/scripts/echoes-of-the-past";

export default {
  abilities: [
    {
      kind: "action",
      label: "Mr. Peabody: a location gets -1 shroud and becomes a Passageway",
      cost: { exhaust: true },
      run: "guide",
    },
  ],
  modifiers(game: GameContext) {
    const at = peabodysLocation(game);
    return at ? [{ target: at, mod: { stat: "shroud" as const, value: -1 } }] : [];
  },
  fns: {
    guide(game: GameContext, run: ScriptRun) {
      const loc = run.chooseCard(
        locations(game).map((l) => l.id),
        { text: "Choose a location", key: "eotpPeabodyLocation" },
      );
      for (const l of locations(game)) flags.clearNamed(game, `eotpPeabody:${l.id}`);
      flags.setNamed(game, `eotpPeabody:${loc}`, true);
      emit(game, EVENT.Modify, `${def(game, loc).name} gets -1 shroud and is a Passageway`, {
        card: loc,
      });
    },
  },
} satisfies CardScript;
