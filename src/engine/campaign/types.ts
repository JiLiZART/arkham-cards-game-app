/** The campaign's state and its flow's cursor, serialisable (ADR-0011): the types the campaign modules share. */
import type {
  ChaosToken,
  CampaignStep,
  DeckDef,
  Difficulty,
  FlowEffect,
  SupplyBranch,
} from "../../content/schema";
import type { InvId } from "../world/types";
import type { CampaignLog } from "./log";

export type QueueItem = string | CampaignStep;

/** what the players are asked: a step of the flow, or one the interpreter makes (reading on, the next scenario, who) */
export type WaitingStep =
  | Extract<
      CampaignStep,
      {
        kind:
          | "chooseOne"
          | "counter"
          | "investigatorChoice"
          | "cardChoice"
          | "checklist"
          | "sideScenario"
          | "unsupported"
          | "upgradeDecks"
          | "buySupplies";
      }
    >
  /** investigators among `among` who use or have a supply, from `min` to `max` of them; `branch` runs for each (ADR-0053) */
  | {
      kind: "supplyChoice";
      supply: string;
      section: string;
      among: InvId[];
      min: number;
      max: number;
      /** each chosen crosses one off */
      cross: boolean;
      branch: SupplyBranch;
    }
  | { kind: "continue" }
  | { kind: "play"; scenario: string }
  | { kind: "investigator"; effects: FlowEffect[] };

export interface Waiting {
  id: string;
  step: WaitingStep;
}

/** the facts of the scenario whose resolution is running, kept as data (the game state itself is gone by then) */
export interface ScenarioFacts {
  id: string;
  resolution: string;
  victory: number;
  victoryCodes: string[];
  /** the vengeance points in the victory display at the end, and those cards (The Forgotten Age; absent in older saves) */
  vengeance?: number;
  vengeanceCodes?: string[];
  cultistsVictory: string[];
  cultistsRemaining: string[];
  /** investigators who did not resign */
  notResigned: string[];
  /** investigators who resigned, and who were defeated (absent from a resolution started before the engine kept them) */
  resigned?: string[];
  defeated?: string[];
  /** the resolution is a checkpoint between two parts: no experience, no upgrade */
  checkpoint?: boolean;
  /** the codes each investigator exiled during the scenario */
  exiled?: Record<string, string[]>;
}

export type Shown = { story: string } | { recorded: { id: string; section: string } };

export interface FlowState {
  queue: QueueItem[];
  /** what has been read since the last prompt was answered: story steps, and the log entries recorded */
  shown: Shown[];
  waiting: Waiting | null;
  /** the order item last started (-1 before the first) */
  pos: number;
  /** the scenario to play now, or being played */
  play: string | null;
  /** a scenario is being played: the flow waits for its end */
  playing: boolean;
  /** the item play goes to next, set by a next or replayed scenario */
  override: string | null;
  skipped: string[];
  data: Record<string, unknown>;
  answers: { step: string; value: unknown }[];
  scenario: ScenarioFacts | null;
  /** the interlude or epilogue being read, for the heading */
  item: string | null;
  /** the scenario whose own setup steps (`flow.before`) are running: it is offered to play once they have; absent in older saves */
  next?: string | null;
  /** the guide has called the campaign won: its epilogue is read before it ends */
  won?: boolean;
}

export type FlowValue = string | number | string[] | null;

export interface CampaignInvestigator {
  code: InvId;
  deckId: string;
  /** full deck as card codes, including signatures and the chosen basic weakness */
  deck: string[];
  xp: number;
  physicalTrauma: number;
  mentalTrauma: number;
  status: "active" | "killed" | "insane";
  /** cards exiled from the deck in play, which an upgrade can buy back */
  exiled?: string[];
  /** the free Adaptable swaps made since scenario `after` (the number of scenarios played then) */
  swapsUsed?: { after: number; n: number };
}

export interface ScenarioRecord {
  scenarioId: string;
  resolution: string;
  xp: number;
  victory: number;
  /** the vengeance points in the victory display at its end (absent in older saves) */
  vengeance?: number;
}

export interface CampaignState {
  version: number;
  campaignId: string;
  difficulty: Difficulty;
  seed: number;
  rng: number;
  /** the campaign log, in sections (campaignLog.ts) */
  log: CampaignLog;
  chaosBag: ChaosToken[];
  /** where the campaign's flow stands: what it is waiting for, what comes next (flow.ts, ADR-0011) */
  flow: FlowState;
  lead: InvId;
  investigators: CampaignInvestigator[];
  history: ScenarioRecord[];
  result: "win" | "lose" | "survived" | null;
  /** the options chosen when the campaign was created (`CampaignDef.options` ids); absent in older saves */
  options?: string[];
}

export interface NewCampaign {
  campaignId: string;
  difficulty: Difficulty;
  seed: number;
  /** `deck` is a custom deck (saved on the device) used as given instead of the content's deck `deckId` */
  investigators: { code: InvId; deckId: string; deck?: DeckDef }[];
  /** the campaign's options to turn on (`CampaignDef.options` ids); fixed for the campaign */
  options?: string[];
}
