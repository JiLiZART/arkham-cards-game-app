// Unspeakable Oath (Bloodthirst) — a basic weakness, Peril and Hidden (data): its revelation puts it in your hand,
// where it works as if in your threat area. When the game ends or you are eliminated with it in your hand: 2 fewer
// experience. [reaction] When you deal damage to an enemy in excess of its remaining health: discard it from your hand.
import {
  card,
  type CardScript,
  flags,
  type GameContext,
  type HookRun,
  ZONE,
} from "../../../../src/engine/api";

/** what the three Unspeakable Oaths share: the experience lost with the card still in hand */
export const oath: CardScript = {
  hooks: {
    gameEnd(game: GameContext, run: HookRun) {
      const c = card(game, run.source);
      if (c.zone === ZONE.Hand && c.owner) flags.xp.add(game, c.owner, -2);
    },
  },
};

export default {
  ...oath,
  abilities: [
    {
      kind: "reaction",
      trigger: "excessDamage",
      label: "Unspeakable Oath (Bloodthirst): discard it from your hand",
      condition: { eventInvestigatorIsYou: true },
      effects: [{ op: "discardSelf" }],
    },
  ],
} satisfies CardScript;
