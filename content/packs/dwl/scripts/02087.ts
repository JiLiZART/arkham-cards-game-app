// Wizard of Yog-Sothoth — when the investigator engaged with it draws a Hex or Pact card, it attacks them
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  attackKey,
  enemyAttacks,
} from "../../../../src/engine/api";

const HEX_OR_PACT = { eventCard: { trait: ["Hex", "Pact"] } };

export default {
  abilities: [
    // an encounter card (Visions of Futures Past) or a player card
    {
      kind: "forced",
      trigger: "treacheryDrawn",
      usableBy: "engaged",
      condition: HEX_OR_PACT,
      run: "attack",
    },
    {
      kind: "forced",
      trigger: "cardDrawn",
      usableBy: "engaged",
      condition: HEX_OR_PACT,
      run: "attack",
    },
  ],
  fns: {
    attack(game: GameContext, run: ScriptRun) {
      if (!run.ctx.inv) return;
      queue(
        game,
        enemyAttacks({ enemy: run.source, inv: run.ctx.inv, aoo: false, key: attackKey(game) }),
      );
    },
  },
} satisfies CardScript;
