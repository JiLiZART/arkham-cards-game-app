import type { ContentDb, GameState, InstId, InvId } from "../../engine/types";

/** card size in world units (poker ratio) */
export const CARD_W = 1;
export const CARD_H = 1.4;

export type Vec3 = [number, number, number];

/** location card scale in world units; the camera zoom decides the on-screen size */
export const LOC_SCALE = 2.8;

export interface Placement {
  pos: Vec3;
  /** rotation in the table plane */
  yaw: number;
  faceUp: boolean;
  scale: number;
  landscape: boolean;
  /** cards in the same group may overlap by design (stacks on a location) */
  group: string;
  /** where a card appearing for the first time flies in from */
  from: Vec3;
  /** an enemy engaged with another investigator: shows their portrait */
  badge?: InvId;
}

export interface Mini {
  inv: InvId;
  pos: Vec3;
  index: number;
}

export interface Bounds {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface TableLayout {
  cards: Map<InstId, Placement>;
  minis: Mini[];
  /** location connections; oneWay links point from a to b */
  links: { a: Vec3; b: Vec3; oneWay: boolean }[];
  /** map extent plus a margin: the table background and the camera clamp */
  bounds: Bounds;
  /** length of a connector plaque */
  connectorSize: number;
  /** scale the locations were drawn at */
  locScale: number;
}

const GAP = 0.9;
/** room around the outermost locations for the table frame */
const MARGIN = 1.6;

/**
 * Map layout: locations, things at locations and investigator portraits. Everything else
 * (act, agenda, piles, chaos bag, the viewer's play area and hand) is fixed HTML over the map.
 */
export function layout(db: ContentDb, s: GameState, viewer: InvId | null): TableLayout {
  const cards = new Map<InstId, Placement>();
  const minis: Mini[] = [];
  const links: TableLayout["links"] = [];
  const put = (id: InstId, pos: Vec3, group: string, o: Partial<Placement> & { scale: number }) => {
    cards.set(id, { pos, yaw: 0, faceUp: true, landscape: false, group, from: pos, ...o });
  };

  const scen = db.scenarios[s.scenarioId];
  const locs = Object.values(s.cards).filter((c) => c.zone === "location");
  const grid = new Map<InstId, [number, number]>();
  let spare = 0;
  for (const l of locs) grid.set(l.id, scen.layout[l.code] ?? [spare++, 3]);
  const cols = [...grid.values()].map((g) => g[0]);
  const rows = [...grid.values()].map((g) => g[1]);
  const [c0, c1, q0, q1] = locs.length
    ? [Math.min(...cols), Math.max(...cols), Math.min(...rows), Math.max(...rows)]
    : [0, 0, 0, 0];
  const ls = LOC_SCALE;
  const locW = CARD_W * ls;
  const locH = CARD_H * ls;
  const locPos = new Map<InstId, Vec3>();
  for (const l of locs) {
    const [c, r] = grid.get(l.id)!;
    const p: Vec3 = [(c - (c0 + c1) / 2) * (locW + GAP), 0, (r - (q0 + q1) / 2) * (locH + GAP)];
    locPos.set(l.id, p);
    put(l.id, p, `loc:${l.id}`, { from: p, scale: ls });
  }
  const link = (a: string, b: string, oneWay: boolean) => {
    for (const la of locs.filter((l) => l.code === a))
      for (const lb of locs.filter((l) => l.code === b))
        links.push({ a: locPos.get(la.id)!, b: locPos.get(lb.id)!, oneWay });
  };
  for (const [a, b] of scen.connections) link(a, b, false);
  for (const [a, b] of scen.oneWay ?? []) link(a, b, true);

  // things at locations: unengaged enemies, attachments, and enemies engaged with other investigators
  // (the viewer's engaged enemies are in the play area strip)
  for (const l of locs) {
    const p = locPos.get(l.id)!;
    const here = Object.values(s.cards).filter(
      (c) =>
        c.location === l.id &&
        ((c.zone === "enemy" && c.engagedWith !== viewer) || c.zone === "attached"),
    );
    here.forEach((c, k) => {
      const enemy = c.zone === "enemy";
      put(
        c.id,
        [p[0] - locW * 0.22 + k * locW * 0.22, 0.02 + k * 0.02, p[2] + locH * 0.18],
        `loc:${l.id}`,
        {
          scale: ls * 0.5,
          badge: enemy && c.engagedWith ? c.engagedWith : undefined,
        },
      );
    });
  }
  for (const i of s.order) {
    const st = s.invs[i];
    if (st.location && st.status === "playing" && locPos.has(st.location))
      minis.push({ inv: i, pos: locPos.get(st.location)!, index: s.order.indexOf(i) });
  }
  // investigator portraits sit along the top of their location, side by side
  const base = minis.map((m) => m.pos);
  minis.forEach((m, j) => {
    const same = minis.filter((_, i) => base[i] === base[j]);
    const k = same.indexOf(m);
    m.pos = [base[j][0] + (k - (same.length - 1) / 2) * locW * 0.3, 0.15, base[j][2] - locH * 0.3];
  });

  const halfW = ((c1 - c0 + 1) * locW + (c1 - c0) * GAP) / 2;
  const halfH = ((q1 - q0 + 1) * locH + (q1 - q0) * GAP) / 2;
  const bounds = {
    x0: -halfW - MARGIN,
    x1: halfW + MARGIN,
    z0: -halfH - MARGIN,
    z1: halfH + MARGIN,
  };
  return { cards, minis, links, bounds, connectorSize: GAP + 0.7, locScale: ls };
}

/** axis-aligned footprint of a placement on the table */
export function footprint(p: Pick<Placement, "pos" | "scale" | "landscape"> & { yaw?: number }): {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
} {
  // a card turned a quarter turn swaps its width and height
  const wide = p.landscape !== Math.abs(Math.sin(p.yaw ?? 0)) > 0.5;
  const w = (wide ? CARD_H : CARD_W) * p.scale;
  const h = (wide ? CARD_W : CARD_H) * p.scale;
  return { x0: p.pos[0] - w / 2, x1: p.pos[0] + w / 2, z0: p.pos[2] - h / 2, z1: p.pos[2] + h / 2 };
}
