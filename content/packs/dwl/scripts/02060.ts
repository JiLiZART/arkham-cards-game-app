// "Jazz" Mulligan — revelation: into play at your location; uncontrolled, he can be parleyed with (intellect 3) and taken
// control of; his controller ignores the text of each unrevealed Miskatonic location
import {
  card,
  type CardScript,
  def,
  emit,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  locations,
  moveCard,
  setController,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";

/** Jazz goes into play at the investigator's location, controlled by no one */
export function jazzArrives(game: GameContext, jazz: InstId, i: InvId) {
  const at = inv(game, i).location;
  if (!at) return;
  moveCard(game, jazz, ZONE.Attached, { location: at });
  setController(game, jazz, null);
  emit(game, EVENT.Place, `"Jazz" Mulligan is at ${def(game, at).name}`, { card: jazz });
}

export default {
  abilities: [
    { kind: "revelation", run: "arrive" },
    {
      kind: "action",
      designator: "parley",
      label: '"Jazz" Mulligan: parley (intellect 3)',
      usableBy: "atLocation",
      condition: { controlled: false },
      effects: [
        {
          op: "skillTest",
          skill: "intellect",
          difficulty: 3,
          onSuccess: [{ op: "takeControl" }],
        },
      ],
    },
  ],
  fns: {
    arrive(game: GameContext, run: ScriptRun) {
      jazzArrives(game, run.source, run.you);
    },
  },
  ignores(game: GameContext, id: InstId, i: InvId) {
    const jazz = card(game, id);
    if (jazz.zone !== ZONE.Play || jazz.controller !== i) return [];
    return locations(game)
      .filter((l) => !l.revealed && def(game, l.id).traits.includes("Miskatonic"))
      .map((l) => l.id);
  },
} satisfies CardScript;
