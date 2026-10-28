import { useEffect, useRef, useState } from "react";
import { t } from "../../../content/i18n";
import { AWAY_MS, freeSeats, type Player } from "../../../net/protocol";
import { db, gameStore, useGame } from "../../state/context";
import { useView } from "../../state/view";
import { copyLink, leaveRoom, useNet, useOnline } from "../../state/online";
import { investigatorInfo } from "../../menu/wizard";
import { netText } from "../../menu/Lobby";
import { Portrait } from "../../components/Portrait";
import { cx } from "../../components/cx";
import styles from "./NetIndicator.module.css";

/** connected directly, through the room server (ADR-0020), reconnecting, or gone */
type Link = "ok" | "via" | "wait" | "gone";

/** the online room in the top bar: how many are connected, who holds which investigator, the invite link, the way out */
export function NetIndicator() {
  const locale = useGame((s) => s.locale);
  const session = useOnline((s) => s.session);
  const net = useNet((s) => s);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [, tick] = useState(0);
  const seen = useRef(0);
  const offered = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const tr = (key: string, vars?: Record<string, string | number>) => t(db, locale, key, vars);

  // a refusal or a warning shows for a few seconds, wherever the player is looking
  const n = net.notice?.n ?? 0;
  useEffect(() => {
    if (!net.notice || n === seen.current) return;
    seen.current = n;
    setToast(netText(locale, net.notice.key, net.notice.detail));
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [n, net.notice, locale]);

  // someone who arrives at a game with a free seat is shown the room menu once, where the seats are
  const arrivedFree =
    net.roster?.mode === "game" &&
    !Object.values(net.roster.seats).includes(net.me ?? "") &&
    freeSeats(net.roster).length > 0 &&
    net.roster.host !== net.me;
  // a host who has just opened a saved campaign online is shown where the invite link is
  const openedAlone =
    net.roster?.mode === "game" &&
    net.roster.host === net.me &&
    Object.keys(net.roster.players).length === 1;
  useEffect(() => {
    if ((arrivedFree || openedAlone) && !offered.current) {
      offered.current = true;
      setOpen(true);
    }
  }, [arrivedFree, openedAlone]);

  // the open menu takes the focus, closes on Esc or a tap outside, and redraws now and then: the host's "Release seat"
  // appears once a player has been away long enough, with nothing else changing
  // an armed Leave disarms by itself
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(false), 4000);
    return () => clearTimeout(timer);
  }, [leaving]);
  useEffect(() => {
    if (!open) {
      setLeaving(false);
      setCopied(null);
      return;
    }
    panel.current?.focus();
    // the notice goes into the menu while it is open
    setToast(null);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      pill.current?.focus();
    };
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    const timer = setInterval(() => tick((k) => k + 1), 10_000);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
      clearInterval(timer);
    };
  }, [open]);
  const setNetOpen = useView((s) => s.setNetOpen);
  useEffect(() => {
    setNetOpen(open);
    return () => setNetOpen(false);
  }, [open, setNetOpen]);

  if (!session || net.phase === "closed") return null;
  const roster = net.roster;
  const state = (p: Player): Link => {
    if (!p.online) return "gone";
    if (p.id === net.me) return net.online ? "ok" : "wait";
    if (net.peers[p.id] === "open") return "ok";
    // no peer connection yet (or none possible on that network): moves still reach them through the room
    return net.online ? "via" : "wait";
  };
  const players = roster
    ? Object.values(roster.players).sort((a, b) => a.joinedAt - b.joinedAt)
    : [];
  const connected = players.filter((p) => state(p) === "ok" || state(p) === "via").length;
  const all: Link =
    !net.online || players.some((p) => p.online && state(p) === "wait") ? "wait" : "ok";
  const host = !!roster && roster.host === net.me;
  const heldBy = (id: string) =>
    Object.entries(roster?.seats ?? {})
      .filter(([, who]) => who === id)
      .map(([inv]) => inv);
  const label = (p: Player) => {
    if (!p.online) return tr("net.away");
    const s = state(p);
    return s === "ok"
      ? tr("net.connected")
      : s === "via"
        ? tr("net.viaServer")
        : tr("net.reconnecting");
  };

  // the pill says in words when this browser has lost the room
  const pillText = !roster
    ? tr("net.connecting")
    : net.online
      ? `${connected}/${players.length}`
      : tr("net.reconnectingNow");
  const note = toast ?? (roster && !net.online ? tr("net.lobby.offline") : null);
  const away = (p: Player) =>
    host && !p.online ? Math.max(0, AWAY_MS - (Date.now() - p.lastSeen)) : 0;
  const clock = (ms: number) => {
    const sec = Math.ceil(ms / 1000);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  };

  return (
    <div className={styles.net} data-testid="net-indicator" ref={root}>
      <button
        className={styles.pill}
        ref={pill}
        aria-expanded={open}
        aria-label={`${tr("net.indicator")}: ${pillText}`}
        title={tr("net.indicator")}
        onClick={() => setOpen(!open)}
      >
        <span className={cx(styles.dot, styles[all])} aria-hidden />
        {pillText}
        {net.busy && <small> {tr("net.catching")}</small>}
      </button>
      {note && !open && (
        <div className={styles.toast} role="status">
          {note}
        </div>
      )}
      {open && roster && (
        <div
          className={styles.panel}
          role="dialog"
          aria-label={tr("net.indicator")}
          tabIndex={-1}
          ref={panel}
        >
          {note && (
            <p className={styles.warn} role="status">
              {note}
            </p>
          )}
          <h3>{tr("net.players")}</h3>
          <ul className={styles.players}>
            {players.map((p) => (
              <li key={p.id} data-testid={`net-player-${p.name}`}>
                <span className={cx(styles.dot, styles[state(p)])} aria-hidden />
                <span className={styles.name}>
                  {p.name}
                  {p.id === roster.host && <small> {tr("net.host")}</small>}
                </span>
                <span className={styles.held}>
                  {heldBy(p.id).length ? (
                    heldBy(p.id).map((inv) => (
                      <Portrait
                        key={inv}
                        code={inv}
                        size={26}
                        title={investigatorInfo(db, inv, locale).name}
                      />
                    ))
                  ) : (
                    <small>{tr("net.watching")}</small>
                  )}
                </span>
                <small className={styles.state}>{label(p)}</small>
                {host &&
                  !p.online &&
                  away(p) === 0 &&
                  Object.values(roster.seats).includes(p.id) && (
                    <button onClick={() => session.releaseAway(p.id)}>
                      {tr("net.releaseAway")}
                    </button>
                  )}
                {away(p) > 0 && Object.values(roster.seats).includes(p.id) && (
                  <small className={styles.sub}>
                    {tr("net.releaseIn", { time: clock(away(p)) })}
                  </small>
                )}
              </li>
            ))}
          </ul>
          {roster.mode === "game" && freeSeats(roster).length > 0 && (
            <>
              <h3>{tr("net.freeSeats")}</h3>
              <ul className={styles.players}>
                {freeSeats(roster).map((inv) => (
                  <li key={inv}>
                    <Portrait code={inv} size={26} />
                    <span className={styles.name}>{investigatorInfo(db, inv, locale).name}</span>
                    <button
                      aria-label={tr("net.lobby.takeNamed", {
                        name: investigatorInfo(db, inv, locale).name,
                      })}
                      onClick={() => session.claim(inv)}
                    >
                      {tr("net.takeSeat")}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {copied === "failed" && <p className={styles.warn}>{tr("net.lobby.copyFailed")}</p>}
          <div className={styles.actions}>
            <button
              aria-live="polite"
              onClick={() => void copyLink().then((ok) => setCopied(ok ? "ok" : "failed"))}
            >
              {copied === "ok" ? tr("net.lobby.copied") : tr("net.lobby.copy")}
            </button>
            {/* leaving mid-game is asked twice: the first tap only arms it */}
            <button
              className={cx(styles.leave, leaving && styles.armed)}
              data-testid="net-leave"
              onClick={() => {
                if (!leaving) return setLeaving(true);
                leaveRoom();
                setOpen(false);
                gameStore.setState({ notice: null });
              }}
            >
              {tr(leaving ? "net.leaveSure" : "net.lobby.leave")}
            </button>
            <span className={styles.sr} role="status">
              {leaving ? tr("net.leaveSure") : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
