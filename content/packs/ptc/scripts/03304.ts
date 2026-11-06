// "Eat lead!" (2) — played as an attack with a [[Firearm]] asset reveals its chaos token: X more ammo spent from that
// asset, X more tokens revealed, one of them resolved (the token window stands for "when you activate the Fight ability")
import {
  addCounter,
  addExtraReveal,
  card,
  type CardScript,
  currentTest,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "reaction",
      fromHand: true,
      trigger: "wouldRevealToken",
      condition: {
        all: [{ yourSkillTest: true }, { testKind: "fight" }, { testSource: { trait: "Firearm" } }],
      },
      run: "eatLead",
    },
  ],
  fns: {
    eatLead(game: GameContext, run: ScriptRun) {
      const gun = currentTest(game)?.source;
      if (!gun) return;
      const ammo = card(game, gun).uses;
      const x = run.choose<number>(
        Array.from({ length: ammo + 1 }, (_, n) => ({
          id: String(n),
          label: `Spend ${n} more ammo`,
          value: n,
          key: "option.spendN",
          vars: { n },
        })),
        { text: '"Eat lead!": spend how much more ammo?', key: "eatLead" },
        { auto: false },
      );
      addCounter(game, gun, "uses", -x);
      for (let k = 0; k < x; k++) addExtraReveal(game);
    },
  },
} satisfies CardScript;
