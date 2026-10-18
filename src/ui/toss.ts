/**
 * The chaos bag toss of the skill-test draw (pure, seeded, precomputed): the bag's flight and the paths of the tokens
 * tumbling out of its mouth, sampled into a few keyframes each for the Web Animations API. Not a simulation at run time:
 * a path is built from a seeded launch (a height under gravity with a bounce factor, a ground path that eases to the
 * rest point, a spin that ends upright, a tilt that flattens as the token comes down) and always ends exactly at its rest
 * point, so the toss looks the same after a reload and the layout stays the one `spillLayout` chose.
 */
export interface Pt {
  x: number;
  y: number;
}
export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Box = Area;

/** one keyframe of a token: where it is on the table (x, y), how high above it (z), its tilt (rotateX) and spin (rotateZ), degrees */
export interface Sample {
  offset: number;
  x: number;
  y: number;
  z: number;
  tilt: number;
  spin: number;
}
/** `duration` in ms at the Slow pace; `bounces` counts the lifts after the first landing */
export interface Path {
  samples: Sample[];
  duration: number;
  bounces: number;
}

/** a small seeded generator (mulberry32) */
function rng(seed: number) {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const G = 2600; // px/s²
const BOUNCE = 0.4; // of the impact speed
const MOUTH_HEIGHT = 24; // px above the table when a token leaves the bag
const MIN_PEAK = 1.5;

/** the height under gravity of one flight, from its start height and upward speed: [contact time, apex time, apex height] */
const flight = (z0: number, v0: number): [number, number, number] => [(v0 + Math.sqrt(v0 * v0 + 2 * G * z0)) / G, v0 / G, z0 + (v0 * v0) / (2 * G)];

export function tokenPath(o: { mouth: Pt; rest: Pt; seed: number; k: number; size: number; stage: Area }): Path {
  const rand = rng(o.seed * 7919 + o.k * 104729 + 1);
  const duration = 450 + Math.round(rand() * 100);
  const T = duration / 1000;
  // the flights: launch, then each bounce at 40% of the speed it hit with, until too low to see
  const v0 = 260 + rand() * 90;
  const keys: { t: number; z: number }[] = [{ t: 0, z: MOUTH_HEIGHT }];
  let t = 0;
  let z0 = MOUTH_HEIGHT;
  let v = v0;
  let bounces = -1;
  for (let i = 0; i < 6; i++) {
    const [fall, up, peak] = flight(z0, v);
    if (peak < MIN_PEAK && i > 0) break;
    keys.push({ t: t + up, z: peak }, { t: t + fall, z: 0 });
    bounces += 1;
    t += fall;
    v = BOUNCE * Math.sqrt(v * v + 2 * G * z0);
    z0 = 0;
  }
  // fit the flights into the path: the same shape on a faster clock
  const fit = Math.min(1, (T * 0.93) / t);
  const scaled = keys.map((p) => ({ t: p.t * fit, z: p.z }));
  const end = scaled[scaled.length - 1].t;
  const zAt = (time: number) => {
    if (time >= end) return 0;
    // between two keys: a parabola through a contact and the next contact's apex
    for (let i = 1; i < scaled.length; i += 2) {
      const apex = scaled[i];
      const before = i === 1 ? scaled[0] : scaled[i - 1];
      const contact = scaled[i + 1];
      if (time <= contact.t) {
        // quadratic through (before.t, before.z), (apex.t, apex.z), (contact.t, 0)
        const a = apex.t;
        const peak = apex.z;
        const side = time <= a ? a - before.t : contact.t - a;
        const x = time - a;
        const base = side === 0 ? 0 : (x / side) ** 2;
        return Math.max(0, peak - (peak - (time <= a ? before.z : 0)) * base);
      }
    }
    return 0;
  };
  // the ground path eases to the rest point, with a sideways wobble that dies at both ends
  const dx = o.rest.x - o.mouth.x;
  const dy = o.rest.y - o.mouth.y;
  const len = Math.hypot(dx, dy) || 1;
  const side = (rand() - 0.5) * 2 * Math.min(28, len * 0.15);
  const spinTotal = (rand() < 0.5 ? -1 : 1) * 360 * (1 + Math.floor(rand() * 2));
  // sample the contacts, the apexes and the end, then fill the gaps up to ten keyframes
  const times = new Set<number>([0, 1]);
  for (const p of scaled) times.add(Math.min(1, p.t / T));
  let sorted = [...times].sort((a, b) => a - b);
  while (sorted.length < 10) {
    let at = 0;
    for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] > sorted[at + 1] - sorted[at]) at = i - 1;
    sorted = [...sorted.slice(0, at + 1), (sorted[at] + sorted[at + 1]) / 2, ...sorted.slice(at + 1)];
  }
  const samples: Sample[] = sorted.map((u, i) => {
    const last = i === sorted.length - 1;
    const first = i === 0;
    const p = 1 - (1 - u) ** 2;
    const wobble = Math.sin(Math.PI * u) * side;
    const z = last ? 0 : Math.round(zAt(u * T) * 100) / 100;
    return {
      offset: u,
      x: first ? o.mouth.x : last ? o.rest.x : Math.round((o.mouth.x + dx * p - (dy / len) * wobble) * 100) / 100,
      y: first ? o.mouth.y : last ? o.rest.y : Math.round((o.mouth.y + dy * p + (dx / len) * wobble) * 100) / 100,
      z,
      tilt: last ? 0 : Math.round(Math.min(72, z * 1.7) * 10) / 10,
      spin: last ? spinTotal : Math.round(spinTotal * (1 - (1 - u) ** 2.4) * 10) / 10,
    };
  });
  return { samples, duration, bounces: Math.max(0, bounces) };
}

/** the Web Animations keyframes of a token's path, relative to where it rests: moved to the table spot, lifted by its height, spun and tilted */
export function tokenFrames(p: Path, rest: Pt): { offset: number; transform: string }[] {
  return p.samples.map((s) => ({ offset: s.offset, transform: `translate(${s.x - rest.x}px, ${s.y - s.z - rest.y}px) rotateX(${s.tilt}deg) rotateZ(${s.spin}deg)` }));
}

/** a token's shadow on the table follows its height: smaller and fainter the higher it is */
export function shadowFrames(p: Path, at: Pt): { offset: number; transform: string; opacity: number }[] {
  return p.samples.map((s) => ({ offset: s.offset, transform: `translate(${s.x - at.x}px, ${s.y - at.y}px) scale(${Math.max(0.55, 1 - s.z / 160).toFixed(3)})`, opacity: Math.max(0.15, 0.7 - s.z / 120) }));
}

export type Pace = "slow" | "normal" | "tap";

/**
 * When things happen in a toss, in ms: the bag's flight, then the tokens launched in a stream over about 350 ms, each
 * path 450 to 550 ms: all at rest within 1.2 s at the Slow and Tap paces, scaled by 0.75 (0.9 s) at Normal, for any
 * number of tokens (the stream's spread is fixed, not per token).
 */
export function tossTiming(pace: Pace, n: number) {
  const scale = pace === "normal" ? 0.75 : 1;
  const bagMs = 300 * scale;
  const span = 350 * scale;
  return {
    bagMs,
    tipMs: 120 * scale,
    launchAt: (k: number) => bagMs + (n <= 1 ? 0 : (span * k) / (n - 1)),
    pathMs: (slowMs: number) => slowMs * scale,
    total: bagMs + span + 550 * scale,
  };
}

/**
 * The bag's keyframes (relative to the box it ends up in): it flies from over its button in an arc, tumbling a little,
 * lands with a squash and a bounce, and tips over toward the spill with its mouth open.
 */
export function bagFrames(from: Box, to: Box): { offset: number; transform: string; opacity: number }[] {
  const c = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const a = c(from);
  const b = c(to);
  const s0 = from.w / to.w;
  const flightAt = (p: number) => {
    const e = 1 - (1 - p) ** 2;
    return { x: a.x - b.x - (a.x - b.x) * e, y: a.y - b.y - (a.y - b.y) * e - 170 * 4 * p * (1 - p), s: s0 + (1 - s0) * e, r: -35 * (1 - e) };
  };
  const at = (offset: number, p: number, extra = "") => {
    const f = flightAt(p);
    return { offset, transform: `translate(${f.x}px, ${f.y}px) rotate(${f.r}deg) scale(${f.s})${extra}`, opacity: 0.6 + 0.4 * Math.min(1, p * 2) };
  };
  return [
    at(0, 0),
    at(0.15, 0.25),
    at(0.3, 0.5),
    at(0.45, 0.75),
    // landing: squashed, then a small hop, then it tips
    { offset: 0.6, transform: "translate(0px, 0px) rotate(0deg) scale(1.12, 0.85)", opacity: 1 },
    { offset: 0.72, transform: "translate(0px, -14px) rotate(8deg) scale(0.97, 1.03)", opacity: 1 },
    { offset: 0.86, transform: "translate(0px, 0px) rotate(28deg) scale(1.04, 0.96)", opacity: 1 },
    { offset: 1, transform: "translate(0px, 0px) rotate(25deg) scale(1)", opacity: 1 },
  ];
}
