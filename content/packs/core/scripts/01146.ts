// Investigating the Trail (Devourer Below, act 1) — back: Ritual Site enters play; cultists who got away spawn at the Main Path
import {
  campaignLogOf,
  type CardScript,
  createCard,
  findByCode,
  type GameContext,
  locationByName,
  moveCard,
  push,
  ZONE,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      const aside = findByCode(game, "01156", [ZONE.SetAside]);
      if (aside) moveCard(game, aside.id, ZONE.Location);
      const main = locationByName(game, "Main Path");
      const escaped = (campaignLogOf(game).cultistsGotAway as string[] | undefined) ?? [];
      for (const code of escaped) {
        const id = createCard(game, code, ZONE.Limbo);
        push(game, { t: STEP.Spawn, enemy: id, inv: null, at: main?.id ?? null });
      }
    },
  },
} satisfies CardScript;
