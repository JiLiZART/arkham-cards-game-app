// Raise the Stakes (Return to The House Always Wins) — Revelation: you have "cheated", or lose 5 resources, or it goes
// into your threat area: each Criminal enemy at your location loses Aloof, and from act 2 each Criminal enemy engaged
// with you gets +1 fight and +1 evade
import {
  card,
  cardIf,
  type CardScript,
  currentAct,
  def,
  enemies,
  flags,
  type GameContext,
  type InstId,
  inv,
  queue,
  resolveEffect,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";
import { actOne } from "../../dwl/scripts/02071";

const criminal = (game: GameContext, id: InstId) => def(game, id).traits.includes("Criminal");

export default {
  abilities: [{ kind: "revelation", run: "stakes" }],
  modifiers(game: GameContext, id: InstId) {
    const c = card(game, id);
    if (c.zone !== ZONE.Threat || !c.controller) return [];
    const you = c.controller;
    const here = inv(game, you).location;
    const later = !!cardIf(game, currentAct(game)) && !actOne(game);
    return enemies(game)
      .filter((e) => criminal(game, e.id))
      .flatMap((e) => [
        ...(here && e.location === here
          ? [{ target: e.id, mod: { flag: "notAloof" as const } }]
          : []),
        ...(later && e.engagedWith === you
          ? (["fight", "evade"] as const).map((stat) => ({ target: e.id, mod: { stat, value: 1 } }))
          : []),
      ]);
  },
  fns: {
    stakes(game: GameContext, run: ScriptRun) {
      const choice = run.choose<"cheat" | "pay" | "threat">(
        [
          {
            id: "cheat",
            label: "Remember that you have cheated",
            value: "cheat",
            key: "option.rememberCheated",
          },
          ...(inv(game, run.you).resources > 0
            ? [
                {
                  id: "pay",
                  label: "Lose 5 resources",
                  value: "pay" as const,
                  key: "option.lose5Resources",
                },
              ]
            : []),
          {
            id: "threat",
            label: "Put Raise the Stakes into play in your threat area",
            value: "threat",
            key: "option.raiseTheStakesThreat",
          },
        ],
        { text: "Raise the Stakes: choose one", key: "raiseTheStakes" },
        { auto: false },
      );
      if (choice === "cheat") flags.remembered.set(game, ["cheated", run.you], true);
      else
        queue(
          game,
          resolveEffect({
            effect:
              choice === "pay" ? { op: "loseResources", amount: 5 } : { op: "putInThreatArea" },
            ctx: run.ctx,
          }),
        );
    },
  },
} satisfies CardScript;
