/**
 * One browser's part in an online room (ADR-0018, ADR-0019). It joins the room server, keeps a mesh of peer
 * connections, and turns the store's calls into moves: the host numbers them, every browser applies them in order.
 * The pipes (socket and peer connections) come in as dependencies, so the logic runs in Node under test.
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import { ENGINE_VERSION } from "../engine/engine";
import type { DeckDef } from "../content/schema";
import type { InvId } from "../engine/types";
import { canUndo, type Save, type UiState } from "../ui/state/store";
import { MoveLog } from "./log";
import { allowed, type Ctx, type Move, type Numbered, type Proposal, type RoomSave } from "./moves";
import { playerId, PROTOCOL, type DeckPick, type Lobby, type Roster } from "./protocol";
import type {
  IceConfig,
  Link,
  LinkFactory,
  LinkState,
  Mesh,
  MeshFactory,
  PeerState,
  ShownView,
  Wire,
} from "./transport";

/** what the UI shows of a session */
export interface NetState {
  /** connecting: no welcome yet; joined; refused: the room won't have this browser; closed: left */
  phase: "connecting" | "joined" | "refused" | "closed";
  /** the room server's socket is open */
  online: boolean;
  me: string | null;
  roster: Roster<DeckDef> | null;
  peers: Record<string, PeerState>;
  /** TURN relays are available; null until known */
  relay: boolean | null;
  /** moves are being applied: this browser is catching up */
  busy: boolean;
  /** the latest thing the player is told: an i18n key, a detail, and a counter so repeats show again */
  notice: { key: string; detail?: string; n: number } | null;
}

export interface SessionDeps {
  store: StoreApi<UiState>;
  setMySeats(seats: InvId[] | null): void;
  /** another player opened a table card: `from` is their name in the room */
  onShow?(from: string, view: ShownView): void;
  /** the player's own full-size views, to show the room: `send` each one; returns what stops watching */
  watchViews?(send: (view: ShownView) => void): () => void;
  link: LinkFactory;
  mesh: MeshFactory;
  ice(room: string): Promise<IceConfig>;
  roomId: string;
  /** this browser's secret for the room */
  key: string;
  name: string;
  app: string;
  /** a seed for the campaign the host starts */
  seed?: () => number;
  /** how long a proposal may wait for its answer before the player may try again */
  proposalTimeoutMs?: number;
}

/** every investigator's seat: the ones nobody claimed belong to the host */
export function seatMap(r: Pick<Roster, "host" | "invs" | "seats">): Record<string, string> {
  const map: Record<string, string> = {};
  if (r.host) for (const inv of r.invs) map[inv] = r.host;
  return { ...map, ...r.seats };
}

const isShownView = (m: unknown): m is ShownView => {
  if (typeof m !== "object" || m === null) return false;
  if ("card" in m) return typeof m.card === "string";
  return "deck" in m && (m.deck === "act" || m.deck === "agenda" || m.deck === "reference");
};

export class Session {
  readonly net: StoreApi<NetState>;
  private log = new MoveLog();
  private link: Link | null = null;
  private mesh: Mesh | null = null;
  private me = "";
  /** moves are applied one at a time, in the order they came */
  private chain: Promise<void> = Promise.resolve();
  private working = 0;
  private waiting: ReturnType<typeof setTimeout> | null = null;
  private signalsEarly: [string, unknown][] = [];
  private starting: "new" | "load" | null = null;
  private lastHave = -1;
  private lastAutoSeq = -1;
  private noticeCount = 0;
  private stopped = false;
  /** peers this browser asked for moves: only their answers are taken */
  private asked = new Set<string>();
  private started = false;
  private unsubscribe: (() => void) | null = null;
  private unwatchViews: (() => void) | null = null;

  constructor(private d: SessionDeps) {
    this.net = createStore<NetState>(() => ({
      phase: "connecting",
      online: false,
      me: null,
      roster: null,
      peers: {},
      relay: null,
      busy: false,
      notice: null,
    }));
  }

  private get store() {
    return this.d.store;
  }
  private get roster(): Roster<DeckDef> | null {
    return this.net.getState().roster;
  }
  private isHost = () => !!this.roster && this.roster.host === this.me;

  /** join the room; a game held here that isn't the room's stays until the room's first move replaces it */
  async start(): Promise<void> {
    this.me = await playerId(this.d.key);
    // left before it began (React mounts an effect twice in development): it never touches the store or the socket
    if (this.stopped) return;
    this.started = true;
    const room = this.store.getState().room;
    if (room && room.id === this.d.roomId) this.log = new MoveLog(room.moves);
    this.net.setState({ me: this.me });
    this.store.getState().setNet({ propose: (m) => this.propose(m) });
    this.store.getState().setRoom(this.roomSave(this.log.moves));
    this.unsubscribe = this.store.subscribe(() => this.autoDraw());
    this.unwatchViews = this.d.watchViews?.((v) => this.show(v)) ?? null;
    this.link = this.d.link({
      onMessage: (m) => this.onRoom(m),
      onState: (s) => this.onLink(s),
    });
  }

  leave(): void {
    this.stopped = true;
    if (this.waiting) clearTimeout(this.waiting);
    this.unsubscribe?.();
    this.unwatchViews?.();
    this.link?.close();
    this.mesh?.close();
    if (this.started) {
      this.store.getState().setNet(null);
      this.store.getState().setRoom(null);
      this.d.setMySeats(null);
    }
    this.net.setState({ phase: "closed", online: false, peers: {} });
  }

  // ---- the lobby: plain messages to the room server

  setLobby(lobby: Partial<Lobby>) {
    this.link?.send({ t: "lobby", lobby });
  }
  claim(inv: InvId, pick?: DeckPick<DeckDef>) {
    this.link?.send({ t: "claim", inv, pick });
  }
  release(inv: InvId) {
    this.link?.send({ t: "release", inv });
  }
  releaseAway(id: string) {
    this.link?.send({ t: "releaseAway", id });
  }
  rename(name: string) {
    this.link?.send({ t: "rename", name });
  }
  /** host: close the lobby; once the room says so, the campaign starts as the first move */
  startGame() {
    this.starting = "new";
    this.link?.send({ t: "start" });
  }
  /** host: open the room on the campaign saved here; once the room says so, it becomes the first move */
  openOnSaved() {
    const c = this.store.getState().campaign;
    if (!c) return;
    this.starting = "load";
    this.link?.send({ t: "open", invs: c.investigators.map((i) => i.code) });
  }

  // ---- the room server

  private onLink(s: LinkState) {
    this.net.setState({ online: s === "open" });
    if (s === "open")
      this.link?.send({
        t: "hello",
        key: this.d.key,
        name: this.d.name,
        app: this.d.app,
        engine: ENGINE_VERSION,
        protocol: PROTOCOL,
        have: this.log.n,
      });
  }

  private onRoom(m: Parameters<Parameters<LinkFactory>[0]["onMessage"]>[0]) {
    if (this.stopped) return;
    switch (m.t) {
      case "welcome":
        this.net.setState({ phase: "joined", me: m.you });
        this.setRoster(m.roster);
        if (!this.mesh)
          void this.d.ice(this.d.roomId).then((ice) => {
            if (this.stopped || this.mesh) return;
            this.net.setState({ relay: ice.relay });
            this.mesh = this.d.mesh(this.me, ice, {
              sendSignal: (to, data) => this.link?.send({ t: "signal", to, data }),
              onWire: (from, w) => this.onWire(from, w),
              onState: (id, s) => this.onPeer(id, s),
            });
            for (const [from, data] of this.signalsEarly.splice(0)) this.mesh.signal(from, data);
            this.reconcile();
          });
        return;
      case "roster":
        this.setRoster(m.roster);
        return;
      case "signal":
        if (this.mesh) this.mesh.signal(m.from, m.data);
        else this.signalsEarly.push([m.from, m.data]);
        return;
      case "relay":
        // the room stamped who sent it: the same checks as on a peer connection apply
        this.onWire(m.from, m.w as Wire);
        return;
      case "error":
        if (m.key === "net.error.version" || m.key === "net.error.protocol")
          this.net.setState({ phase: "refused" });
        this.notify(m.key, m.detail);
    }
  }

  private setRoster(roster: Roster<DeckDef>) {
    this.net.setState({ roster });
    const seats = this.mySeats();
    this.d.setMySeats(seats);
    const room = this.store.getState().room;
    if (room && room.seats.join() !== seats.join())
      this.store.getState().setRoom({ ...room, seats });
    this.reconcile();
  }

  private reconcile() {
    const r = this.roster;
    if (!r) return;
    this.mesh?.setPeers(
      Object.values(r.players)
        .filter((p) => p.online && p.id !== this.me)
        .map((p) => p.id),
    );
    this.reportHave();
    // without a peer connection nobody says `have` to this browser: the roster says how far the host is
    const host = r.host;
    if (host && host !== this.me && (r.have[host] ?? 0) > this.log.n && !this.asked.has(host))
      this.ask(host);
    if (this.starting && r.mode === "game" && r.host === this.me && this.log.n === 0) {
      const kind = this.starting;
      this.starting = null;
      this.propose(kind === "new" ? this.newCampaign(r) : this.loadSaved());
    }
  }

  private newCampaign(r: Roster<DeckDef>): Move {
    return {
      t: "new",
      opts: {
        campaignId: r.lobby.campaignId ?? "",
        difficulty: r.lobby.difficulty,
        seed: this.d.seed?.() ?? Date.now() >>> 0,
        investigators: r.invs.map((code) => ({
          code,
          deckId: r.picks[code]?.deckId ?? "",
          ...(r.picks[code]?.deck ? { deck: r.picks[code].deck } : {}),
        })),
      },
    };
  }

  private loadSaved(): Move {
    const { campaign, setup, actions, locale } = this.store.getState();
    const save: Save = {
      version: ENGINE_VERSION,
      campaign: campaign!,
      setup,
      actions,
      settings: { locale },
    };
    return { t: "load", save };
  }

  private reportHave() {
    if (this.lastHave === this.log.n) return;
    this.lastHave = this.log.n;
    this.link?.send({ t: "have", n: this.log.n });
  }

  // ---- the investigators this browser answers for

  private mySeats(): InvId[] {
    const r = this.roster;
    if (!r) return this.store.getState().room?.seats ?? [];
    return Object.entries(seatMap(r))
      .filter(([, id]) => id === this.me)
      .map(([inv]) => inv);
  }

  private roomSave(moves: readonly Numbered[]): RoomSave {
    return {
      id: this.d.roomId,
      playerKey: this.d.key,
      me: this.me,
      seats: this.mySeats(),
      n: moves.length,
      moves: [...moves],
    };
  }

  // ---- peers

  private onPeer(id: string, state: PeerState) {
    this.net.setState({ peers: { ...this.net.getState().peers, [id]: state } });
    if (state === "open") this.mesh?.send(id, { t: "have", n: this.log.n });
  }

  private onWire(from: string, w: Wire) {
    if (this.stopped) return;
    switch (w.t) {
      case "have":
        if (w.n > this.log.n) this.ask(from);
        return;
      case "need": {
        const list = this.log.tail(w.from);
        if (list.length) this.sendTo(from, { t: "moves", list });
        return;
      }
      case "moves":
        // only an answer to a `need` this browser sent to that peer
        if (!this.asked.delete(from)) return;
        for (const m of w.list) this.accept(m);
        return;
      case "move":
        // only the host numbers moves
        if (from !== this.roster?.host) return;
        this.accept(w.m);
        return;
      case "propose":
        // who made it is who sent it, whatever the message says
        if (this.isHost()) this.hostHandle({ ...w.p, by: from });
        return;
      case "refused":
        this.clearWaiting();
        this.notify(w.key.startsWith("net.") ? w.key : "net.error.rejected", w.key);
        return;
      case "show": {
        // a view comes from a player of this room, and says what it is by shape only
        const name = this.roster?.players[from]?.name;
        if (name !== undefined && isShownView(w.m)) this.d.onShow?.(name, w.m);
      }
    }
  }

  private ask(peer: string) {
    if (this.sendTo(peer, { t: "need", from: this.log.n })) this.asked.add(peer);
  }

  /** to one player: over the peer connection when it is open, else through the room (ADR-0020) */
  private sendTo(to: string, w: Wire): boolean {
    if (this.mesh?.send(to, w)) return true;
    if (!this.link || !this.net.getState().online) return false;
    this.link.send({ t: "relay", to, w });
    return true;
  }

  /** to every other player in the room, each by whichever way reaches them */
  private sendAll(w: Wire) {
    for (const p of Object.values(this.roster?.players ?? {}))
      if (p.online && p.id !== this.me) this.sendTo(p.id, w);
  }

  /** tell the room this player opened a table card at full size */
  show(view: ShownView): void {
    this.sendAll({ t: "show", m: view });
  }

  // ---- moves

  /** what the store calls instead of making a change: the host numbers it, or sends it on to the host */
  propose(move: Move): void {
    const p: Proposal = { move, at: this.log.n, by: this.me };
    if (this.isHost()) return this.hostHandle(p);
    if (this.waiting) return; // one at a time: the answer comes before the next question
    const host = this.roster?.host;
    if (!host || !this.sendTo(host, { t: "propose", p })) {
      this.notify("net.error.offline");
      return;
    }
    this.waiting = setTimeout(() => this.clearWaiting(), this.d.proposalTimeoutMs ?? 8000);
  }

  private clearWaiting() {
    if (!this.waiting) return;
    clearTimeout(this.waiting);
    this.waiting = null;
    this.autoDraw();
  }

  private work(job: () => Promise<void>) {
    this.working++;
    this.net.setState({ busy: true });
    this.chain = this.chain.then(job).then(
      () => this.doneWorking(),
      (e: unknown) => {
        this.notify("net.error.applyFailed", e instanceof Error ? e.message : String(e));
        this.doneWorking();
      },
    );
  }

  private doneWorking() {
    this.working--;
    if (this.working) return;
    this.net.setState({ busy: false });
    this.autoDraw();
  }

  private ctx(last: Numbered | null): Ctx {
    const r = this.roster;
    const s = this.store.getState();
    return {
      host: r?.host ?? this.me,
      seats: r ? seatMap(r) : {},
      game: s.game,
      undoable: canUndo(s),
      last,
    };
  }

  private refuse(p: Proposal, key: string) {
    if (p.by === this.me) {
      this.clearWaiting();
      this.notify(key.startsWith("net.") ? key : "net.error.rejected", key);
    } else this.sendTo(p.by, { t: "refused", at: p.at, key });
  }

  /** the host: check, apply, number, tell everyone */
  private hostHandle(p: Proposal) {
    this.work(async () => {
      const nm = this.log.next(p);
      if (typeof nm === "string") return this.refuse(p, nm);
      const why = allowed(this.ctx(this.log.last), p.move, p.by);
      if (why) return this.refuse(p, why);
      const err = await this.store
        .getState()
        .applyMove(p.move, this.roomSave([...this.log.moves, nm]));
      if (err) return this.refuse(p, err);
      this.log.receive(nm);
      this.sendAll({ t: "move", m: nm });
      this.afterMove(nm);
    });
  }

  /** a peer: take a numbered move, and the ones it was waiting behind */
  private accept(nm: Numbered) {
    this.work(async () => {
      let fresh: Numbered[];
      try {
        fresh = this.log.receive(nm);
      } catch (e) {
        return this.notify("net.error.diverged", e instanceof Error ? e.message : String(e));
      }
      if (!fresh.length) {
        // it came early: ask for what is missing
        const host = this.roster?.host;
        if (nm.n > this.log.n && host) this.ask(host);
        return;
      }
      for (const m of fresh) {
        const why = allowed(this.ctx(this.log.moves[m.n - 1] ?? null), m.move, m.by);
        // peers apply it anyway, or they would drift apart; the player is told the host broke the rules
        if (why) this.notify("net.warn.forbidden", why);
        const err = await this.store
          .getState()
          .applyMove(m.move, this.roomSave(this.log.moves.slice(0, m.n + 1)));
        if (err) this.notify("net.error.applyFailed", err);
        this.afterMove(m);
      }
    });
  }

  private afterMove(nm: Numbered) {
    if (nm.by === this.me) this.clearWaiting();
    this.reportHave();
  }

  /** while "Tap decks to draw" is off, the browser of a seat answers its own draws */
  private autoDraw() {
    if (this.stopped || this.working || this.waiting) return;
    const s = this.store.getState();
    const p = s.game?.pending;
    if (!p || p.kind !== "draw" || p.options.length !== 1 || s.tapDecks) return;
    if (!this.mySeats().includes(p.inv) || p.seq === this.lastAutoSeq) return;
    this.lastAutoSeq = p.seq;
    this.propose({ t: "choose", inv: p.inv, option: p.options[0].id });
  }

  private notify(key: string, detail?: string) {
    this.net.setState({ notice: { key, detail, n: ++this.noticeCount } });
  }
}
