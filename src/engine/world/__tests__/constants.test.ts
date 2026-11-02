import { describe, expect, it } from "vitest";
import {
  CHOICE,
  INV_STATUS,
  isOneOf,
  PHASE,
  PILE,
  TEST_STAGE,
  ZONE,
  type Zone,
} from "../constants";

// @ts-expect-error a zone that doesn't exist is refused
const nowhere: Zone = "nowhere";

const SETS = { ZONE, PHASE, CHOICE, TEST_STAGE, INV_STATUS, PILE };
const capitalised = (value: string) => value[0].toUpperCase() + value.slice(1);

describe("the closed sets of strings (ADR-0026)", () => {
  it.each(Object.entries(SETS))(
    "%s: a key is its value with the first letter capitalised",
    (_name, set) => {
      void nowhere;
      for (const [key, value] of Object.entries(set)) expect(key).toBe(capitalised(value));
    },
  );

  it.each(Object.entries(SETS))("%s: no value appears twice", (_name, set) => {
    const values = Object.values(set);
    expect(new Set(values).size).toBe(values.length);
  });

  it("the phases are those of a round, in order, with the setup before and the end after", () => {
    expect(Object.values(PHASE)).toEqual([
      "setup",
      "mythos",
      "investigation",
      "enemy",
      "upkeep",
      "ended",
    ]);
  });

  it("there are 22 zones, and the encounter's and the act and agenda decks' are among them", () => {
    expect(Object.values(ZONE)).toHaveLength(22);
    for (const pile of Object.values(PILE)) expect(Object.values(ZONE)).toContain(pile);
  });

  it("isOneOf says whether a value is one of the options, whatever the options' narrower type", () => {
    const zone: Zone = ZONE.Enemy;
    expect(isOneOf(zone, ZONE.Play, ZONE.Enemy)).toBe(true);
    expect(isOneOf(zone, ZONE.Play, ZONE.Threat)).toBe(false);
    expect(isOneOf(ZONE.Hand)).toBe(false);
  });
});
