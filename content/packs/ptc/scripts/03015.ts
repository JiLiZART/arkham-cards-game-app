// Angered Spirits — in the threat area; exhausting a Spell asset moves 1 of its charges here; when the game ends with
// fewer than 4 charges here, its bearer suffers 1 physical trauma
import {
  addCounter,
  card,
  type CardScript,
  controlled,
  def,
  type EffCtx,
  exhaust,
  type GameContext,
  type HookRun,
  type ScriptRun,
} from "../../../../src/engine/api";

/** the ready Spell assets you control with a charge to give */
const spells = (game: GameContext, you: string) =>
  controlled(game, you).filter(
    (c) =>
      !c.exhausted &&
      def(game, c.id).traits.includes("Spell") &&
      def(game, c.id).uses?.type === "charges" &&
      c.uses > 0,
  );

export default {
  abilities: [
    { kind: "revelation", effects: [{ op: "putInThreatArea" }] },
    {
      kind: "fast",
      label: "Angered Spirits: exhaust a Spell asset to move 1 charge here",
      condition: { script: "hasSpell" },
      run: "feed",
    },
  ],
  conditions: {
    hasSpell: (game: GameContext, ctx: EffCtx) => !!ctx.you && spells(game, ctx.you).length > 0,
  },
  fns: {
    feed(game: GameContext, run: ScriptRun) {
      const ids = spells(game, run.you).map((c) => c.id);
      if (!ids.length) return;
      const pick = run.choose<string>(
        ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        { text: "Choose a Spell asset to exhaust", key: "chooseAsset" },
      );
      exhaust(game, pick);
      addCounter(game, pick, "uses", -1);
      addCounter(game, run.source, "uses", 1);
    },
  },
  hooks: {
    gameEnd(game: GameContext, run: HookRun) {
      const c = card(game, run.source);
      if (c.uses < 4 && c.controller) addCounter(game, c.controller, "physicalTrauma", 1);
    },
  },
} satisfies CardScript;
