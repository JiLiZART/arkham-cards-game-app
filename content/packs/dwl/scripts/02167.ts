// Passenger Car (agility) — unrevealed: it can't be entered while the location to its left has clues; revealed, after you
// enter it: discard cards from your hand with at least 2 [agility] icons between them, or take 2 damage. The other
// Passenger Cars (02168–02171) differ in the icon and what is taken instead
import {
  type CardScript,
  def,
  discard,
  type GameContext,
  type InstId,
  inv,
  type ScriptRun,
  argField,
  asNumber,
  queue,
  resolveEffects,
  runScript,
} from "../../../../src/engine/api";
import { lockedBehind } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

type Icon = "willpower" | "intellect" | "combat" | "agility" | "wild";

/** a Passenger Car: `need` icons of `icon` discarded from the hand after entering, else `damage` and `horror` taken */
export function passengerCar(
  code: string,
  icon: Icon,
  need: number,
  damage: number,
  horror: number,
): CardScript {
  const iconsOf = (game: GameContext, id: InstId) => def(game, id).icons?.[icon] ?? 0;
  const withIcon = (game: GameContext, run: ScriptRun) =>
    inv(game, run.you).hand.filter((id) => iconsOf(game, id) > 0);
  return {
    modifiers: lockedBehind,
    abilities: [{ kind: "forced", trigger: "enterLocation", run: "enter" }],
    fns: {
      enter(game: GameContext, run: ScriptRun) {
        const total = withIcon(game, run).reduce((n, id) => n + iconsOf(game, id), 0);
        const take = resolveEffects({
          effects: [
            ...(damage ? [{ op: "takeDamage" as const, amount: damage }] : []),
            ...(horror ? [{ op: "takeHorror" as const, amount: horror }] : []),
          ],
          ctx: { ...run.ctx, you: run.you },
        });
        const pick =
          total >= need
            ? run.choose<"discard" | "take">(
                [
                  {
                    id: "discard",
                    label:
                      icon === "wild"
                        ? "Discard a card with a wild icon"
                        : `Discard cards with ${need} ${icon} icons`,
                    value: "discard",
                    key: `option.passengerDiscard.${icon}`,
                    vars: { n: need },
                  },
                  {
                    id: "take",
                    label: `Take ${damage} damage and ${horror} horror`,
                    value: "take",
                    key: "option.passengerTake",
                    vars: { damage, horror },
                  },
                ],
                { text: "The Passenger Car: discard cards or take the hit", key: "passengerCar" },
                { auto: false },
              )
            : "take";
        queue(
          game,
          pick === "take"
            ? take
            : runScript({ code, fn: "discardIcons", ctx: run.ctx, args: { left: need } }),
        );
      },
      /** one card with the icon discarded, then another while the icons discarded are fewer than needed */
      discardIcons(game: GameContext, run: ScriptRun) {
        const left = asNumber(argField(run.args, "left")) ?? need;
        const cards = withIcon(game, run);
        if (!cards.length) return;
        const id = run.chooseCard(cards, {
          text: `Choose a card to discard (${left} ${icon} icon(s) to go)`,
          key: `passengerDiscard.${icon}`,
          vars: { n: left },
        });
        const rest = left - iconsOf(game, id);
        discard(game, id);
        if (rest > 0)
          queue(game, runScript({ code, fn: "discardIcons", ctx: run.ctx, args: { left: rest } }));
      },
    },
  };
}

export default passengerCar("02167", "agility", 2, 2, 0);
