// "Eat lead!" (Return to The Path to Carcosa, level 0) — played as an attack with a [[Firearm]] asset reveals its chaos
// token: 1 more ammo spent from that asset, 1 more token revealed, one of the two resolved (the token window stands for
// "when you activate the Fight ability", as for "Eat lead!" (2), 03304)
import {
  addCounter,
  addExtraReveal,
  card,
  type CardScript,
  currentTest,
  type GameContext,
} from "../../../../src/engine/api";

/** the Firearm the attack is made with, while it has an ammo to spend */
const loadedGun = (game: GameContext) => {
  const gun = currentTest(game)?.source;
  return gun && card(game, gun).uses > 0 ? gun : undefined;
};

export default {
  abilities: [
    {
      kind: "reaction",
      fromHand: true,
      trigger: "wouldRevealToken",
      condition: {
        all: [
          { yourSkillTest: true },
          { testKind: "fight" },
          { testSource: { trait: "Firearm" } },
          { script: "loaded" },
        ],
      },
      run: "eatLead",
    },
  ],
  conditions: { loaded: (game: GameContext) => !!loadedGun(game) },
  fns: {
    eatLead(game: GameContext) {
      const gun = loadedGun(game);
      if (!gun) return;
      addCounter(game, gun, "uses", -1);
      addExtraReveal(game);
    },
  },
} satisfies CardScript;
