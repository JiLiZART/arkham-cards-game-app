import type { ContentDb, GameState, InstId, InvId } from "../engine/types";

/** card size in world units (poker ratio) */
export const CARD_W = 1;
export const CARD_H = 1.4;

export type Vec3 = [number, number, number];

/** the parchment board, in world units (x right, z down the screen); aspect matches the booklet art */
export const BOARD = { x0: -13, x1: 13, z0: -8.3, z1: 8.3 };
/** flat orthographic view loses nothing to perspective, so cards are drawn a bit larger */
const S = 1.4;

export interface Placement {
  pos: Vec3;
  /** rotation in the table plane */
  yaw: number;
  faceUp: boolean;
  scale: number;
  landscape: boolean;
  /** cards in the same group may overlap by design (stacks under a location, a hand fan) */
  group: string;
  /** where a card appearing for the first time flies in from */
  from: Vec3;
}

export interface Pile {
  key: string;
  pos: Vec3;
  count: number;
  kind: "player" | "encounter";
  top: InstId | null;
  faceUp: boolean;
  scale: number;
  label: string;
}

export interface Mini {
  inv: InvId;
  pos: Vec3;
  index: number;
}

export interface TableLayout {
  cards: Map<InstId, Placement>;
  piles: Pile[];
  minis: Mini[];
  links: [Vec3, Vec3][];
  areas: { inv: InvId; pos: Vec3; scale: number; viewer: boolean }[];
  chaosBag: Vec3;
}

const LANDSCAPE = new Set(["investigator", "act", "agenda"]);
const SCEN_Z = -6.9;
const VIEWER = { x: 0.8, z: 6.6 };
// other players sit in a column on the left, under their stat plaques
const OTHER_SLOTS: [number, number][] = [[-10.9, -5.6], [-10.9, -1.1], [-10.9, 3.4]];
const MAP_CENTER = { x: 0.9, z: -1.2 };
const CELL = { x: 3.3, z: 3.0 };

/** board layout; the viewer's hand is not on the board (it is the HTML hand fan) */
export function layout(db: ContentDb, s: GameState, viewer: InvId | null): TableLayout {
  const cards = new Map<InstId, Placement>();
  const piles: Pile[] = [];
  const minis: Mini[] = [];
  const links: [Vec3, Vec3][] = [];
  const areas: TableLayout["areas"] = [];
  const def = (id: InstId) => db.cards[s.cards[id].code];
  const put = (id: InstId, pos: Vec3, group: string, o: Partial<Placement> = {}) => {
    cards.set(id, { pos, yaw: 0, faceUp: true, landscape: LANDSCAPE.has(def(id).type), group, from: pos, ...o, scale: S * (o.scale ?? 1) });
  };

  // ---------- scenario row ----------
  const encDeckPos: Vec3 = [3.6, 0, SCEN_Z];
  if (s.agenda) put(s.agenda, [-4.4, 0, SCEN_Z], "agenda");
  if (s.act) put(s.act, [-1.9, 0, SCEN_Z], "act");
  piles.push({ key: "encounterDeck", pos: encDeckPos, count: s.encounterDeck.length, kind: "encounter", top: s.encounterDeck[0] ?? null, faceUp: false, scale: S, label: "Encounter" });
  piles.push({ key: "encounterDiscard", pos: [5.4, 0, SCEN_Z], count: s.encounterDiscard.length, kind: "encounter", top: s.encounterDiscard.at(-1) ?? null, faceUp: true, scale: S, label: "Discard" });
  for (const [name, deck] of Object.entries(s.sideDecks)) {
    piles.push({ key: `side:${name}`, pos: [7.2, 0, SCEN_Z], count: deck.length, kind: "encounter", top: deck[0] ?? null, faceUp: false, scale: S, label: `${name[0].toUpperCase()}${name.slice(1)} deck` });
  }
  const victory = Object.values(s.cards).filter((c) => c.zone === "victory");
  piles.push({ key: "victory", pos: [-6.8, 0, SCEN_Z], count: victory.length, kind: "encounter", top: victory.at(-1)?.id ?? null, faceUp: true, scale: 0.8 * S, label: "Victory" });
  const chaosBag: Vec3 = [9.2, 0, SCEN_Z];

  // ---------- locations ----------
  const scen = db.scenarios[s.scenarioId];
  const locs = Object.values(s.cards).filter((c) => c.zone === "location");
  const grid = new Map<InstId, [number, number]>();
  let spare = 0;
  for (const l of locs) grid.set(l.id, scen.layout[l.code] ?? [spare++, 3]);
  const cols = [...grid.values()].map((g) => g[0]);
  const rows = [...grid.values()].map((g) => g[1]);
  const midC = (Math.min(...cols) + Math.max(...cols)) / 2;
  const midR = (Math.min(...rows) + Math.max(...rows)) / 2;
  const locPos = new Map<InstId, Vec3>();
  for (const l of locs) {
    const [c, r] = grid.get(l.id)!;
    const p: Vec3 = [MAP_CENTER.x + (c - midC) * CELL.x, 0, MAP_CENTER.z + (r - midR) * CELL.z];
    locPos.set(l.id, p);
    put(l.id, p, `loc:${l.id}`, { faceUp: true, from: p });
  }
  for (const [a, b] of scen.connections) {
    for (const la of locs.filter((l) => l.code === a)) for (const lb of locs.filter((l) => l.code === b)) links.push([locPos.get(la.id)!, locPos.get(lb.id)!]);
  }

  // ---------- player areas ----------
  const order = viewer && s.invs[viewer] ? [viewer, ...s.order.filter((i) => i !== viewer)] : [...s.order];
  const areaOf = new Map<InvId, { x: number; z: number; scale: number; viewer: boolean }>();
  order.forEach((i, k) => {
    if (k === 0 && viewer) areaOf.set(i, { ...VIEWER, scale: 1, viewer: true });
    else {
      const [x, z] = OTHER_SLOTS[(viewer ? k - 1 : k) % OTHER_SLOTS.length];
      areaOf.set(i, { x, z, scale: 0.42, viewer: false });
    }
  });
  const deckPos = new Map<InvId, Vec3>();
  for (const i of s.order) {
    const st = s.invs[i];
    const a = areaOf.get(i)!;
    areas.push({ inv: i, pos: [a.x, 0, a.z], scale: a.scale, viewer: a.viewer });
    const sc = a.scale;
    // offsets are in unscaled card units; S makes room for the larger cards
    const at = (dx: number, dz: number): Vec3 => [a.x + dx * sc * S, 0, a.z + dz * sc * S];
    // viewer: wide row; others: compact block
    const wide = a.viewer;
    const dpos = wide ? at(5.3, 0) : at(2.2, 1.6);
    deckPos.set(i, dpos);
    piles.push({ key: `deck:${i}`, pos: dpos, count: st.deck.length, kind: "player", top: st.deck[0] ?? null, faceUp: false, scale: sc * S, label: "Deck" });
    piles.push({ key: `discard:${i}`, pos: wide ? at(6.5, 0) : at(3.8, 1.6), count: st.discard.length, kind: "player", top: st.discard.at(-1) ?? null, faceUp: true, scale: sc * S, label: "Discard" });
    put(st.cardId, wide ? at(-6.1, 0) : at(-1.2, -1.6), `area:${i}`, { scale: sc });
    const assets = Object.values(s.cards).filter((c) => c.zone === "play" && c.controller === i);
    assets.forEach((c, k) => {
      // spaced for exhausted (sideways) cards
      const pos = wide ? at(-4.5 + k * 1.2, 0) : at(-1.9 + (k % 4) * 1.5, 0.15 + Math.floor(k / 4) * 1.5);
      put(c.id, pos, `area:${i}`, { scale: sc, from: deckPos.get(i)! });
    });
    const threat = [
      ...Object.values(s.cards).filter((c) => c.zone === "threat" && c.controller === i),
      ...Object.values(s.cards).filter((c) => c.zone === "enemy" && c.engagedWith === i),
    ];
    threat.forEach((c, k) => {
      const pos = wide ? at(-4.5 + k * 1.2, -1.55) : at(0.4 + k * 1.5, -1.6);
      put(c.id, pos, `threat:${i}`, { scale: sc, from: encDeckPos });
    });
    // hand: the viewer's is the HTML fan; others show a face-down count
    if (!a.viewer) {
      piles.push({ key: `hand:${i}`, pos: at(-1.2, 1.8), count: st.hand.length, kind: "player", top: null, faceUp: false, scale: sc * 0.8 * S, label: "Hand" });
    }
    if (st.location && st.status === "playing") minis.push({ inv: i, pos: locPos.get(st.location) ?? [0, 0, 0], index: s.order.indexOf(i) });
  }

  // ---------- things at locations ----------
  for (const l of locs) {
    const p = locPos.get(l.id)!;
    const here = Object.values(s.cards).filter((c) => (c.zone === "enemy" && !c.engagedWith && c.location === l.id) || (c.zone === "attached" && c.location === l.id));
    here.forEach((c, k) => {
      const enemy = c.zone === "enemy";
      put(c.id, [p[0] + (enemy ? 1.0 : -1.0), 0.02 + k * 0.02, p[2] + 0.35 + k * 0.28], `loc:${l.id}`, { scale: 0.6, from: encDeckPos });
    });
  }

  // ---------- skill test & resolving cards in the middle ----------
  const committed = Object.values(s.cards).filter((c) => c.zone === "commit");
  committed.forEach((c, k) => put(c.id, [-1 + k * 1.2, 0.6, 2.4], "commit", { scale: 0.9, from: deckPos.get(c.owner!) ?? [0, 0, 0] }));
  for (const c of Object.values(s.cards)) if (c.zone === "resolving") put(c.id, [0, 1.5, 0.6], "resolving", { scale: 1.4, from: c.owner ? deckPos.get(c.owner)! : encDeckPos });

  // investigator minis are offset so several fit on one location
  const base = minis.map((m) => m.pos);
  minis.forEach((m, j) => {
    const same = minis.filter((_, i) => base[i] === base[j]);
    const k = same.indexOf(m);
    m.pos = [base[j][0] + (k - (same.length - 1) / 2) * 0.45, 0.15, base[j][2] - 0.6];
  });
  return { cards, piles, minis, links, areas, chaosBag };
}

/** axis-aligned footprint of a placement on the table */
export function footprint(p: Placement): { x0: number; x1: number; z0: number; z1: number } {
  const w = (p.landscape ? CARD_H : CARD_W) * p.scale;
  const h = (p.landscape ? CARD_W : CARD_H) * p.scale;
  return { x0: p.pos[0] - w / 2, x1: p.pos[0] + w / 2, z0: p.pos[2] - h / 2, z1: p.pos[2] + h / 2 };
}
