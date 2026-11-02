import type { CardView, EffCtx, GameContext, InvId, Step } from "../world/types";
import type { Effect } from "../../content/schema";

/** the step that runs one effect */
export type EffStep = Extract<Step, { t: "Eff" }>;

/** the effect with this `op` (or one of these) */
export type EffectOf<Op extends Effect["op"]> = Extract<Effect, { op: Op }>;

/** one effect being run: its step, the context it came with, who it is for and the card it comes from */
export interface EffectRun<E extends Effect = Effect> {
  step: EffStep;
  effect: E;
  ctx: EffCtx;
  you: InvId;
  src: CardView | undefined;
}

/** the code that runs one kind of effect */
export type EffectHandler<Op extends Effect["op"]> = (
  game: GameContext,
  run: EffectRun<EffectOf<Op>>,
) => void;
/** one handler per effect the content schema allows, each taking exactly its own kind of effect */
export type EffectHandlers = { [Op in Effect["op"]]: EffectHandler<Op> };
