// Hunting Horror (The Miskatonic Museum) — at the start of the enemy phase a random token is revealed: a symbol or the
// tentacles ready it; when it leaves play it goes to the void (`leavesPlay` in cards.json). The museum's cards look for
// it in the encounter deck, its discard pile and the void through the helpers here
import {
  type CardScript,
  def,
  emit,
  findByCode,
  type GameContext,
  type InstId,
  type InvId,
  moveCard,
  ready,
  shuffleDeck,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffect,
  spawn,
} from "../../../../src/engine/api";

export const HORROR = "02141";

/** the Hunting Horror in play, if it is */
export const horrorInPlay = (game: GameContext) => findByCode(game, HORROR, [ZONE.Enemy]);

/** "search the encounter deck, discard pile, and the void for Hunting Horror and spawn it" at a location (`at`), or
 * at `engage`'s location engaged with them; nothing when it is in play */
export function spawnHorror(game: GameContext, where: { at: InstId } | { engage: InvId }) {
  const h = findByCode(game, HORROR, [ZONE.EncounterDeck, ZONE.EncounterDiscard, ZONE.Void]);
  if (!h) return;
  const fromDeck = h.zone === ZONE.EncounterDeck;
  moveCard(game, h.id, ZONE.Limbo);
  if (fromDeck) shuffleDeck(game, "encounter");
  queue(
    game,
    "at" in where
      ? spawn({ enemy: h.id, inv: null, at: where.at })
      : spawn({ enemy: h.id, inv: where.engage }),
  );
}

/** "If Hunting Horror is in play, add 1 doom to it": true when it was */
export function doomOnHorror(game: GameContext, run: ScriptRun) {
  const h = horrorInPlay(game);
  if (!h) return false;
  queue(
    game,
    resolveEffect({
      effect: { op: "placeDoom", amount: 1, on: "self" },
      ctx: { ...run.ctx, source: h.id },
    }),
  );
  return true;
}

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "phaseBegins",
      condition: { phase: "enemy" },
      effects: [
        {
          op: "revealToken",
          on: [
            {
              tokens: ["skull", "cultist", "tablet", "elderThing", "autoFail"],
              effects: [{ op: "script", fn: "ready" }],
            },
          ],
        },
      ],
    },
  ],
  fns: {
    ready(game: GameContext, run: ScriptRun) {
      ready(game, run.source);
      emit(game, EVENT.Ready, `${def(game, run.source).name} readies`, { card: run.source });
    },
  },
} satisfies CardScript;
