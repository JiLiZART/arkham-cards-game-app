import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import { autoPlay, botChoice } from "../../engine/bot";
import {
  applyScenarioEnd,
  migrateCampaign,
  scenarioSetup,
  startCampaign,
  type CampaignState,
  type NewCampaign,
} from "../../engine/campaign";
import { advance, type FlowValue } from "../../engine/flow";
import { createGame, dispatch, ENGINE_VERSION, replay } from "../../engine/engine";
import { upgradeDeck, type UpgradeResult } from "../../engine/upgrade";
import type { Move, RoomSave } from "../../net/moves";
import { quietNextGame } from "../game/arrivals";
import { useView } from "./view";
import type { Action, ContentDb, GameEvent, GameSetup, GameState, InvId } from "../../engine/types";

export const SAVE_KEY = "ah:save";
const LOCALE_KEY = "ah:locale";

/** the language chosen here before, else the browser's own when the app has it: a friend opening a room link reads their own */
export function startLocale(storage: Storage, lang = globalThis.navigator?.language ?? ""): string {
  return storage.getItem(LOCALE_KEY) ?? (lang.toLowerCase().startsWith("ru") ? "ru" : "en");
}
/** the build, for bug reports (set from package.json by vite.config.ts) */
export const APP_VERSION = (import.meta.env?.VITE_APP_VERSION as string | undefined) ?? "dev";

/** events worth a beat of animation; the rest update the table instantly */
export const ANIMATED = new Set([
  "enemyMove",
  "token",
  "testResult",
  "encounter",
  "weakness",
  "attack",
  "spawn",
  "agendaAdvance",
  "actAdvance",
  "resolution",
  "enemyDefeated",
  "defeated",
  "damage",
  "enemyDamage",
  "clues",
  "doom",
]);

/** a drawn encounter card or weakness waits in the showcase for the player's tap at every pace (its Continue is its own) */
export const HELD = new Set(["encounter", "weakness"]);
/** cards drawn but not yet sent on from the showcase (the playing event's and the queued ones'): the table doesn't show them yet */
export function heldCards(s: { current: GameEvent | null; queue: GameEvent[] }): Set<string> {
  return new Set(
    [s.current, ...s.queue].filter((e) => !!e && HELD.has(e.type) && !!e.card).map((e) => e!.card!),
  );
}
/** in Tap mode these hold until the player continues; follow-on events (damage, clues, doom) play on their timers */
const TAP = new Set([
  "token",
  "testResult",
  "attack",
  "spawn",
  "enemyMove",
  "enemyDefeated",
  "defeated",
  "agendaAdvance",
  "actAdvance",
  "resolution",
]);
/** does this event wait for the player instead of a timer at this pace */
export const holdsForTap = (e: GameEvent | null, pace: Pace) =>
  pace === "tap" && !!e && TAP.has(e.type);
/** a held event that needs the caption's Next (the token drawn by hand and the result panel have their own buttons) */
export const needsNext = (e: GameEvent | null, pace: Pace, byHand: boolean) =>
  holdsForTap(e, pace) &&
  e!.type !== "testResult" &&
  !(byHand && e!.type === "token") &&
  !HELD.has(e!.type);

/** an animated event waiting to play, with its position in game.log (the feed never shows past the next one) */
export type QueuedEvent = GameEvent & { logIndex: number };

export interface Save {
  version: number;
  campaign: CampaignState;
  setup: GameSetup | null;
  actions: Action[];
  /** the online room this save belongs to (absent for a game on one device) */
  room?: RoomSave;
  settings: {
    locale: string;
    privacy?: boolean;
    tapDecks?: boolean;
    drawByHand?: boolean;
    pace?: Pace;
    tipsOn?: boolean;
    musicVolume?: number;
    sfxVolume?: number;
    muted?: boolean;
  };
}

/** how fast events play: today's timings, 1.6 times longer, or each big event waits for a tap */
export type Pace = "normal" | "slow" | "tap";

export interface UiState {
  screen: "title" | "wizard" | "settings" | "game" | "log" | "howto" | "catalog" | "lobby";
  locale: string;
  /** chaos tokens are revealed by clicking a circle above the bag (otherwise automatically) */
  drawByHand: boolean;
  /** every draw in play waits for a tap on the deck */
  tapDecks: boolean;
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
  /** how many of `actions` Undo can never take back: up to the last one that revealed hidden information or ended a mulligan */
  undoFloor: number;
  /** game.log length before each choice of this session: the feed merges routine entries of one choice only (not saved) */
  logMarks: number[];
  notice: string | null;
  error: string | null;
  /** a campaign's card packs are loading before it starts or restores */
  loading: boolean;
  /** set while an online room is open: the player's calls become proposals to the room instead of changes made here (ADR-0018) */
  net: NetLink | null;
  /** the online room this game belongs to, saved with it */
  room: RoomSave | null;

  newCampaign(opts: NewCampaign): void;
  /** spend an investigator's experience on a new deck (between scenarios): the campaign keeps it, the result says what was refused */
  upgradeDeck(investigator: InvId, cards: Record<string, number>): UpgradeResult;
  /** begin the scenario the campaign's flow has reached (answering its Begin prompt); nothing when the flow is somewhere else */
  startScenario(seed?: number): void;
  /** answer what the campaign's flow is asking (a choice, a number, an investigator, cards, "continue"); a refused answer is reported */
  answerFlow(value: FlowValue): void;
  choose(optionId: string): void;
  /** take back the last choice: replay without it (only down to `undoFloor`) */
  undo(): void;
  /** whether the live skill test can be called off: the tester's commit window, with nothing hidden revealed since it began */
  testCancellable(): boolean;
  /** call the live skill test off: every choice since it began is taken back (the action that started it too); false when it can't be */
  cancelTest(): boolean;
  finishScenario(): void;
  resume(): boolean;
  abandon(): void;
  setLocale(l: string): void;
  setDrawByHand(on: boolean): void;
  setTapDecks(on: boolean): void;
  setPace(p: Pace): void;
  setTipsOn(on: boolean): void;
  setVolume(category: "music" | "effects", level: number): void;
  setMuted(muted: boolean): void;
  nextEvent(): void;
  skipEvents(): void;
  autoStep(n?: number): void;
  exportLog(): string;
  importLog(json: string): void;
  /** the replay log with what a bug report needs around it (settings, view, pending prompt, build) */
  exportReport(): string;
  /** load a pasted report (or a plain action log) and show its table; throws a plain message when it isn't one */
  importReport(text: string): void;
  setNet(link: NetLink | null): void;
  setRoom(room: RoomSave | null): void;
  /**
   * Make a move the room has numbered, whatever is playing here (no input gate, no proposal). The result is the reason
   * it was refused, null when made. `room` is saved with the state in the same write.
   */
  applyMove(move: Move, room?: RoomSave): Promise<string | null>;
}

/** where a room's proposals go */
export interface NetLink {
  propose(move: Move): void;
}

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const memoryStorage = (): Storage => {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
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
export const pastUndo = (prev: GameState, next: GameState) =>
  next.counters.reveal !== prev.counters.reveal || prev.pending?.kind === "mulligan";

/** whether Undo can take back the last choice now */
export const canUndo = (s: Pick<UiState, "actions" | "undoFloor" | "game">) =>
  !!s.game && s.game.phase !== "ended" && s.actions.length > s.undoFloor;

/**
 * Whether this player can take back the last choice now. In a room it is also theirs to take back only when they made
 * the last move, and nothing was numbered after it (the host checks the same rule).
 */
export const canUndoHere = (s: Pick<UiState, "actions" | "undoFloor" | "game" | "room">) => {
  if (!canUndo(s)) return false;
  const last = s.room?.moves.at(-1);
  return !s.room || (last?.by === s.room.me && last.move.t === "choose");
};

/**
 * How many of the actions to keep to be back before the live skill test began, at the turn's choice; null when the test
 * can't be called off: it isn't in the tester's commit window, it didn't start from a turn's choice (a treachery), or
 * something hidden came out since it began (Undo's floor).
 */
export function testStartIndex(
  db: ContentDb,
  s: Pick<UiState, "setup" | "actions" | "undoFloor" | "game">,
): number | null {
  const g = s.game;
  const test = g?.skillTest;
  if (
    !s.setup ||
    !g ||
    !test ||
    g.phase === "ended" ||
    g.pending?.kind !== "commit" ||
    g.pending.inv !== test.inv
  )
    return null;
  for (let k = s.actions.length - 1; k >= s.undoFloor; k--) {
    const st = replay(db, s.setup, s.actions.slice(0, k)).state;
    if (st.skillTest?.id !== test.id) return st.pending?.kind === "turn" ? k : null;
  }
  return null;
}

/** replay a recorded game, noting how far back Undo may go */
export function replayWithFloor(
  db: ContentDb,
  setup: GameSetup,
  actions: Action[],
): { state: GameState; undoFloor: number } {
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
 * What must be in place before a campaign starts or restores (its card packs, its icons, the packs of the investigators
 * and of the cards in their decks, given as `codes`): a promise while something loads, nothing when all is there, so a
 * ready campaign starts in the same call.
 */
export type Prepare = (campaignId: string, codes?: string[]) => Promise<void> | void;

export function createGameStore(
  db: ContentDb,
  storage: Storage = safeStorage(),
  prepare: Prepare = () => undefined,
): StoreApi<UiState> {
  const store = createStore<UiState>((set, get) => {
    /**
     * Record and run the pending choice's answer; false (with the error set) when the engine refuses it. The engine
     * asks before every draw in play; while "Tap decks to draw" is off the draws that follow are answered here too,
     * before anything is published, so the wait is never shown. Only a prompt with the single "draw" option is
     * answered. `first` is null to settle a state that already waits (the setting just turned off, a save loaded).
     */
    const answer = (first: string | null): boolean => {
      const start = get().game;
      if (!start) return false;
      let state = start;
      let events: GameEvent[] = [];
      const added: Action[] = [];
      let undoFloor = get().undoFloor;
      const actions = get().actions;
      const step = (option: string): string | null => {
        const a: Action = { type: "choose", inv: state.pending!.inv, option };
        const r = dispatch(db, state, a);
        if (r.error) return r.error;
        if (pastUndo(state, r.state)) undoFloor = actions.length + added.length + 1;
        added.push(a);
        state = r.state;
        events = [...events, ...r.events];
        return null;
      };
      if (first !== null) {
        if (!state.pending) return false;
        const err = step(first);
        if (err) {
          set({ error: err });
          return false;
        }
      }
      // in a room the seat's own browser sends a draw it decided to answer by itself (the net session)
      while (
        !get().net &&
        !get().tapDecks &&
        state.pending?.kind === "draw" &&
        state.pending.options.length === 1
      )
        if (step(state.pending.options[0].id)) break;
      if (!added.length) return false;
      set({
        game: state,
        actions: [...actions, ...added],
        logMarks: [...get().logMarks, start.log.length],
        undoFloor,
        error: null,
      });
      enqueue(events);
      return true;
    };
    const settleDraws = () => void answer(null);
    const persist = () => {
      const {
        campaign,
        setup,
        actions,
        locale,
        drawByHand,
        tapDecks,
        pace,
        tipsOn,
        musicVolume,
        sfxVolume,
        muted,
        room,
      } = get();
      if (!campaign) return;
      const save: Save = {
        version: ENGINE_VERSION,
        campaign,
        setup,
        actions,
        ...(room ? { room } : {}),
        settings: { locale, drawByHand, tapDecks, pace, tipsOn, musicVolume, sfxVolume, muted },
      };
      try {
        storage.setItem(SAVE_KEY, JSON.stringify(save));
      } catch {
        // quota/full private mode: the game keeps running, it just won't survive a reload
      }
    };
    /** run `then` once the campaign's packs and icons are in: at once when they already are. Settles when `then` has run or the load failed */
    const whenReady = (campaignId: string, codes: string[], then: () => void): Promise<void> => {
      let pending: Promise<void> | void;
      try {
        pending = prepare(campaignId, codes);
      } catch (e) {
        pending = Promise.reject(e);
      }
      if (!pending) {
        then();
        return Promise.resolve();
      }
      set({ loading: true, error: null });
      return pending.then(
        () => {
          set({ loading: false });
          then();
        },
        (e: unknown) =>
          set({
            loading: false,
            error: `The campaign's cards could not be loaded: ${e instanceof Error ? e.message : String(e)}`,
          }),
      );
    };
    const enqueue = (events: GameEvent[]) => {
      // the dispatch's events are the tail of game.log
      const base = (get().game?.log.length ?? events.length) - events.length;
      const animated = events
        .map((e, k) => ({ ...e, logIndex: base + k }))
        .filter((e) => ANIMATED.has(e.type));
      if (!animated.length) return;
      const queue = [...get().queue, ...animated];
      set({
        queue,
        current: get().current ?? queue[0],
        ...(get().current ? {} : { queue: queue.slice(1) }),
      });
    };
    const runNew = (opts: NewCampaign): Promise<void> => {
      const codes = [
        ...new Set(
          opts.investigators.flatMap((i) => [
            i.code,
            ...Object.keys((i.deck ?? db.decks[i.deckId])?.cards ?? {}),
          ]),
        ),
      ];
      return whenReady(opts.campaignId, codes, () => {
        const campaign = startCampaign(db, opts);
        // a campaign that opens with a prologue or a choice starts on the campaign screen; one that goes straight to its first scenario starts it
        set({
          campaign,
          setup: null,
          actions: [],
          game: null,
          error: null,
          notice: null,
          screen: "log",
        });
        persist();
        if (campaign.flow.waiting?.step.kind === "play" && !campaign.flow.shown.length)
          runStart(opts.seed);
      });
    };
    const runStart = (seed?: number) => {
      let c = get().campaign;
      if (!c) return;
      // the Begin prompt is answered here; a restarted scenario (the rules changed) has had it answered already
      if (c.flow.waiting?.step.kind === "play") c = advance(db, c, "continue");
      if (!c.flow.playing || !c.flow.play) return;
      const setup: GameSetup = {
        ...scenarioSetup(db, c, seed ?? Date.now() >>> 0),
        pacePhases: true,
        // always asked for: the setting decides who answers the draw (settleDraws), so it can change mid-game
        tapDecks: true,
      };
      const r = createGame(db, setup);
      set({
        campaign: c,
        setup,
        actions: [],
        undoFloor: 0,
        logMarks: [r.state.log.length],
        game: r.state,
        screen: "game",
        queue: [],
        current: null,
        error: null,
      });
      settleDraws();
      persist();
    };
    /** the refusal's text, null when the flow took the answer */
    const runFlow = (value: FlowValue): string | null => {
      const c = get().campaign;
      if (!c) return null;
      try {
        set({ campaign: advance(db, c, value), error: null });
        persist();
        return null;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        set({ error });
        return error;
      }
    };
    const runUpgrade = (investigator: InvId, cards: Record<string, number>): UpgradeResult => {
      const c = get().campaign;
      if (!c) return { ok: false, reason: { key: "upgrade.noCampaign" } };
      const r = upgradeDeck(db, c, investigator, cards);
      if (r.ok) {
        set({ campaign: r.campaign });
        persist();
      }
      return r;
    };
    const runUndo = (): boolean => {
      const { setup, actions } = get();
      if (!setup || !canUndo(get())) return false;
      const rest = actions.slice(0, -1);
      // the shortened list replays to exactly the game before the last choice; animations still waiting are dropped
      const game = replay(db, setup, rest).state;
      set({
        game,
        actions: rest,
        logMarks: get().logMarks.filter((m) => m < game.log.length),
        queue: [],
        current: null,
        error: null,
      });
      settleDraws();
      persist();
      return true;
    };
    const runCancelTest = (): boolean => {
      const { setup } = get();
      const k = testStartIndex(db, get());
      if (k === null || !setup) return false;
      const actions = get().actions.slice(0, k);
      const game = replay(db, setup, actions).state;
      set({
        game,
        actions,
        logMarks: get().logMarks.filter((m) => m < game.log.length),
        queue: [],
        current: null,
        error: null,
      });
      persist();
      return true;
    };
    const runFinish = (): boolean => {
      const { campaign, game } = get();
      if (!campaign || !game || game.phase !== "ended") return false;
      const next = applyScenarioEnd(db, campaign, game);
      set({ campaign: next, game: null, setup: null, actions: [], screen: "log" });
      persist();
      return true;
    };
    /** restore a save's game on this device; its settings are the caller's business */
    const restoreSave = (input: Save): Promise<void> => {
      let save = input;
      const restore = () => {
        // a campaign saved before the flow gets one (a scenario in progress stays in progress)
        const inGame = save.version === ENGINE_VERSION && !!save.setup;
        if (save.campaign)
          save = {
            ...save,
            campaign: migrateCampaign(
              db,
              save.campaign as unknown as Record<string, unknown>,
              inGame,
            ),
          };
        if (save.version !== ENGINE_VERSION || !save.setup) {
          // the rules changed since this save: keep the campaign, restart the scenario
          set({
            campaign: save.campaign,
            setup: null,
            actions: [],
            game: null,
            screen: "log",
            notice: save.setup
              ? "The game was updated: the current scenario will restart (your campaign log is kept)."
              : null,
          });
          return;
        }
        try {
          const r = replayWithFloor(db, save.setup, save.actions);
          quietNextGame();
          set({
            campaign: save.campaign,
            setup: save.setup,
            actions: save.actions,
            game: r.state,
            undoFloor: r.undoFloor,
            logMarks: [r.state.log.length],
            screen: "game",
            queue: [],
            current: null,
          });
          settleDraws();
        } catch {
          set({
            campaign: save.campaign,
            setup: null,
            actions: [],
            game: null,
            screen: "log",
            notice: "The saved scenario could not be restored; it will restart.",
          });
        }
      };
      // the campaign's cards first (a pack loaded on demand), then the replay
      if (save.campaign?.campaignId)
        return whenReady(
          save.campaign.campaignId,
          [...new Set((save.campaign.investigators ?? []).flatMap((i) => [i.code, ...i.deck]))],
          restore,
        );
      restore();
      return Promise.resolve();
    };

    return {
      screen: "title",
      locale: startLocale(storage),
      drawByHand: false,
      tapDecks: false,
      pace: "normal",
      tipsOn: true,
      musicVolume: 50,
      sfxVolume: 80,
      muted: false,
      campaign: null,
      setup: null,
      actions: [],
      game: null,
      queue: [],
      current: null,
      undoFloor: 0,
      logMarks: [],
      notice: null,
      error: null,
      loading: false,
      net: null,
      room: null,

      newCampaign(opts) {
        const net = get().net;
        if (net) return net.propose({ t: "new", opts });
        void runNew(opts);
      },

      upgradeDeck(investigator, cards) {
        const net = get().net;
        if (!net) return runUpgrade(investigator, cards);
        // the room makes the change when the move comes back; the player is told now whether it will be refused
        const c = get().campaign;
        if (!c) return { ok: false, reason: { key: "upgrade.noCampaign" } };
        const r = upgradeDeck(db, c, investigator, cards);
        if (r.ok) net.propose({ t: "upgrade", inv: investigator, cards });
        return r;
      },

      startScenario(seed) {
        const net = get().net;
        if (net) return net.propose({ t: "start", seed: seed ?? Date.now() >>> 0 });
        runStart(seed);
      },

      answerFlow(value) {
        const net = get().net;
        if (net) return net.propose({ t: "flow", value });
        runFlow(value);
      },

      choose(optionId) {
        const { game, queue, current, net } = get();
        const v = useView.getState();
        if (!game?.pending || queue.length || current || v.intro || v.showcase.length) return; // input is blocked while animating, introducing or showing drawn cards
        if (net) {
          // only the browser holding the deciding seat sends the answer
          const seats = v.mySeats;
          if (seats && !seats.includes(game.pending.inv)) return;
          return net.propose({ t: "choose", inv: game.pending.inv, option: optionId });
        }
        if (!answer(optionId)) return;
        persist();
      },

      testCancellable() {
        return testStartIndex(db, get()) !== null;
      },

      cancelTest() {
        if (testStartIndex(db, get()) === null || useView.getState().intro) return false;
        const net = get().net;
        if (net) {
          net.propose({ t: "cancelTest" });
          return true;
        }
        return runCancelTest();
      },

      undo() {
        if (!get().setup || !canUndoHere(get()) || useView.getState().intro) return;
        const net = get().net;
        if (net) return net.propose({ t: "undo" });
        runUndo();
      },

      finishScenario() {
        const { campaign, game, net } = get();
        if (!campaign || !game || game.phase !== "ended") return;
        if (net) return net.propose({ t: "finish" });
        runFinish();
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
        set({
          locale: save.settings?.locale ?? "en",
          drawByHand: save.settings?.drawByHand ?? false,
          tapDecks: save.settings?.tapDecks ?? false,
          pace: save.settings?.pace ?? "normal",
          tipsOn: save.settings?.tipsOn ?? true,
          musicVolume: save.settings?.musicVolume ?? 50,
          sfxVolume: save.settings?.sfxVolume ?? 80,
          muted: save.settings?.muted ?? false,
          room: save.room ?? null,
        });
        void restoreSave(save);
        return true;
      },

      async applyMove(move, room) {
        const before = get().room;
        if (room) set({ room });
        set({ error: null });
        const refused = await (async (): Promise<string | null> => {
          switch (move.t) {
            case "new":
              await runNew(move.opts);
              return get().error;
            case "load":
              await restoreSave(move.save);
              return get().error;
            case "start":
              runStart(move.seed);
              return get().error;
            case "choose":
              if (get().game?.pending?.inv !== move.inv) return "net.refused.notDeciding";
              if (!answer(move.option)) return get().error ?? "net.refused.notDeciding";
              persist();
              return null;
            case "flow":
              return runFlow(move.value);
            case "upgrade": {
              const r = runUpgrade(move.inv, move.cards);
              return r.ok ? null : r.reason.key;
            }
            case "undo":
              return runUndo() ? null : "net.refused.undoFloor";
            case "cancelTest":
              return runCancelTest() ? null : "net.refused.notDeciding";
            case "finish":
              return runFinish() ? null : "net.refused.notDeciding";
          }
        })();
        if (refused && room) set({ room: before });
        return refused;
      },

      setNet(net) {
        set({ net });
      },

      setRoom(room) {
        set({ room });
        persist();
      },

      abandon() {
        storage.removeItem(SAVE_KEY);
        set({
          room: null,
          campaign: null,
          setup: null,
          actions: [],
          game: null,
          screen: "title",
          queue: [],
          current: null,
        });
      },

      setLocale(locale) {
        set({ locale });
        storage.setItem(LOCALE_KEY, locale);
        persist();
      },
      setDrawByHand(drawByHand) {
        set({ drawByHand });
        persist();
      },
      setTapDecks(tapDecks) {
        set({ tapDecks });
        settleDraws();
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
        set({
          game: r.state,
          actions: [...actions, ...added],
          undoFloor,
          logMarks: [...get().logMarks, game.log.length],
          queue: [],
          current: null,
        });
        persist();
      },

      exportLog() {
        const { setup, actions, campaign } = get();
        return JSON.stringify({ version: ENGINE_VERSION, setup, actions, campaign }, null, 1);
      },

      exportReport() {
        const { setup, actions, campaign, game, locale, drawByHand, pace } = get();
        return JSON.stringify(
          {
            version: ENGINE_VERSION,
            app: APP_VERSION,
            setup,
            actions,
            campaign,
            settings: { locale, drawByHand, pace },
            view: { viewing: useView.getState().viewing },
            pending: game?.pending
              ? { inv: game.pending.inv, kind: game.pending.kind, prompt: game.pending.prompt }
              : null,
            where: game
              ? { scenario: game.scenarioId, round: game.round, phase: game.phase }
              : null,
          },
          null,
          1,
        );
      },

      importReport(text) {
        let data: {
          setup?: GameSetup;
          actions?: Action[];
          settings?: Partial<Save["settings"]>;
          view?: { viewing?: InvId | null };
        };
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("This text is not valid JSON; paste the whole report.");
        }
        if (!data || typeof data !== "object" || !data.setup || !Array.isArray(data.actions))
          throw new Error("This is not a game report (it has no setup and actions).");
        const st = data.settings;
        if (st)
          set({
            ...(typeof st.locale === "string" ? { locale: st.locale } : {}),
            ...(typeof st.drawByHand === "boolean" ? { drawByHand: st.drawByHand } : {}),
            ...(st.pace ? { pace: st.pace } : {}),
          });
        get().importLog(text);
        const viewing = data.view?.viewing ?? null;
        useView.setState({ viewing: viewing && get().game?.invs[viewing] ? viewing : null });
      },

      importLog(json) {
        const data = JSON.parse(json) as {
          setup: GameSetup;
          actions: Action[];
          campaign?: CampaignState;
        };
        const r = replayWithFloor(db, data.setup, data.actions);
        quietNextGame();
        set({
          setup: data.setup,
          actions: data.actions,
          game: r.state,
          undoFloor: r.undoFloor,
          logMarks: [r.state.log.length],
          campaign: data.campaign
            ? migrateCampaign(db, data.campaign as unknown as Record<string, unknown>, true)
            : get().campaign,
          screen: "game",
          queue: [],
          current: null,
        });
        settleDraws();
        persist();
      },
    };
  });
  return store;
}

export const useBound = <T>(store: StoreApi<UiState>, sel: (s: UiState) => T) =>
  useStore(store, sel);
export { autoPlay };
