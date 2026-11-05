// Night Beyond Void (Return to The Miskatonic Museum) — 1 resource on Shadow-spawned, even set aside out of play (it keeps
// it when it is later attached to the Hunting Horror)
import {
  addCounter,
  type CardScript,
  emit,
  EVENT,
  findByCode,
  type GameContext,
  ZONE,
} from "../../../../src/engine/api";

/** "Place 1 resource on Shadow-spawned, even if it is out of play" */
export function shadowSpawnedGains(game: GameContext) {
  const shadow = findByCode(game, "02142", [ZONE.Attached, ZONE.SetAside]);
  if (!shadow) return;
  addCounter(game, shadow.id, "resources", 1);
  emit(game, EVENT.Place, "Shadow-spawned gains 1 resource", { card: shadow.id });
}

export default {
  abilities: [{ kind: "revelation", run: "night" }],
  fns: { night: shadowSpawnedGains },
} satisfies CardScript;
