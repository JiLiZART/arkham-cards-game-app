// Searching for Izzie — attached to the location farthest from Jenny; if it is still in play when the game ends, she
// suffers 1 mental trauma (its investigate is in cards.json)
import {
  addCounter,
  card,
  type CardScript,
  def,
  distances,
  emit,
  EVENT,
  type GameContext,
  type HookRun,
  inv,
  locations,
  moveCard,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

export default {
  fns: {
    farthest(game: GameContext, run: ScriptRun) {
      const from = inv(game, run.you).location;
      const d = from ? distances(game, from) : new Map<string, number>();
      const far = Math.max(-1, ...locations(game).map((l) => d.get(l.id) ?? -1));
      const at = run.chooseCard(
        locations(game)
          .filter((l) => (d.get(l.id) ?? -1) === far)
          .map((l) => l.id),
        { text: "Choose the location farthest from you", key: "farthestLocation" },
      );
      moveCard(game, run.source, ZONE.Attached, { location: at });
      emit(game, EVENT.Attach, `Searching for Izzie is attached to ${def(game, at).name}`, {
        card: run.source,
      });
    },
  },
  hooks: {
    gameEnd(game: GameContext, run: HookRun) {
      const c = card(game, run.source);
      if (c.zone === ZONE.Attached && c.owner) addCounter(game, c.owner, "mentalTrauma", 1);
    },
  },
} satisfies CardScript;
