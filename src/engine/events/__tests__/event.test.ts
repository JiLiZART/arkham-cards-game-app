import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { emit } from "../../context";
import { CORPUS } from "../../replays/corpus";
import type { GameContext } from "../../world/types";
import { EVENT, type EventType } from "../event";

// @ts-expect-error an event type that isn't in the catalogue is refused
const misspelt: EventType = "attak";

/** never called: only its types are checked */
export function emitsAMisspeltType(game: GameContext) {
  // @ts-expect-error emit takes an event type from the catalogue
  emit(game, "attak", "text");
}

/** every `type` of every event in the recorded games */
function recordedTypes(): Set<string> {
  const types = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      const object = value as Record<string, unknown>;
      if (Array.isArray(object.events))
        for (const event of object.events as { type?: string }[])
          if (event.type) types.add(event.type);
      Object.values(object).forEach(walk);
    }
  };
  for (const file of readdirSync(CORPUS))
    walk(JSON.parse(readFileSync(join(CORPUS, file), "utf8")));
  return types;
}

describe("the event catalogue", () => {
  it("names each event type by its value with the first letter capitalised", () => {
    void misspelt;
    for (const [key, value] of Object.entries(EVENT))
      expect(key).toBe(value[0].toUpperCase() + value.slice(1));
  });

  it("holds every event type in the recorded games, so replaying them changes no type", () => {
    const catalogue = new Set<string>(Object.values(EVENT));
    const missing = [...recordedTypes()].filter((type) => !catalogue.has(type));
    expect(missing).toEqual([]);
    expect(recordedTypes().size).toBeGreaterThan(50);
  });
});
