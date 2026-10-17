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
