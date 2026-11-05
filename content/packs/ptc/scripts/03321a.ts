// Search For the Stranger (v. I) (Dim Carcosa, act 2): each investigator cannot discover clues; The Man in the Pallid
// Mask cannot be defeated (the scenario's hook). Objective: the lead investigator at his location may spend 3 actions
// to advance. Its other side is The Pallid Mask (03321b), a story asset: it enters play under the lead's control, The
// Man in the Pallid Mask leaves the game, and Hastur (The Tattered King) spawns at the Palace of the King.
import {
  activeInvs,
  type CardScript,
  type EffCtx,
  emit,
  enemies,
  findByCode,
  type GameContext,
  inv,
  leadInvestigator,
  moveCard,
  setController,
  EVENT,
  ZONE,
  queue,
  advanceAct,
  spawn,
} from "../../../../src/engine/api";
import {
  MITPM,
  PALACE,
  PALLID_MASK,
  TATTERED_KING,
} from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

/** "Each investigator cannot discover clues" (every version of act 2) */
export const noClues = (game: GameContext) =>
  activeInvs(game).map((i) => ({ target: i, mod: { flag: "cannotDiscoverClues" as const } }));

/** The Man in the Pallid Mask leaves the game */
export function removeStranger(game: GameContext) {
  const him = enemies(game).find((e) => e.code === MITPM);
  if (!him) return null;
  const at = him.location;
  moveCard(game, him.id, ZONE.Removed);
  emit(game, EVENT.Remove, "The Man in the Pallid Mask is removed from the game", { card: him.id });
  return at;
}

export default {
  abilities: [
    {
      kind: "action",
      usableBy: "anyone",
      actionCost: 3,
      label: "Search For the Stranger: spend 3 actions to advance",
      condition: { script: "leadAtStranger" },
      effects: [{ op: "script", fn: "advance" }],
    },
    { kind: "revelation", run: "pallidMask" },
  ],
  modifiers: noClues,
  conditions: {
    leadAtStranger(game: GameContext, ctx: EffCtx) {
      const lead = leadInvestigator(game);
      if (ctx.you !== lead) return false;
      const at = inv(game, lead).location;
      return !!at && enemies(game).some((e) => e.code === MITPM && e.location === at);
    },
  },
  fns: {
    advance(game: GameContext) {
      queue(game, advanceAct({ by: "objective" }));
    },
    pallidMask(game: GameContext) {
      const lead = leadInvestigator(game);
      const mask = findByCode(game, PALLID_MASK, [ZONE.SetAside]);
      if (mask) {
        moveCard(game, mask.id, ZONE.Play, { inv: lead });
        setController(game, mask.id, lead);
        emit(game, EVENT.Play, `${inv(game, lead).name} takes The Pallid Mask`, {
          inv: lead,
          card: mask.id,
        });
      }
      removeStranger(game);
      const king = findByCode(game, TATTERED_KING, [ZONE.SetAside]);
      const palace = findByCode(game, PALACE, [ZONE.Location]);
      if (king && palace) queue(game, spawn({ enemy: king.id, inv: null, at: palace.id }));
    },
  },
} satisfies CardScript;
