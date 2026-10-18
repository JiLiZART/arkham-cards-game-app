import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import { autoPlay, botChoice } from "../engine/bot";
import {
  applyScenarioEnd, currentScenarioId, scenarioSetup, startCampaign, type CampaignState, type NewCampaign,
} from "../engine/campaign";
import { createGame, dispatch, ENGINE_VERSION, replay } from "../engine/engine";
import { quietNextGame } from "./arrivals";
import { useView } from "./view";
import type { Action, ContentDb, GameEvent, GameSetup, GameState, InvId } from "../engine/types";

export const SAVE_KEY = "ah:save";
/** the build, for bug reports (set from package.json by vite.config.ts) */
export const APP_VERSION = (import.meta.env?.VITE_APP_VERSION as string | undefined) ?? "dev";

/** events worth a beat of animation; the rest update the table instantly */
export const ANIMATED = new Set(["enemyMove", "token", "testResult", "encounter", "weakness", "attack", "spawn", "agendaAdvance", "actAdvance", "resolution", "enemyDefeated", "defeated", "damage", "enemyDamage", "clues", "doom"]);

/** a drawn encounter card or weakness waits in the showcase for the player's tap at every pace (its Continue is its own) */
export const HELD = new Set(["encounter", "weakness"]);
/** cards drawn but not yet sent on from the showcase (the playing event's and the queued ones'): the table doesn't show them yet */
export function heldCards(s: { current: GameEvent | null; queue: GameEvent[] }): Set<string> {
  return new Set([s.current, ...s.queue].filter((e) => !!e && HELD.has(e.type) && !!e.card).map((e) => e!.card!));
}
/** in Tap mode these hold until the player continues; follow-on events (damage, clues, doom) play on their timers */
const TAP = new Set(["token", "testResult", "attack", "spawn", "enemyMove", "enemyDefeated", "defeated", "agendaAdvance", "actAdvance", "resolution"]);
/** does this event wait for the player instead of a timer at this pace */
export const holdsForTap = (e: GameEvent | null, pace: Pace) => pace === "tap" && !!e && TAP.has(e.type);
/** a held event that needs the caption's Next (the token drawn by hand and the result panel have their own buttons) */
export const needsNext = (e: GameEvent | null, pace: Pace, byHand: boolean) => holdsForTap(e, pace) && e!.type !== "testResult" && !(byHand && e!.type === "token") && !HELD.has(e!.type);

/** an animated event waiting to play, with its position in game.log (the feed never shows past the next one) */
export type QueuedEvent = GameEvent & { logIndex: number };

export interface Save {
  version: number;
  campaign: CampaignState;
  setup: GameSetup | null;
  actions: Action[];
  settings: { locale: string; privacy: boolean; drawByHand?: boolean; pace?: Pace; tipsOn?: boolean; musicVolume?: number; sfxVolume?: number; muted?: boolean };
}

/** how fast events play: today's timings, 1.6 times longer, or each big event waits for a tap */
export type Pace = "normal" | "slow" | "tap";

export interface UiState {
  screen: "title" | "wizard" | "settings" | "game" | "log" | "howto";
  locale: string;
  privacy: boolean;
  /** chaos tokens are revealed by clicking a circle above the bag (otherwise automatically) */
  drawByHand: boolean;
  pace: Pace;
  /** a first-time player's tips are shown (see tips.ts) */
  tipsOn: boolean;
  /** music and effects levels, 0 to 100, and the mute that silences both while keeping them */
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  campaign: CampaignState | null;
  setup: GameSetup | null;
  actions: Action[];
  game: GameState | null;
  /** events waiting to be animated */
  queue: QueuedEvent[];
  current: QueuedEvent | null;
  /** investigator whose hand was revealed after the last hand-off */
  revealedFor: InvId | null;
  /** how many of `actions` Undo can never take back: up to the last one that revealed hidden information or ended a mulligan */
  undoFloor: number;
  /** game.log length before each choice of this session: the feed merges routine entries of one choice only (not saved) */
  logMarks: number[];
  notice: string | null;
  error: string | null;
  /** a campaign's card packs are loading before it starts or restores */
  loading: boolean;

  newCampaign(opts: NewCampaign): void;
  startScenario(seed?: number): void;
  choose(optionId: string): void;
  /** take back the last choice: replay without it (only down to `undoFloor`) */
  undo(): void;
  finishScenario(): void;
  resume(): boolean;
  abandon(): void;
  setLocale(l: string): void;
  setDrawByHand(on: boolean): void;
  setPace(p: Pace): void;
  setTipsOn(on: boolean): void;
  setVolume(category: "music" | "effects", level: number): void;
  setMuted(muted: boolean): void;
  setPrivacy(p: boolean): void;
  confirmHandoff(): void;
  nextEvent(): void;
  skipEvents(): void;
  autoStep(n?: number): void;
  exportLog(): string;
  importLog(json: string): void;
  /** the replay log with what a bug report needs around it (settings, view, pending prompt, build) */
  exportReport(): string;
  /** load a pasted report (or a plain action log) and show its table; throws a plain message when it isn't one */
  importReport(text: string): void;
}

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const memoryStorage = (): Storage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

export function safeStorage(): Storage {
  try {
    const s = globalThis.localStorage;
    s.setItem("ah:probe", "1");
    s.removeItem("ah:probe");
    return s;
  } catch {
    return memoryStorage();
  }
}

/** who should be looking at the screen: the player who must answer now */
export function viewerOf(s: GameState | null): InvId | null {
  if (!s) return null;
  return s.pending?.inv ?? s.active ?? s.lead;
}

/** is the choice that turned `prev` into `next` beyond Undo: it revealed hidden information, or it was a mulligan choice */
export const pastUndo = (prev: GameState, next: GameState) => next.counters.reveal !== prev.counters.reveal || prev.pending?.kind === "mulligan";

/** whether Undo can take back the last choice now */
export const canUndo = (s: Pick<UiState, "actions" | "undoFloor" | "game">) => !!s.game && s.game.phase !== "ended" && s.actions.length > s.undoFloor;

/** replay a recorded game, noting how far back Undo may go */
export function replayWithFloor(db: ContentDb, setup: GameSetup, actions: Action[]): { state: GameState; undoFloor: number } {
  let state = createGame(db, setup).state;
  let undoFloor = 0;
  actions.forEach((a, k) => {
    const r = dispatch(db, state, a);
    if (r.error) throw new Error(`replay failed at ${JSON.stringify(a)}: ${r.error}`);
    if (pastUndo(state, r.state)) undoFloor = k + 1;
    state = r.state;
  });
  return { state, undoFloor };
}

/**
 * What must be in place before a campaign starts or restores (its card packs, its icons): a promise while something
 * loads, nothing when all is there, so a ready campaign starts in the same call.
 */
export type Prepare = (campaignId: string) => Promise<void> | void;

export function createGameStore(db: ContentDb, storage: Storage = safeStorage(), prepare: Prepare = () => undefined): StoreApi<UiState> {
  const store = createStore<UiState>((set, get) => {
    const persist = () => {
      const { campaign, setup, actions, locale, privacy, drawByHand, pace, tipsOn, musicVolume, sfxVolume, muted } = get();
      if (!campaign) return;
      const save: Save = { version: ENGINE_VERSION, campaign, setup, actions, settings: { locale, privacy, drawByHand, pace, tipsOn, musicVolume, sfxVolume, muted } };
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(save));
      } catch {
        // quota/full private mode: the game keeps running, it just won't survive a reload
      }
    };
    /** run `then` once the campaign's packs and icons are in: at once when they already are */
    const whenReady = (campaignId: string, then: () => void) => {
      let pending: Promise<void> | void;
      try {
        pending = prepare(campaignId);
      } catch (e) {
        pending = Promise.reject(e);
      }
      if (!pending) return then();
      set({ loading: true, error: null });
      pending.then(
        () => {
          set({ loading: false });
          then();
        },
        (e: unknown) => set({ loading: false, error: `The campaign's cards could not be loaded: ${e instanceof Error ? e.message : String(e)}` }),
      );
    };
    const enqueue = (events: GameEvent[]) => {
      // the dispatch's events are the tail of game.log
      const base = (get().game?.log.length ?? events.length) - events.length;
      const animated = events.map((e, k) => ({ ...e, logIndex: base + k })).filter((e) => ANIMATED.has(e.type));
      if (!animated.length) return;
      const queue = [...get().queue, ...animated];
      set({ queue, current: get().current ?? queue[0], ...(get().current ? {} : { queue: queue.slice(1) }) });
    };
    return {
      screen: "title", locale: "en", privacy: true, drawByHand: true, pace: "normal", tipsOn: true, musicVolume: 50, sfxVolume: 80, muted: false, campaign: null, setup: null, actions: [], game: null,
      queue: [], current: null, revealedFor: null, undoFloor: 0, logMarks: [], notice: null, error: null, loading: false,

      newCampaign(opts) {
        whenReady(opts.campaignId, () => {
          const campaign = startCampaign(db, opts);
          set({ campaign, setup: null, actions: [], game: null, error: null, notice: null });
          get().startScenario(opts.seed);
        });
      },

      startScenario(seed) {
        const c = get().campaign;
        if (!c || !currentScenarioId(db, c)) return;
        const setup: GameSetup = { ...scenarioSetup(db, c, seed ?? (Date.now() >>> 0)), pacePhases: true };
        const r = createGame(db, setup);
        set({ setup, actions: [], undoFloor: 0, logMarks: [r.state.log.length], game: r.state, screen: "game", queue: [], current: null, revealedFor: null, error: null });
        persist();
      },

      choose(optionId) {
        const { game, actions, queue, current } = get();
        const v = useView.getState();
        if (!game?.pending || queue.length || current || v.intro || v.showcase.length) return; // input is blocked while animating, introducing or showing drawn cards
        const action: Action = { type: "choose", inv: game.pending.inv, option: optionId };
        const r = dispatch(db, game, action);
        if (r.error) {
          set({ error: r.error });
          return;
        }
        set({ game: r.state, actions: [...actions, action], logMarks: [...get().logMarks, game.log.length], error: null, ...(pastUndo(game, r.state) ? { undoFloor: actions.length + 1 } : {}) });
        enqueue(r.events);
        persist();
      },

      undo() {
        const { setup, actions } = get();
        if (!setup || !canUndo(get()) || useView.getState().intro) return;
        const rest = actions.slice(0, -1);
        // the shortened list replays to exactly the game before the last choice; animations still waiting are dropped
        const game = replay(db, setup, rest).state;
        set({ game, actions: rest, logMarks: get().logMarks.filter((m) => m < game.log.length), queue: [], current: null, error: null });
        persist();
      },

      finishScenario() {
        const { campaign, game } = get();
        if (!campaign || !game || game.phase !== "ended") return;
        const next = applyScenarioEnd(db, campaign, game);
        set({ campaign: next, game: null, setup: null, actions: [], screen: "log" });
        persist();
      },

      resume() {
        const raw = storage.getItem(SAVE_KEY);
        if (!raw) return false;
        let save: Save;
        try {
          save = JSON.parse(raw);
        } catch {
          return false;
        }
        const settings = { locale: save.settings?.locale ?? "en", privacy: save.settings?.privacy ?? true, drawByHand: save.settings?.drawByHand ?? true, pace: save.settings?.pace ?? "normal", tipsOn: save.settings?.tipsOn ?? true, musicVolume: save.settings?.musicVolume ?? 50, sfxVolume: save.settings?.sfxVolume ?? 80, muted: save.settings?.muted ?? false };
        set(settings);
        const restore = () => {
          if (save.version !== ENGINE_VERSION || !save.setup) {
            // the rules changed since this save: keep the campaign, restart the scenario
            set({
              campaign: save.campaign, setup: null, actions: [], game: null, screen: "log",
              notice: save.setup ? "The game was updated: the current scenario will restart (your campaign log is kept)." : null,
            });
            return;
          }
          try {
            const r = replayWithFloor(db, save.setup, save.actions);
            quietNextGame();
            set({ campaign: save.campaign, setup: save.setup, actions: save.actions, game: r.state, undoFloor: r.undoFloor, logMarks: [r.state.log.length], screen: "game", queue: [], current: null, revealedFor: null });
          } catch {
            set({ campaign: save.campaign, setup: null, actions: [], game: null, screen: "log", notice: "The saved scenario could not be restored; it will restart." });
          }
        };
        // the campaign's cards first (a pack loaded on demand), then the replay
        if (save.campaign?.campaignId) whenReady(save.campaign.campaignId, restore);
        else restore();
        return true;
      },

      abandon() {
        storage.removeItem(SAVE_KEY);
        set({ campaign: null, setup: null, actions: [], game: null, screen: "title", queue: [], current: null });
      },

      setLocale(locale) {
        set({ locale });
        persist();
      },
      setPrivacy(privacy) {
        set({ privacy });
        persist();
      },
      setDrawByHand(drawByHand) {
        set({ drawByHand });
        persist();
      },
      setPace(pace) {
        set({ pace });
        persist();
      },
      setTipsOn(tipsOn) {
        set({ tipsOn });
        persist();
      },
      setVolume(category, level) {
        set(category === "music" ? { musicVolume: level } : { sfxVolume: level });
        persist();
      },
      setMuted(muted) {
        set({ muted });
        persist();
      },
      confirmHandoff() {
        set({ revealedFor: viewerOf(get().game) });
      },
      nextEvent() {
        const [head, ...rest] = get().queue;
        set({ current: head ?? null, queue: rest });
      },
      skipEvents() {
        set({ current: null, queue: [] });
      },

      autoStep(n = 1) {
        // debug: let the bot answer n choices
        const { game, actions } = get();
        if (!game?.pending) return;
        let r = { state: game, events: [] as GameEvent[] };
        const added: Action[] = [];
        let undoFloor = get().undoFloor;
        for (let k = 0; k < n && r.state.pending; k++) {
          const a: Action = { type: "choose", inv: r.state.pending.inv, option: botChoice(db, r) };
          const prev = r.state;
          r = dispatch(db, r.state, a);
          added.push(a);
          if (pastUndo(prev, r.state)) undoFloor = actions.length + added.length;
        }
        set({ game: r.state, actions: [...actions, ...added], undoFloor, logMarks: [...get().logMarks, game.log.length], queue: [], current: null });
        persist();
      },

      exportLog() {
        const { setup, actions, campaign } = get();
        return JSON.stringify({ version: ENGINE_VERSION, setup, actions, campaign }, null, 1);
      },

      exportReport() {
        const { setup, actions, campaign, game, locale, privacy, drawByHand, pace } = get();
        return JSON.stringify(
          {
            version: ENGINE_VERSION,
            app: APP_VERSION,
            setup, actions, campaign,
            settings: { locale, privacy, drawByHand, pace },
            view: { viewing: useView.getState().viewing },
            pending: game?.pending ? { inv: game.pending.inv, kind: game.pending.kind, prompt: game.pending.prompt } : null,
            where: game ? { scenario: game.scenarioId, round: game.round, phase: game.phase } : null,
          },
          null,
          1,
        );
      },

      importReport(text) {
        let data: { setup?: GameSetup; actions?: Action[]; settings?: Partial<Save["settings"]>; view?: { viewing?: InvId | null } };
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("This text is not valid JSON; paste the whole report.");
        }
        if (!data || typeof data !== "object" || !data.setup || !Array.isArray(data.actions)) throw new Error("This is not a game report (it has no setup and actions).");
        const st = data.settings;
        if (st) set({ ...(typeof st.locale === "string" ? { locale: st.locale } : {}), ...(typeof st.privacy === "boolean" ? { privacy: st.privacy } : {}), ...(typeof st.drawByHand === "boolean" ? { drawByHand: st.drawByHand } : {}), ...(st.pace ? { pace: st.pace } : {}) });
        get().importLog(text);
        const viewing = data.view?.viewing ?? null;
        useView.setState({ viewing: viewing && get().game?.invs[viewing] ? viewing : null });
      },

      importLog(json) {
        const data = JSON.parse(json) as { setup: GameSetup; actions: Action[]; campaign?: CampaignState };
        const r = replayWithFloor(db, data.setup, data.actions);
        quietNextGame();
        set({ setup: data.setup, actions: data.actions, game: r.state, undoFloor: r.undoFloor, logMarks: [r.state.log.length], campaign: data.campaign ?? get().campaign, screen: "game", queue: [], current: null });
        persist();
      },
    };
  });
  return store;
}

export const useBound = <T,>(store: StoreApi<UiState>, sel: (s: UiState) => T) => useStore(store, sel);
export { autoPlay };
