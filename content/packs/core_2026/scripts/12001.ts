// Daniela Reyes — fight the enemy that attacked (a basic fight or a Fight ability); elder sign deals 1 damage
import {
  abilitiesOf,
  ask,
  canPay,
  checkCondition,
  controlled,
  def,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type Step,
} from "../../../../src/engine/api";

type Pick = { basic: true } | { card: string; index: number };

export default {
  abilities: [{ kind: "elderSign", tokenValue: 1, run: "elder" }],
  fns: {
    fightBack(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const fights = controlled(g, you).flatMap((c) =>
        abilitiesOf(g, c.id)
          .map((a, index) => ({ a, index, card: c.id }))
          .filter(
            ({ a, card }) =>
              a.kind === "action" &&
              a.designator === "fight" &&
              canPay(g, you, card, a.cost) &&
              (!a.condition || checkCondition(g, a.condition, { source: card, you })),
          ),
      );
      const pick = ask<Pick>(
        g,
        step!,
        you,
        "generic",
        `Daniela: fight ${def(g, ctx.enemy!).name}`,
        [
          { id: "basic", label: "Basic fight", value: { basic: true } },
          ...fights.map((f) => ({
            id: `${f.card}:${f.index}`,
            label: f.a.label ?? def(g, f.card).name,
            card: f.card,
            value: { card: f.card, index: f.index },
          })),
        ],
        { auto: true, key: "chooseOne" },
      );
      if (pick === undefined) return;
      if ("basic" in pick)
        push(g, {
          t: "Script",
          code: "__engine",
          fn: "basicFight",
          ctx: { you, enemy: ctx.enemy },
        });
      else push(g, { t: "UseAbility", inv: you, card: pick.card, index: pick.index });
    },
    elder(g: G, ctx: EffCtx) {
      push(g, {
        t: "Effects",
        effects: [{ op: "dealDamage", amount: 1, to: "chooseAtLocation" }],
        ctx: { you: ctx.you, source: ctx.source },
      });
    },
  },
} satisfies CardScript;
