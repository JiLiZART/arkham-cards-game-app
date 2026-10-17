import type { GameState, InstId, InvId } from "../engine/types";

/** what a tip points at: an element marked `data-tip="…"`, or a card (in the strip, the hand or on the map) */
export type TipAnchor = { tip: string } | { card: InstId };

/** what the tips need besides the game */
export interface TipContext {
  /** who is looking at the screen: the player who must answer now */
  viewer: InvId | null;
  /** the viewer's hand is on screen (not behind the hand-off screen) */
  shown: boolean;
  canUndo: boolean;
  /** a chaos token draw waits for the viewer's tap */
  drawing: boolean;
}

export interface Tip {
  /** its text is `tip.<id>` */
  id: string;
  /** the situation holds now and addresses the viewer */
  when(game: GameState, c: TipContext): boolean;
  anchor(game: GameState, c: TipContext): TipAnchor | null;
  /** shown during the chaos token draw, which otherwise holds the middle of the screen */
  duringDraw?: true;
  /** about the round, not a hand: shown at the phase pause even while hands are private */
  everyone?: true;
}

const kinds = (g: GameState) => new Set(g.pending?.options.map((o) => (o.value as { kind?: string } | null)?.kind));
const turn = (g: GameState) => g.pending?.kind === "turn";
const pause = (g: GameState, phase: string) => g.pending?.kind === "phase" && (g.pending.step as { phase?: string }).phase === phase;
const me = (g: GameState, c: TipContext) => (c.viewer ? g.invs[c.viewer] : null);
/** an enemy engaged with the viewer, or at their location */
const enemyNear = (g: GameState, c: TipContext): InstId | null => {
  const at = me(g, c)?.location;
  return Object.values(g.cards).find((x) => x.zone === "enemy" && (x.engagedWith === c.viewer || (!!at && x.location === at)))?.id ?? null;
};

/** in priority order: the first that holds and wasn't seen is shown */
export const TIPS: Tip[] = [
  { id: "mulligan", when: (g) => g.pending?.kind === "mulligan", anchor: () => ({ tip: "hand" }) },
  { id: "mythos", when: (g) => pause(g, "mythos"), anchor: () => ({ tip: "agenda" }), everyone: true },
  { id: "upkeep", when: (g) => pause(g, "upkeep"), anchor: () => ({ tip: "deck" }), everyone: true },
  { id: "token", when: (_, c) => c.drawing, anchor: () => ({ tip: "bag" }), duringDraw: true },
  { id: "test", when: (g, c) => g.pending?.kind === "commit" && g.skillTest?.inv === c.viewer, anchor: () => ({ tip: "skilltest" }) },
  { id: "start", when: (g) => turn(g) && g.round === 1, anchor: () => ({ tip: "act" }) },
  { id: "turn", when: turn, anchor: () => ({ tip: "bar" }) },
  { id: "enemy", when: (g, c) => turn(g) && !!enemyNear(g, c), anchor: (g, c) => ({ card: enemyNear(g, c)! }) },
  { id: "damage", when: (g, c) => turn(g) && !!me(g, c) && me(g, c)!.damage + me(g, c)!.horror > 0, anchor: () => ({ tip: "portrait" }) },
  { id: "endTurn", when: (g) => turn(g) && kinds(g).has("endTurn") && g.invs[g.pending!.inv].actionsLeft === 0, anchor: () => ({ tip: "endTurn" }) },
  { id: "investigate", when: (g) => turn(g) && kinds(g).has("investigate"), anchor: () => ({ tip: "investigate" }) },
  { id: "move", when: (g) => turn(g) && kinds(g).has("move"), anchor: () => ({ tip: "move" }) },
  { id: "play", when: (g) => turn(g) && kinds(g).has("play"), anchor: () => ({ tip: "hand" }) },
  { id: "undo", when: (g, c) => turn(g) && c.canUndo, anchor: () => ({ tip: "undo" }) },
];

/** the tip to show now, or null: tips on, the first that holds and wasn't seen, for the viewer's hand on screen */
export function pickTip(game: GameState, c: TipContext, seen: ReadonlySet<string>, on: boolean): Tip | null {
  if (!on || !game.pending || game.phase === "ended") return null;
  return TIPS.find((tip) => !seen.has(tip.id) && (c.shown || tip.everyone) && tip.when(game, c)) ?? null;
}

/** the tips seen on this device, kept in local storage */
export const TIPS_KEY = "ah:tips";
