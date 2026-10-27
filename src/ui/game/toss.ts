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
const BOUNCE = 0.34; // of the vertical speed it lands with
const KEEP = 0.62; // of the sideways speed kept at each landing (the table grips)
const SLIDE = 1500; // px/s² of friction while it slides
const MOUTH_HEIGHT = 24; // px above the table when a token leaves the bag
const LIFT = 70; // px/s: a landing slower than this doesn't lift it again
const DT = 1 / 600;
/** the part of the path left for the wobble at the end */
const WOBBLE = 0.14;

interface Step {
  t: number;
  /** distance travelled along the throw, height, tumble (deg), spin (deg) */
  d: number;
  z: number;
  tilt: number;
  spin: number;
}

/**
 * One token's throw, integrated in small fixed steps: a launch under gravity (it keeps its sideways speed in the air and
 * tumbles), landings that keep a third of the vertical speed and most of the sideways one, then a slide under friction
 * to a stop. Distances are along the throw's line; the caller places it.
 */
function simulate(speed: number, vz0: number, spin0: number, tumble: number) {
  const out: Step[] = [];
  const impacts: number[] = [];
  const apexes: number[] = [];
  let t = 0;
  let d = 0;
  let z = MOUTH_HEIGHT;
  let v = speed;
  let vz = vz0;
  let w = spin0;
  let spin = 0;
  let phase = 0;
  let air = true;
  let lifts = 0;
  out.push({ t, d, z, tilt: 0, spin });
  while (t < 3) {
    t += DT;
    if (air) {
      const before = vz;
      d += v * DT;
      z += vz * DT;
      vz -= G * DT;
      phase += tumble * DT;
      if (before > 0 && vz <= 0) apexes.push(t);
      if (z <= 0) {
        z = 0;
        impacts.push(t);
        vz = -vz * BOUNCE;
        v *= KEEP;
        w *= 0.75;
        tumble *= -0.5;
        if (vz < LIFT) air = false;
        else lifts++;
      }
    } else {
      d += v * DT;
      v = Math.max(0, v - SLIDE * DT);
    }
    w *= Math.exp(-2.2 * DT);
    spin += w * DT;
    out.push({ t, d, z, tilt: air ? 48 * Math.sin((phase * Math.PI) / 180) : 0, spin });
    if (!air && v === 0) break;
  }
  return { out, impacts, apexes, stop: t, travel: d, lifts };
}

export function tokenPath(o: {
  mouth: Pt;
  rest: Pt;
  seed: number;
  k: number;
  size: number;
  stage: Area;
}): Path {
  const rand = rng(o.seed * 7919 + o.k * 104729 + 1);
  const duration = 450 + Math.round(rand() * 100);
  const T = duration / 1000;
  const dx = o.rest.x - o.mouth.x;
  const dy = o.rest.y - o.mouth.y;
  const D = Math.hypot(dx, dy);
  const ux = D > 0.5 ? dx / D : 1;
  const uy = D > 0.5 ? dy / D : 0;
  // a low throw out of the mouth, spinning and tumbling, aimed so the slide ends near its rest point
  const vz0 = 150 + rand() * 110;
  const spin0 = (rand() < 0.5 ? -1 : 1) * (380 + rand() * 520);
  const tumble = (rand() < 0.5 ? -1 : 1) * (700 + rand() * 600);
  let speed = Math.max(40, D * 2);
  let sim = simulate(speed, vz0, spin0, tumble);
  for (let i = 0; i < 4 && sim.travel > 0.5; i++) {
    speed = Math.max(1, speed * Math.sqrt(Math.max(D, 1) / sim.travel));
    sim = simulate(speed, vz0, spin0, tumble);
  }
  // its own clock onto the path's: the stop lands where the wobble begins
  const settle = T * (1 - WOBBLE);
  const k = settle / sim.stop;
  const travel = sim.travel || 1;
  // the throw's small miss is spread along it, so the slide ends exactly on the rest point
  const missX = o.rest.x - (o.mouth.x + ux * sim.travel);
  const missY = o.rest.y - (o.mouth.y + uy * sim.travel);
  // a whole number of turns at the end (the token comes to rest upright), the spin's shape kept
  const end = sim.out[sim.out.length - 1].spin;
  const turns = Math.max(1, Math.round(Math.abs(end) / 360)) * Math.sign(end || 1) * 360;
  const spinScale = end ? turns / end : 1;
  const wobbleSign = rand() < 0.5 ? -1 : 1;
  const at = (u: number): Sample => {
    if (u >= 1) return { offset: 1, x: o.rest.x, y: o.rest.y, z: 0, tilt: 0, spin: turns };
    const time = u * T;
    if (time >= settle) {
      // the wobble of a coin coming to rest: quicker and smaller until it lies flat
      const w = (time - settle) / (T - settle);
      const tilt =
        wobbleSign *
        12 *
        Math.exp(-4 * w) *
        Math.sin(2 * Math.PI * (2.2 * w + 1.6 * w * w)) *
        (1 - w);
      return {
        offset: u,
        x: o.rest.x,
        y: o.rest.y,
        z: 0,
        tilt: Math.round(tilt * 10) / 10,
        spin: turns,
      };
    }
    const st = sim.out[Math.min(sim.out.length - 1, Math.round(time / k / DT))];
    const f = st.d / travel;
    const r = (n: number) => Math.round(n * 100) / 100;
    return {
      offset: u,
      x: r(o.mouth.x + ux * st.d + missX * f),
      y: r(o.mouth.y + uy * st.d + missY * f),
      z: r(st.z),
      tilt: Math.round(st.tilt * 10) / 10,
      spin: Math.round(st.spin * spinScale * 10) / 10,
    };
  };
  // keyframes at the start, each landing and top of a flight, the stop, through the wobble, then evenly between
  const times = new Set<number>([0, 1]);
  for (const t of [...sim.impacts, ...sim.apexes, sim.stop])
    times.add(Math.min(1 - WOBBLE, (t * k) / T));
  for (let i = 1; i <= 6; i++) times.add(1 - WOBBLE + (WOBBLE * i) / 7);
  let sorted = [...times]
    .sort((a, b) => a - b)
    .filter((u, i, all) => i === 0 || u - all[i - 1] > 1e-6);
  while (sorted.length < 20) {
    let gap = 0;
    for (let i = 1; i < sorted.length; i++)
      if (sorted[i] - sorted[i - 1] > sorted[gap + 1] - sorted[gap]) gap = i - 1;
    sorted = [
      ...sorted.slice(0, gap + 1),
      (sorted[gap] + sorted[gap + 1]) / 2,
      ...sorted.slice(gap + 1),
    ];
  }
  return { samples: sorted.slice(0, 32).map(at), duration, bounces: sim.lifts };
}

/** the Web Animations keyframes of a token's path, relative to where it rests: moved to the table spot, lifted by its height, spun, and tilted in perspective (its edge shows) */
export function tokenFrames(p: Path, rest: Pt): { offset: number; transform: string }[] {
  return p.samples.map((s) => ({
    offset: s.offset,
    transform: `translate(${s.x - rest.x}px, ${s.y - s.z - rest.y}px) perspective(520px) rotateZ(${s.spin}deg) rotateX(${s.tilt}deg)`,
  }));
}

/** a token's shadow on the table follows its height: smaller and fainter the higher it is */
export function shadowFrames(
  p: Path,
  at: Pt,
): { offset: number; transform: string; opacity: number }[] {
  // the light is above and behind: a higher token's shadow falls further down and right, larger and fainter
  return p.samples.map((s) => ({
    offset: s.offset,
    transform: `translate(${s.x - at.x + s.z * 0.35}px, ${s.y - at.y + s.z * 0.5}px) scale(${(1 + s.z / 140).toFixed(3)})`,
    opacity: Math.max(0.12, 0.75 - s.z / 70),
  }));
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
export function bagFrames(
  from: Box,
  to: Box,
): { offset: number; transform: string; opacity: number }[] {
  const c = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const a = c(from);
  const b = c(to);
  const s0 = from.w / to.w;
  const flightAt = (p: number) => {
    const e = 1 - (1 - p) ** 2;
    return {
      x: a.x - b.x - (a.x - b.x) * e,
      y: a.y - b.y - (a.y - b.y) * e - 170 * 4 * p * (1 - p),
      s: s0 + (1 - s0) * e,
      r: -35 * (1 - e),
    };
  };
  const at = (offset: number, p: number, extra = "") => {
    const f = flightAt(p);
    return {
      offset,
      transform: `translate(${f.x}px, ${f.y}px) rotate(${f.r}deg) scale(${f.s})${extra}`,
      opacity: 0.6 + 0.4 * Math.min(1, p * 2),
    };
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
