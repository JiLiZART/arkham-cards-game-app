import { describe, expect, it } from "vitest";
import { Effect } from "../../../content/schema";
import { EFFECT_HANDLERS, type EffectHandlers } from "../index";

// @ts-expect-error an effect without a handler is refused
const noHandlers: EffectHandlers = {};

/** the `op` of every effect the content schema allows */
const schemaOps = (): string[] => {
  const lazy = Effect as unknown as {
    _def: { getter: () => { options: { shape: { op: { value: string } } }[] } };
  };
  return lazy._def.getter().options.map((o) => o.shape.op.value);
};

describe("the effect handlers", () => {
  it("has a handler for every effect the content schema allows (checked by the compiler too)", () => {
    expect(noHandlers).toEqual({});
    expect(Object.keys(EFFECT_HANDLERS).sort()).toEqual(schemaOps().sort());
  });

  it("every handler is a function", () => {
    for (const handler of Object.values(EFFECT_HANDLERS)) expect(typeof handler).toBe("function");
  });
});
