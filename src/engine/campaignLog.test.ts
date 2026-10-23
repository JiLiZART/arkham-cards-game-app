import { describe, expect, it } from "vitest";
import {
  addCards,
  crossOut,
  emptyLog,
  flatLog,
  hasEntry,
  logCount,
  record,
  setCount,
  setInvestigatorCount,
  migrateLog,
  NOTES,
} from "./campaignLog";

describe("the sectioned campaign log", () => {
  it("records an entry in a section, once, and the notes section is the default", () => {
    let log = emptyLog();
    log = record(log, "houseBurned");
    log = record(log, "houseBurned");
    log = record(log, "sacrificed-one", "sacrificed");
    expect(log[NOTES].entries).toEqual([{ id: "houseBurned" }]);
    expect(hasEntry(log, "houseBurned")).toBe(true);
    expect(hasEntry(log, "sacrificed-one", "sacrificed")).toBe(true);
    expect(hasEntry(log, "sacrificed-one")).toBe(false);
  });

  it("crosses an entry out but keeps showing it, or erases it", () => {
    let log = record(emptyLog(), "rescued");
    log = crossOut(log, "rescued");
    expect(log[NOTES].entries).toEqual([{ id: "rescued", crossedOut: true }]);
    expect(hasEntry(log, "rescued")).toBe(false);
    expect(hasEntry(log, "rescued", NOTES, true)).toBe(true);
    expect(crossOut(log, "rescued", NOTES, true)[NOTES].entries).toEqual([]);
  });

  it("recording an entry that was crossed out brings it back", () => {
    const log = record(crossOut(record(emptyLog(), "x"), "x"), "x");
    expect(hasEntry(log, "x")).toBe(true);
  });

  it("counts: add and set, from zero", () => {
    let log = emptyLog();
    log = setCount(log, "doubt", "add", 1, "doubt");
    log = setCount(log, "doubt", "add", 2, "doubt");
    expect(logCount(log, "doubt", "doubt")).toBe(3);
    log = setCount(log, "doubt", "set", 0, "doubt");
    expect(logCount(log, "doubt", "doubt")).toBe(0);
    expect(logCount(log, "nothing")).toBe(0);
  });

  it("per-investigator counts", () => {
    const log = setInvestigatorCount(
      setInvestigatorCount(emptyLog(), "xp", "01001", "add", 2, "s"),
      "xp",
      "01001",
      "add",
      1,
      "s",
    );
    expect(log.s.investigators.xp["01001"]).toBe(3);
  });

  it("card lists: add codes once, or remove them", () => {
    let log = addCards(emptyLog(), "sacrificed", ["02040", "02061"], false, "sacrificed");
    log = addCards(log, "sacrificed", ["02040"], false, "sacrificed");
    expect(log.sacrificed.cards.sacrificed).toEqual(["02040", "02061"]);
    log = addCards(log, "sacrificed", ["02040"], true, "sacrificed");
    expect(log.sacrificed.cards.sacrificed).toEqual(["02061"]);
  });

  it("never changes the log it was given", () => {
    const before = record(emptyLog(), "a");
    const snapshot = JSON.stringify(before);
    record(before, "b");
    crossOut(before, "a");
    setCount(before, "n", "add", 1);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe("flatLog", () => {
  it("is every section's entries as true (or the value they carry), counts as numbers and card lists as arrays, crossed-out entries left out", () => {
    let log = record(emptyLog(), "houseBurned");
    log = record(log, "ghoulPriestAlive");
    log = crossOut(log, "ghoulPriestAlive");
    log = setCount(log, "doubt", "add", 2, "doubt");
    log = addCards(log, "cultistsInterrogated", ["01121"]);
    expect(flatLog(log)).toEqual({ houseBurned: true, doubt: 2, cultistsInterrogated: ["01121"] });
  });

  it("keeps a recorded value", () => {
    const log = record(emptyLog(), "name", NOTES, "Lita");
    expect(flatLog(log)).toEqual({ name: "Lita" });
  });
});

describe("migrateLog", () => {
  it("turns a flat log into the notes section: arrays become card lists, the rest entries", () => {
    const log = migrateLog({
      houseBurned: true,
      cultistsGotAway: ["01121", "01122"],
      pastMidnight: true,
      note: "text",
    });
    expect(log[NOTES].entries).toEqual([
      { id: "houseBurned" },
      { id: "pastMidnight" },
      { id: "note", value: "text" },
    ]);
    expect(log[NOTES].cards.cultistsGotAway).toEqual(["01121", "01122"]);
    expect(flatLog(log)).toEqual({
      houseBurned: true,
      cultistsGotAway: ["01121", "01122"],
      pastMidnight: true,
      note: "text",
    });
  });
});
