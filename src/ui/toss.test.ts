import { describe, expect, it } from "vitest";
import { bagFrames, tokenPath, tossTiming, type Path } from "./toss";

const stage = { x: 0, y: 0, w: 900, h: 400 };
const DISC = 56;
const mouth = { x: 450, y: 330 };
const rest = { x: 220, y: 120 };

describe("tokenPath", () => {
  const path = (seed = 7, k = 3, to = rest) => tokenPath({ mouth, rest: to, seed, k, size: DISC, stage });

  it("starts at the bag's mouth and ends exactly at its rest point, flat", () => {
    const p = path();
    const first = p.samples[0];
    const last = p.samples[p.samples.length - 1];
    expect([first.x, first.y]).toEqual([mouth.x, mouth.y]);
    expect([last.x, last.y]).toEqual([rest.x, rest.y]);
    expect(last.z).toBe(0);
    expect(last.tilt).toBe(0);
    expect(first.offset).toBe(0);
    expect(last.offset).toBe(1);
  });

  it("bounces at least once: it touches the table, rises again, and touches it once more", () => {
    const p = path();
    const zs = p.samples.map((s) => s.z);
    const floors = zs.map((z, i) => (z === 0 ? i : -1)).filter((i) => i >= 0);
    expect(floors.length).toBeGreaterThanOrEqual(2);
    // between two floor contacts it was in the air
    expect(Math.max(...zs.slice(floors[0], floors[floors.length - 1] + 1))).toBeGreaterThan(2);
    expect(p.bounces).toBeGreaterThanOrEqual(1);
  });

  it("each bounce is lower than the one before", () => {
    const p = path();
    const peaks: number[] = [];
    for (let i = 1; i < p.samples.length - 1; i++) if (p.samples[i].z > p.samples[i - 1].z && p.samples[i].z >= p.samples[i + 1].z) peaks.push(p.samples[i].z);
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]).toBeLessThan(peaks[i - 1]);
  });

  it("stays inside the stage, give or take a token", () => {
    for (let k = 0; k < 30; k++) {
      const to = { x: 40 + ((k * 137) % 820), y: 60 + ((k * 61) % 300) };
      for (const s of path(k + 1, k, to).samples) {
        expect(s.x).toBeGreaterThanOrEqual(stage.x - DISC);
        expect(s.x).toBeLessThanOrEqual(stage.x + stage.w + DISC);
        expect(s.y - s.z).toBeGreaterThanOrEqual(stage.y - DISC);
        expect(s.y).toBeLessThanOrEqual(stage.y + stage.h + DISC);
      }
    }
  });

  it("is deterministic: the same seed gives the same keyframes, another seed another path", () => {
    expect(path(5).samples).toEqual(path(5).samples);
    expect(path(5).samples).not.toEqual(path(6).samples);
    expect(path(5, 1).samples).not.toEqual(path(5, 2).samples);
  });

  it("is sampled into 10 to 14 keyframes with increasing offsets, spins as it flies and settles flat", () => {
    for (let seed = 0; seed < 20; seed++) {
      const p = path(seed, seed);
      expect(p.samples.length).toBeGreaterThanOrEqual(10);
      expect(p.samples.length).toBeLessThanOrEqual(14);
      for (let i = 1; i < p.samples.length; i++) expect(p.samples[i].offset).toBeGreaterThan(p.samples[i - 1].offset);
      expect(Math.abs(p.samples[0].spin - p.samples[p.samples.length - 1].spin)).toBeGreaterThan(90);
    }
  });

  it("the duration is 450 to 550 ms at the Slow pace", () => {
    for (let seed = 0; seed < 20; seed++) {
      const p = path(seed, seed);
      expect(p.duration).toBeGreaterThanOrEqual(450);
      expect(p.duration).toBeLessThanOrEqual(550);
    }
  });
});

describe("tossTiming", () => {
  it("everything is at rest within 1.2 s at the Slow and Tap paces and 0.9 s at Normal, for any number of tokens", () => {
    for (const n of [1, 5, 16, 30, 45]) {
      for (const [pace, ms] of [["slow", 1200], ["tap", 1200], ["normal", 900]] as const) {
        const t = tossTiming(pace, n);
        let last = 0;
        for (let k = 0; k < n; k++) last = Math.max(last, t.launchAt(k) + t.pathMs(450 + (k % 11) * 10));
        expect(last, `${pace} ${n}`).toBeLessThanOrEqual(ms + 1);
        expect(t.total).toBeLessThanOrEqual(ms);
      }
    }
  });

  it("the tokens come out as a stream: later ones leave later, spread over about 350 ms at Slow", () => {
    const t = tossTiming("slow", 16);
    expect(t.launchAt(0)).toBeLessThan(t.launchAt(15));
    expect(t.launchAt(15) - t.launchAt(0)).toBeGreaterThan(250);
    expect(t.launchAt(15) - t.launchAt(0)).toBeLessThanOrEqual(350);
    expect(t.launchAt(0)).toBeGreaterThanOrEqual(t.bagMs - 50);
  });
});

describe("bagFrames", () => {
  const from = { x: 1300, y: 20, w: 96, h: 96 };
  const to = { x: 375, y: 280, w: 150, h: 150 };
  const frames = bagFrames(from, to);

  it("starts over its button and ends tipped over at its landing place", () => {
    const first = frames[0];
    expect(first.offset).toBe(0);
    expect(first.transform).toContain(`translate(${1300 + 48 - (375 + 75)}px, ${20 + 48 - (280 + 75)}px)`);
    const last = frames[frames.length - 1];
    expect(last.offset).toBe(1);
    expect(last.transform).toMatch(/rotate\(-?2[0-9]deg\)/);
  });

  it("flies in an arc (rises above the straight line), lands with a squash, and tips", () => {
    const mid = frames.find((f) => f.offset > 0.2 && f.offset < 0.7)!;
    const straightY = 20 + 48 - (280 + 75);
    const midY = Number(/translate\([^,]+, (-?[\d.]+)px/.exec(mid.transform)![1]);
    expect(midY).toBeLessThan(straightY * 0.5 + 1); // above the straight path (negative is up)
    expect(frames.some((f) => /scale\([\d.]+, 0\.[78]\d*\)/.test(f.transform))).toBe(true);
  });

  it("is deterministic", () => {
    expect(bagFrames(from, to)).toEqual(frames);
  });
});

describe("types", () => {
  it("a path carries what the stage needs", () => {
    const p: Path = tokenPath({ mouth, rest, seed: 1, k: 0, size: DISC, stage });
    expect(typeof p.duration).toBe("number");
    expect(Object.keys(p.samples[0]).sort()).toEqual(["offset", "spin", "tilt", "x", "y", "z"]);
  });
});
