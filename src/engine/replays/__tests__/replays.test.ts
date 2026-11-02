/**
 * The replay oracle: every recorded game and campaign plays again on the current engine to the same final state and
 * event log. A failure names the recording and where it first differs. If the change is meant to alter the game,
 * rewrite the corpus with `pnpm record:games`; this test never writes.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { content, loadPack } from "../../../content";
import { CORPUS, inPackOrder, traceScripts, usePacks } from "../corpus";
import { firstDiff, firstEventDiff } from "../diff";
import { replayRecording, type Recording } from "../record";
import { UNRUN_SCRIPTS } from "../unrun";

const recordings = inPackOrder(
  readdirSync(CORPUS)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(`${CORPUS}/${f}`, "utf8")) as Recording),
);

/** the scripts a replay called, and how many recordings this run replayed (a filtered run checks no coverage) */
const ran = new Set<string>();
let replayed = 0;

describe("replay oracle", () => {
  it("has recordings", () => {
    expect(recordings.length).toBeGreaterThan(0);
  });

  for (const rec of recordings)
    it(`${rec.id} replays unchanged`, async () => {
      await usePacks(content, rec.packs, loadPack);
      traceScripts(content, ran);
      const now = replayRecording(content, rec);
      replayed++;
      const was =
        rec.kind === "game" ? [{ snapshot: rec.snapshot, events: rec.events }] : rec.games;
      const where: string[] = now.error ? [`refused ${now.error}`] : [];
      if (now.games.length !== was.length)
        where.push(`games played: ${was.length} != ${now.games.length}`);
      was.forEach((g, n) => {
        const game = rec.kind === "campaign" ? `game ${n}: ` : "";
        const events = firstEventDiff(g.events, now.games[n]?.events ?? []);
        if (events) where.push(`${game}${events}`);
        const snap = firstDiff(g.snapshot, now.games[n]?.snapshot);
        if (snap) where.push(`${game}state ${snap}`);
      });
      if (rec.kind === "campaign") {
        // the engine version is stamped on the campaign: it changes with the storage on purpose
        const unversioned = (c: unknown) => ({ ...(c as object), version: undefined });
        const campaign = firstDiff(unversioned(rec.campaign), unversioned(now.campaign));
        if (campaign) where.push(`campaign ${campaign}`);
      }
      expect(where, `${rec.id} first differs at`).toEqual([]);
    });

  it("lists exactly the scripts no recording runs (unrun.ts)", () => {
    if (replayed < recordings.length) return;
    const unrun = Object.keys(content.scripts)
      .filter((code) => !ran.has(code))
      .sort();
    expect(unrun, "update src/engine/replays/unrun.ts").toEqual([...UNRUN_SCRIPTS].sort());
  });
});
