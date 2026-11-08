// Sickening Reality (Return to The Last King, Dianne Devine's) — each investigator at the location of the Dianne Devine
// asset takes 1 horror; this card flips to its enemy side and takes her place, the asset leaving the game.
import {
  allCards,
  type CardScript,
  dealDamage,
  flip,
  type GameContext,
  type InstId,
  invsAt,
  moveCard,
  queue,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

export const DIANNE_ASSET = "52025";

/**
 * This story card takes the place of `card` (an asset at a location), that card leaving the game: each investigator
 * there takes the damage and horror, `then` resolves, then the story card flips to its enemy side there
 */
export function switchWith(
  game: GameContext,
  run: ScriptRun,
  card: InstId,
  hurt: { damage: number; horror: number },
  ...then: ReturnType<typeof flip>[]
) {
  const at = allCards(game).find((c) => c.id === card)?.location;
  moveCard(game, card, ZONE.Removed);
  if (!at) {
    moveCard(game, run.source, ZONE.Removed);
    return;
  }
  moveCard(game, run.source, ZONE.SetAside, { location: at });
  queue(
    game,
    ...invsAt(game, at).map((i) =>
      dealDamage({ inv: i, ...hurt, direct: false, source: run.source }),
    ),
    ...then,
    flip(run.source),
  );
}

export default {
  abilities: [{ kind: "revelation", run: "turn" }],
  fns: {
    turn(game: GameContext, run: ScriptRun) {
      const her = allCards(game).find((c) => c.code === DIANNE_ASSET && c.zone === ZONE.Attached);
      if (!her) {
        moveCard(game, run.source, ZONE.Removed);
        return;
      }
      switchWith(game, run, her.id, { damage: 0, horror: 1 });
    },
  },
} satisfies CardScript;
