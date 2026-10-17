/** one white circle above the bag, relative to the bag's top-centre (px; y grows downward) */
export interface Circle {
  x: number;
  y: number;
}

export const CIRCLE_R = 18;
const GAP = 6;

/**
 * Lay out n circles in arcs over the bag's mouth: inner arc first, each arc as full as its length allows.
 * Arcs span 160° and grow outward, so circles never overlap.
 */
export function circleLayout(n: number, innerRadius = 120): Circle[] {
  const out: Circle[] = [];
  const span = (160 * Math.PI) / 180;
  for (let row = 0; out.length < n; row++) {
    const r = innerRadius + row * (2 * CIRCLE_R + GAP);
    const fit = Math.max(1, Math.floor((span * r) / (2 * CIRCLE_R + GAP)) + 1);
    const count = Math.min(fit, n - out.length);
    for (let k = 0; k < count; k++) {
      const a = count === 1 ? 0 : -span / 2 + (span * k) / (count - 1);
      out.push({ x: Math.sin(a) * r, y: -Math.cos(a) * r });
    }
  }
  return out;
}

/** testResult event data (see engine/rules/skillTest.ts) */
export interface TestResultData {
  skill: string;
  base: number;
  icons: number;
  tokens: string[];
  /** each token's resolved modifier */
  tokenMods?: number[];
  tokenTotal: number;
  total: number;
  difficulty: number;
  success: boolean;
}

export type BreakdownRow =
  | { kind: "skill"; skill: string; value: number }
  | { kind: "committed"; value: number }
  | { kind: "tokens"; tokens: string[]; value: number; autoFail: boolean }
  | { kind: "total"; value: number; difficulty: number }
  | { kind: "result"; success: boolean };

/** the calculation line by line: skill, committed icons, tokens, total vs difficulty, outcome */
export function breakdownRows(d: TestResultData): BreakdownRow[] {
  const rows: BreakdownRow[] = [{ kind: "skill", skill: d.skill, value: d.base }];
  if (d.icons) rows.push({ kind: "committed", value: d.icons });
  rows.push({ kind: "tokens", tokens: d.tokens, value: d.tokenTotal, autoFail: d.tokens.includes("autoFail") });
  rows.push({ kind: "total", value: d.total, difficulty: d.difficulty });
  rows.push({ kind: "result", success: d.success });
  return rows;
}
