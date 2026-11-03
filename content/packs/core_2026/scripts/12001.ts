// Daniela Reyes — fight the enemy that attacked (a basic fight or a Fight ability); elder sign deals 1 damage
import {
  abilitiesOf,
  canPay,
  checkCondition,
  controlled,
  def,
  type CardScript,
  type GameContext,
  CHOICE,
  type ScriptRun,
  queue,
  basicFight,
  useAbility,
  resolveEffects,
} from "../../../../src/engine/api";

type Pick = { basic: true } | { card: string; index: number };

export default {
  abilities: [{ kind: "elderSign", tokenValue: 1, run: "elder" }],
  fns: {
    fightBack(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const fights = controlled(game, you).flatMap((c) =>
        abilitiesOf(game, c.id)
          .map((a, index) => ({ a, index, card: c.id }))
          .filter(
            ({ a, card }) =>
              a.kind === "action" &&
              a.designator === "fight" &&
              canPay(game, you, card, a.cost) &&
              (!a.condition || checkCondition(game, a.condition, { source: card, you })),
          ),
      );
      const pick = run.choose<Pick>(
        [
          { id: "basic", label: "Basic fight", value: { basic: true } },
          ...fights.map((f) => ({
            id: `${f.card}:${f.index}`,
            label: f.a.label ?? def(game, f.card).name,
            card: f.card,
            value: { card: f.card, index: f.index },
          })),
        ],
        { text: `Daniela: fight ${def(game, run.ctx.enemy!).name}`, key: "chooseOne" },
        { kind: CHOICE.Generic, who: you },
      );
      if ("basic" in pick) queue(game, basicFight({ you, enemy: run.ctx.enemy }));
      else queue(game, useAbility({ inv: you, card: pick.card, index: pick.index }));
    },
    elder(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffects({
          effects: [{ op: "dealDamage", amount: 1, to: "chooseAtLocation" }],
          ctx: { you: run.ctx.you, source: run.ctx.source },
        }),
      );
    },
  },
} satisfies CardScript;
