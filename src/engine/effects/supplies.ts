/** A campaign supply crossed off during a scenario (ADR-0053): the game state's copy, written back to the log at the end. */
import { emit, invName, turnOrder, type GameContext } from "../context";
import { supplyCount } from "../queries";
import { supplies } from "../world/flags";
import { EVENT } from "../events/event";
import type { EffectOf, EffectRun } from "./types";

function crossOffSupplyEffect(game: GameContext, run: EffectRun<EffectOf<"crossOffSupply">>) {
  const { supply, who } = run.effect;
  const whom =
    who === "you" ? [run.you] : [run.you, ...turnOrder(game).filter((i) => i !== run.you)];
  const inv = whom.find((i) => supplyCount(game, i, supply) > 0);
  if (!inv) return;
  const table = structuredClone(supplies.get(game) ?? {});
  const by = Object.values(table).find((x) => (x[inv]?.[supply] ?? 0) > 0)![inv];
  by[supply] -= 1;
  if (!by[supply]) delete by[supply];
  supplies.set(game, table);
  emit(game, EVENT.Remove, `${invName(game, inv)} crosses off ${supply}`, {
    inv,
    data: { supply },
  });
}

export const suppliesEffects = { crossOffSupply: crossOffSupplyEffect };
