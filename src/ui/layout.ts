import type { ContentDb, GameState, InstId, InvId } from "../engine/types";

/** card size in world units (poker ratio) */
export const CARD_W = 1;
export const CARD_H = 1.4;

export type Vec3 = [number, number, number];

/** the framed table background, in world units (x right, z down the screen); wider than the art, which is stretched to fit */
export const BOARD = { x0: -16, x1: 16, z0: -8, z1: 8 };
/** base card scale (scenario strip, viewer play area) */
export const S = 1.4;
/** locations are drawn twice as large, shrinking (never below MIN_LOC) only when a scenario's map can't fit */
export const LOC_SCALE = 2 * S;
export const MIN_LOC = 1.6 * S;

export interface Placement {
  pos: Vec3;
  /** rotation in the table plane */
  yaw: number;
  faceUp: boolean;
  scale: number;
  landscape: boolean;
  /** cards in the same group may overlap by design (stacks under a location) */
  group: string;
  /** where a card appearing for the first time flies in from */
  from: Vec3;
  /** an enemy engaged with another investigator: shows their portrait */
  badge?: InvId;
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
  /** location connections; oneWay links point from a to b */
  links: { a: Vec3; b: Vec3; oneWay: boolean }[];
  chaosBag: Vec3;
  /** length of a connector plaque, follows the location size */
  connectorSize: number;
  /** scale the locations were drawn at */
  locScale: number;
}

const LANDSCAPE = new Set(["investigator", "act", "agenda"]);
/** the left scenario strip: two columns of base-size cards */
const STRIP = { a: -14.7, b: -13.1, rows: [-5.8, -3.1, -0.4], bag: 2.0 };
/** the free region right of the strip, inside the frame */
const REGION = { x0: -12.0, x1: 15.5, z0: -7.0, z1: 7.0 };
const GAP = 0.9;
/** viewer play area: slot pitch fits an exhausted (sideways) card */
const SLOT_X = 2.0;
const SLOT_Z = 2.35;
const VIEWER_W = { min: 8.0, max: 12.0 };

/** board layout; the viewer's hand is the HTML fan and other investigators are HTML tokens, so neither is on the board */
export function layout(db: ContentDb, s: GameState, viewer: InvId | null): TableLayout {
  const cards = new Map<InstId, Placement>();
  const piles: Pile[] = [];
  const minis: Mini[] = [];
  const links: TableLayout["links"] = [];
  const def = (id: InstId) => db.cards[s.cards[id].code];
  const put = (id: InstId, pos: Vec3, group: string, o: Partial<Placement> & { scale?: number } = {}) => {
    cards.set(id, { pos, yaw: 0, faceUp: true, landscape: LANDSCAPE.has(def(id).type), group, from: pos, ...o, scale: o.scale ?? S });
  };

  // ---------- scenario strip (left edge) ----------
  const [r1, r2, r3] = STRIP.rows;
  const encDeckPos: Vec3 = [STRIP.a, 0, r2];
  // act and agenda turned sideways so they fit the strip
  if (s.agenda) put(s.agenda, [STRIP.a, 0, r1], "agenda", { yaw: Math.PI / 2 });
  if (s.act) put(s.act, [STRIP.b, 0, r1], "act", { yaw: Math.PI / 2 });
  piles.push({ key: "encounterDeck", pos: encDeckPos, count: s.encounterDeck.length, kind: "encounter", top: s.encounterDeck[0] ?? null, faceUp: false, scale: S, label: "Encounter" });
  piles.push({ key: "encounterDiscard", pos: [STRIP.b, 0, r2], count: s.encounterDiscard.length, kind: "encounter", top: s.encounterDiscard.at(-1) ?? null, faceUp: true, scale: S, label: "Discard" });
  const victory = Object.values(s.cards).filter((c) => c.zone === "victory");
  piles.push({ key: "victory", pos: [STRIP.a, 0, r3], count: victory.length, kind: "encounter", top: victory.at(-1)?.id ?? null, faceUp: true, scale: S, label: "Victory" });
  Object.entries(s.sideDecks).forEach(([name, deck], k) => {
    piles.push({ key: `side:${name}`, pos: [STRIP.b, 0, r3 + k * SLOT_Z], count: deck.length, kind: "encounter", top: deck[0] ?? null, faceUp: false, scale: S, label: `${name[0].toUpperCase()}${name.slice(1)} deck` });
  });
  const chaosBag: Vec3 = [(STRIP.a + STRIP.b) / 2, 0, STRIP.bag + Math.max(0, Object.keys(s.sideDecks).length - 1) * SLOT_Z];

  // ---------- location map (scaled to fit; viewer area to its right) ----------
  const scen = db.scenarios[s.scenarioId];
  const locs = Object.values(s.cards).filter((c) => c.zone === "location");
  const grid = new Map<InstId, [number, number]>();
  let spare = 0;
  for (const l of locs) grid.set(l.id, scen.layout[l.code] ?? [spare++, 3]);
  const cols = [...grid.values()].map((g) => g[0]);
  const rows = [...grid.values()].map((g) => g[1]);
  const [c0, c1, q0, q1] = locs.length ? [Math.min(...cols), Math.max(...cols), Math.min(...rows), Math.max(...rows)] : [0, 0, 0, 0];
  const nc = c1 - c0 + 1;
  const nr = q1 - q0 + 1;
  const regionW = REGION.x1 - REGION.x0;
  const regionH = REGION.z1 - REGION.z0;
  const fitH = (regionH - (nr - 1) * GAP) / (nr * CARD_H);
  const fitW = (regionW - VIEWER_W.min - GAP - (nc - 1) * GAP) / (nc * CARD_W);
  const ls = Math.max(MIN_LOC, Math.min(LOC_SCALE, fitH, fitW));
  const locW = CARD_W * ls;
  const locH = CARD_H * ls;
  const mapW = nc * locW + (nc - 1) * GAP;
  const viewerW = Math.min(VIEWER_W.max, Math.max(VIEWER_W.min, regionW - mapW - GAP));
  const vx0 = REGION.x1 - viewerW;
  // the map is centred in what the viewer area leaves free
  const mapCx = (REGION.x0 + vx0 - GAP) / 2;
  const mapCz = (REGION.z0 + REGION.z1) / 2;
  const locPos = new Map<InstId, Vec3>();
  for (const l of locs) {
    const [c, r] = grid.get(l.id)!;
    const p: Vec3 = [mapCx + (c - (c0 + c1) / 2) * (locW + GAP), 0, mapCz + (r - (q0 + q1) / 2) * (locH + GAP)];
    locPos.set(l.id, p);
    put(l.id, p, `loc:${l.id}`, { faceUp: true, from: p, scale: ls });
  }
  const link = (a: string, b: string, oneWay: boolean) => {
    for (const la of locs.filter((l) => l.code === a)) for (const lb of locs.filter((l) => l.code === b)) links.push({ a: locPos.get(la.id)!, b: locPos.get(lb.id)!, oneWay });
  };
  for (const [a, b] of scen.connections) link(a, b, false);
  for (const [a, b] of scen.oneWay ?? []) link(a, b, true);

  // ---------- the viewer's play area: deck, discard and assets fill slots from the bottom, threats above ----------
  const perRow = Math.max(3, Math.floor((viewerW + 0.05) / SLOT_X));
  const slot = (k: number): Vec3 => [vx0 + SLOT_X / 2 + (k % perRow) * SLOT_X, 0, REGION.z1 - (CARD_H * S) / 2 - Math.floor(k / perRow) * SLOT_Z];
  const me = viewer ? s.invs[viewer] : undefined;
  const deckPos: Vec3 = slot(0);
  if (viewer && me) {
    piles.push({ key: `deck:${viewer}`, pos: deckPos, count: me.deck.length, kind: "player", top: me.deck[0] ?? null, faceUp: false, scale: S, label: "Deck" });
    piles.push({ key: `discard:${viewer}`, pos: slot(1), count: me.discard.length, kind: "player", top: me.discard.at(-1) ?? null, faceUp: true, scale: S, label: "Discard" });
    const assets = Object.values(s.cards).filter((c) => c.zone === "play" && c.controller === viewer);
    assets.forEach((c, k) => put(c.id, slot(2 + k), `area:${viewer}`, { from: deckPos }));
    // threats start on the row above the last asset row
    const firstThreat = (Math.floor((1 + assets.length) / perRow) + 1) * perRow;
    const threat = [
      ...Object.values(s.cards).filter((c) => c.zone === "threat" && c.controller === viewer),
      ...Object.values(s.cards).filter((c) => c.zone === "enemy" && c.engagedWith === viewer),
    ];
    threat.forEach((c, k) => put(c.id, slot(firstThreat + k), `threat:${viewer}`, { from: encDeckPos }));
  }

  // ---------- things at locations: unengaged enemies, attachments, enemies engaged with other investigators ----------
  for (const l of locs) {
    const p = locPos.get(l.id)!;
    const here = Object.values(s.cards).filter(
      (c) => c.location === l.id && ((c.zone === "enemy" && c.engagedWith !== viewer) || c.zone === "attached"),
    );
    here.forEach((c, k) => {
      const enemy = c.zone === "enemy";
      put(c.id, [p[0] - locW * 0.22 + k * locW * 0.22, 0.02 + k * 0.02, p[2] + locH * 0.18], `loc:${l.id}`, {
        scale: ls * 0.5,
        from: encDeckPos,
        badge: enemy && c.engagedWith ? c.engagedWith : undefined,
      });
    });
  }
  for (const i of s.order) {
    const st = s.invs[i];
    if (st.location && st.status === "playing" && locPos.has(st.location)) minis.push({ inv: i, pos: locPos.get(st.location)!, index: s.order.indexOf(i) });
  }

  // ---------- skill test & resolving cards over the middle of the map ----------
  const committed = Object.values(s.cards).filter((c) => c.zone === "commit");
  committed.forEach((c, k) => put(c.id, [mapCx - 1.6 + k * 1.6, 0.6, mapCz + 2.4], "commit", { scale: 0.9 * S, from: deckPos }));
  for (const c of Object.values(s.cards)) if (c.zone === "resolving") put(c.id, [mapCx, 1.5, mapCz], "resolving", { scale: 1.4 * S, from: c.owner === viewer ? deckPos : encDeckPos });

  // investigator portraits sit along the top of their location, side by side
  const base = minis.map((m) => m.pos);
  minis.forEach((m, j) => {
    const same = minis.filter((_, i) => base[i] === base[j]);
    const k = same.indexOf(m);
    m.pos = [base[j][0] + (k - (same.length - 1) / 2) * locW * 0.3, 0.15, base[j][2] - locH * 0.3];
  });
  return { cards, piles, minis, links, chaosBag, connectorSize: GAP + 0.7, locScale: ls };
}

/** axis-aligned footprint of a placement on the table */
export function footprint(p: Pick<Placement, "pos" | "scale" | "landscape"> & { yaw?: number }): { x0: number; x1: number; z0: number; z1: number } {
  // a card turned a quarter turn swaps its width and height
  const wide = p.landscape !== Math.abs(Math.sin(p.yaw ?? 0)) > 0.5;
  const w = (wide ? CARD_H : CARD_W) * p.scale;
  const h = (wide ? CARD_W : CARD_H) * p.scale;
  return { x0: p.pos[0] - w / 2, x1: p.pos[0] + w / 2, z0: p.pos[2] - h / 2, z1: p.pos[2] + h / 2 };
}
