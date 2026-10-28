/**
 * What travels between browsers in an online room (ADR-0018): session moves, numbered by the host, and the rules for
 * who may make them. Pure: no network, no store.
 */
import type { NewCampaign } from "../engine/campaign";
import type { FlowValue } from "../engine/flow";
import type { GameState, InvId } from "../engine/types";
import type { Save } from "../ui/state/store";

/** one change to the shared game, in the shape the store already understands */
export type Move =
  | { t: "new"; opts: NewCampaign }
  | { t: "load"; save: Save }
  | { t: "start"; seed: number }
  | { t: "choose"; inv: InvId; option: string }
  | { t: "flow"; value: FlowValue }
  | { t: "upgrade"; inv: InvId; cards: Record<string, number> }
  | { t: "undo" }
  | { t: "cancelTest" }
  | { t: "finish" };

/** a move the host has accepted: its place in the log and the player who made it */
export interface Numbered {
  n: number;
  by: string;
  move: Move;
}

/** what a browser keeps of its room in the save: enough to come back to it (ADR-0018) */
export interface RoomSave {
  id: string;
  /** this browser's secret for the room; the room server keeps only its hash */
  playerKey: string;
  /** this browser's player id in the log (`Numbered.by`): the hash of the key */
  me: string;
  /** the investigators this browser holds */
  seats: InvId[];
  /** how many moves the saved state includes */
  n: number;
  /** the whole log, so this browser can bring others up to date after a takeover */
  moves: Numbered[];
}

/** a player asks the host to number a move; `at` is the log length the player saw */
export interface Proposal {
  move: Move;
  at: number;
  by: string;
}

/** who sits where, as the room's roster says */
export interface Seats {
  /** the player id of the host */
  host: string;
  /** investigator code to the player id that holds the seat */
  seats: Record<string, string>;
}

/** what a permission check reads */
export interface Ctx extends Seats {
  game: {
    pending: Pick<NonNullable<GameState["pending"]>, "inv"> | null;
    skillTest: { inv: InvId } | null;
  } | null;
  /** the store's own undo rules (the floor) say the last choice can be taken back */
  undoable: boolean;
  /** the latest numbered move */
  last: Numbered | null;
}

/** i18n keys (`net.refused.*`) of why a move was refused */
export type Refusal =
  | "net.refused.host"
  | "net.refused.seat"
  | "net.refused.notDeciding"
  | "net.refused.undoBy"
  | "net.refused.undoFloor";

const seated = (c: Seats, by: string) => by === c.host || Object.values(c.seats).includes(by);

/** null when `by` may make `move` now, else why not */
export function allowed(ctx: Ctx, move: Move, by: string): Refusal | null {
  switch (move.t) {
    case "new":
    case "load":
      return by === ctx.host ? null : "net.refused.host";
    case "start":
    case "flow":
    case "finish":
      return seated(ctx, by) ? null : "net.refused.seat";
    case "upgrade":
      return ctx.seats[move.inv] === by ? null : "net.refused.seat";
    case "choose":
      if (ctx.game?.pending?.inv !== move.inv) return "net.refused.notDeciding";
      return ctx.seats[move.inv] === by ? null : "net.refused.seat";
    case "cancelTest": {
      const tester = ctx.game?.skillTest?.inv;
      if (!tester) return "net.refused.notDeciding";
      return ctx.seats[tester] === by ? null : "net.refused.seat";
    }
    case "undo":
      if (!ctx.last || ctx.last.by !== by || ctx.last.move.t !== "choose")
        return "net.refused.undoBy";
      return ctx.undoable ? null : "net.refused.undoFloor";
  }
}
