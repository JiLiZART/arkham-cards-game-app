import { useEffect, useId, useMemo, useState } from "react";
import { campaignName, t } from "../../../content/i18n";
import type { DeckDef } from "../../../content/schema";
import { freeSeats, type DeckPick } from "../../../net/protocol";
import { db, gameStore, useGame } from "../../state/context";
import {
  BACKUP_KEY,
  copyLink,
  leaveRoom,
  playerName,
  setPlayerName,
  useNet,
  useOnline,
} from "../../state/online";
import { safeStorage } from "../../state/store";
import { Portrait } from "../../components/Portrait";
import { cx } from "../../components/cx";
import {
  campaignOrder,
  decksFor,
  investigatorInfo,
  MAX_INVESTIGATORS,
  pickerList,
} from "../wizard";
import styles from "./Lobby.module.css";

const NO_FILTER = { faction: null, cycle: null, query: "" };

/** the translated text of a notice or an error from the room */
export const netText = (locale: string, key: string, detail?: string): string => {
  const known = t(db, locale, key);
  return known === key && detail ? detail : known;
};

/** the online room before the game: a link to send, the host's campaign and difficulty, and a seat for every player */
export function Lobby() {
  const locale = useGame((s) => s.locale);
  const tr = (key: string, vars?: Record<string, string | number>) => t(db, locale, key, vars);
  const session = useOnline((s) => s.session);
  const net = useNet((s) => s);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const [slow, setSlow] = useState(false);
  // the list of investigators to pick from is open until the player has taken one
  const [pickOpen, setPickOpen] = useState(true);
  const linkId = useId();
  const nameId = useId();
  const [name, setName] = useState(playerName());
  const [deckOf, setDeckOf] = useState<Record<string, string>>({});
  const rows = useMemo(
    () => pickerList(db, locale, { ...NO_FILTER, query }).filter((i) => !i.needsDeck),
    [locale, query],
  );
  const leave = () => {
    leaveRoom();
    gameStore.setState({ screen: "title" });
  };
  const waiting = !net.roster && net.phase === "connecting";
  // a room that doesn't answer for a while says so, instead of "Connecting…" for ever
  useEffect(() => {
    setSlow(false);
    if (!waiting) return;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [waiting]);
  // "Link copied" goes back to "Copy link", so a second copy is confirmed too
  useEffect(() => {
    if (copied !== "ok") return;
    const timer = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!session || net.phase === "closed")
    return (
      <div className={cx("screen", styles.lobbyScreen)}>
        <h1>{tr("net.lobby.title")}</h1>
        <section className={styles.note}>
          <p>{tr("net.lobby.closed")}</p>
        </section>
        <div className={styles.row}>
          <button className="primary big" onClick={leave}>
            {tr("net.lobby.back")}
          </button>
        </div>
      </div>
    );

  if (net.phase === "refused")
    return (
      <div className={cx("screen", styles.lobbyScreen)}>
        <h1>{tr("net.lobby.versionTitle")}</h1>
        <section className={styles.note}>
          <p>{tr("net.lobby.versionHelp")}</p>
          <div className={styles.row}>
            <button className="primary" onClick={() => location.reload()}>
              {tr("net.lobby.reload")}
            </button>
            <button onClick={leave}>{tr("net.lobby.back")}</button>
          </div>
        </section>
      </div>
    );

  const roster = net.roster;
  const me = net.me;
  const host = !!roster && roster.host === me;
  const nameOf = (id: string) => roster?.players[id]?.name || "?";
  const campaigns = campaignOrder(db);
  const lobby = roster?.lobby;
  const campaignId = lobby?.campaignId ?? "";
  const difficulties = Object.keys(db.campaigns[campaignId]?.chaosBags ?? { standard: [] });
  const seatCount = roster ? Object.keys(roster.seats).length : 0;
  const full = roster?.mode === "lobby" && seatCount >= MAX_INVESTIGATORS;
  const seated = !!roster && Object.values(roster.seats).includes(me ?? "");
  const here = roster ? Object.values(roster.players).sort((a, b) => a.joinedAt - b.joinedAt) : [];
  const hadSave = !!safeStorage().getItem(BACKUP_KEY);

  const take = (code: string) => {
    if (roster?.mode === "game") return session.claim(code);
    const decks = decksFor(db, code, safeStorage());
    const d = decks.find((x) => x.id === deckOf[code]) ?? decks[0];
    if (!d) return;
    const pick: DeckPick<DeckDef> = db.decks[d.id] ? { deckId: d.id } : { deckId: d.id, deck: d };
    session.claim(code, pick);
  };

  const tagsOf = (id: string) =>
    [id === roster?.host && tr("net.host"), id === me && tr("net.lobby.you")]
      .filter(Boolean)
      .join(", ");

  /** the deck's own name: "Roland Banks — Starter" is the investigator's row, so it reads "Starter" */
  const deckName = (code: string, who: string) => {
    const pick = roster?.picks[code];
    const name = pick ? (db.decks[pick.deckId]?.name ?? pick.deck?.name ?? "") : "";
    return name.startsWith(`${who} — `) ? name.slice(who.length + 3) : name;
  };

  /** a claimed seat: who sits there and with which deck */
  const claimedRow = (code: string) => {
    const info = investigatorInfo(db, code, locale);
    const holder = roster?.seats[code];
    return (
      <li key={code} className={cx(styles.seat, styles.claimed)} data-testid={`seat-${code}`}>
        <Portrait code={code} size={48} />
        <span className={styles.who}>
          <b>{info.name}</b>
          <small>{deckName(code, info.name) || info.subname}</small>
        </span>
        <span className={styles.holder} title={holder ? nameOf(holder) : undefined}>
          {holder === me
            ? tr("net.lobby.you")
            : tr("net.lobby.heldBy", { name: holder ? nameOf(holder) : "?" })}
        </span>
        {holder === me && roster?.mode === "lobby" && (
          <button onClick={() => session.release(code)}>{tr("net.lobby.release")}</button>
        )}
      </li>
    );
  };

  /** a free investigator, with the deck to take them with */
  const freeRow = (code: string) => {
    const info = investigatorInfo(db, code, locale);
    const decks = decksFor(db, code, safeStorage());
    return (
      <li key={code} className={styles.seat} data-testid={`seat-${code}`}>
        <Portrait code={code} size={40} />
        <span className={styles.who}>
          <b>{info.name}</b>
          {info.subname && <small>{info.subname}</small>}
        </span>
        {roster?.mode === "lobby" && decks.length > 1 && (
          <select
            aria-label={tr("net.lobby.deck")}
            value={deckOf[code] ?? decks[0].id}
            onChange={(e) => setDeckOf({ ...deckOf, [code]: e.target.value })}
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        {!full && (
          <button
            aria-label={tr("net.lobby.takeNamed", { name: info.name })}
            onClick={() => {
              take(code);
              setPickOpen(false);
            }}
          >
            {tr("net.lobby.take")}
          </button>
        )}
      </li>
    );
  };

  const copy = () => void copyLink().then((ok) => setCopied(ok ? "ok" : "failed"));
  const shown = (id: string, value: string) => (
    <span className={styles.value} data-testid={id}>
      {value || tr("net.lobby.notChosen")}
    </span>
  );

  return (
    <div className={cx("screen", styles.lobbyScreen)} data-testid="lobby">
      <h1>{tr("net.lobby.title")}</h1>
      <section className={styles.note}>
        {!roster && <p role="status">{tr(slow ? "net.lobby.slow" : "net.lobby.connecting")}</p>}
        {roster && !net.online && <p className={styles.warn}>{tr("net.lobby.offline")}</p>}
        {net.notice && (
          <p className={styles.warn} role="alert" key={net.notice.n}>
            {netText(locale, net.notice.key, net.notice.detail)}
          </p>
        )}
        <div className={styles.field}>
          <label htmlFor={linkId}>{tr("net.lobby.link")}</label>
          <input id={linkId} readOnly value={location.href} onFocus={(e) => e.target.select()} />
          <button onClick={copy} aria-live="polite">
            {copied === "ok" ? tr("net.lobby.copied") : tr("net.lobby.copy")}
          </button>
        </div>
        {copied === "failed" && (
          <p className={styles.hint} role="status">
            {tr("net.lobby.copyFailed")}
          </p>
        )}
        <div className={styles.field}>
          <label htmlFor={nameId}>{tr("net.lobby.name")}</label>
          <input
            id={nameId}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              // an emptied name goes back to the one kept, in sight, rather than a silent "Player"
              const typed = name.trim();
              if (typed) setPlayerName(typed);
              else setName(playerName());
            }}
          />
        </div>
        <details className={styles.about}>
          <summary>{tr("net.lobby.about")}</summary>
          <p>{tr("net.lobby.explain")}</p>
          <p>{tr("net.lobby.notice")}</p>
        </details>
        {hadSave && roster?.mode === "game" && (
          <p className={styles.hint}>{tr("net.lobby.backup")}</p>
        )}
      </section>

      {roster?.mode === "lobby" && (
        <>
          <section className={styles.note}>
            <div className={styles.field}>
              <label htmlFor={`${nameId}c`}>{tr("net.lobby.campaign")}</label>
              {host ? (
                <select
                  id={`${nameId}c`}
                  value={campaignId}
                  data-testid="lobby-campaign"
                  onChange={(e) => session.setLobby({ campaignId: e.target.value })}
                >
                  <option value="" disabled>
                    —
                  </option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {campaignName(db, c.id, locale)}
                    </option>
                  ))}
                </select>
              ) : (
                shown("lobby-campaign", campaignId && campaignName(db, campaignId, locale))
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor={`${nameId}d`}>{tr("net.lobby.difficulty")}</label>
              {host ? (
                <select
                  id={`${nameId}d`}
                  value={lobby?.difficulty}
                  data-testid="lobby-difficulty"
                  onChange={(e) =>
                    session.setLobby({
                      difficulty: e.target.value as NonNullable<typeof lobby>["difficulty"],
                    })
                  }
                >
                  {difficulties.map((d) => (
                    <option key={d} value={d}>
                      {tr(`difficulty.${d}`)}
                    </option>
                  ))}
                </select>
              ) : (
                shown(
                  "lobby-difficulty",
                  lobby?.difficulty ? tr(`difficulty.${lobby.difficulty}`) : "",
                )
              )}
            </div>
            {!host && <p className={styles.hint}>{tr("net.lobby.hostChooses")}</p>}
          </section>
          <section className={styles.note}>
            <h2>{tr("net.lobby.seats")}</h2>
            <ul className={styles.strip} data-testid="seat-strip">
              {Object.keys(roster.seats).map(claimedRow)}
              {Array.from({ length: Math.max(0, MAX_INVESTIGATORS - seatCount) }, (_, i) => (
                <li key={`empty-${i}`} className={cx(styles.seat, styles.empty)}>
                  {tr("net.lobby.emptySeat")}
                </li>
              ))}
            </ul>
            {full ? (
              <p className={styles.hint}>
                {tr(seated ? "net.lobby.full" : "net.lobby.fullWatching")}
              </p>
            ) : (
              <details
                className={styles.choose}
                data-testid="choose-investigator"
                open={pickOpen}
                onToggle={(e) => setPickOpen(e.currentTarget.open)}
              >
                <summary>{tr("net.lobby.choose")}</summary>
                <input
                  type="search"
                  className={styles.search}
                  placeholder={tr("net.lobby.search")}
                  aria-label={tr("net.lobby.search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <ul className={styles.seats}>
                  {rows
                    .map((i) => i.code)
                    .filter((c) => !roster.seats[c])
                    .slice(0, 24)
                    .map(freeRow)}
                </ul>
              </details>
            )}
          </section>
        </>
      )}

      {roster?.mode === "game" && (
        <section className={styles.note}>
          <p>{net.busy ? tr("net.lobby.catching") : tr("net.lobby.inProgress")}</p>
          <ul className={styles.seats}>{freeSeats(roster).map(freeRow)}</ul>
          {!freeSeats(roster).length && <p className={styles.hint}>{tr("net.lobby.noFree")}</p>}
        </section>
      )}

      <div className={styles.foot}>
        {here.length > 0 && (
          <p className={styles.here} data-testid="lobby-here">
            <span>{tr("net.lobby.here")}</span>{" "}
            {here.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ", "}
                <b>{p.name}</b>
                {tagsOf(p.id) && ` (${tagsOf(p.id)})`}
              </span>
            ))}
          </p>
        )}
        <div className={styles.row}>
          {roster?.mode === "lobby" &&
            (host ? (
              <>
                <button
                  className="primary big"
                  data-testid="lobby-start"
                  disabled={!seatCount || !campaignId}
                  onClick={() => session.startGame()}
                >
                  {tr("net.lobby.start")}
                </button>
                {!campaignId ? (
                  <span className={styles.hint}>{tr("net.lobby.needCampaign")}</span>
                ) : (
                  !seatCount && <span className={styles.hint}>{tr("net.lobby.needSeat")}</span>
                )}
              </>
            ) : (
              <span className={styles.hint}>{tr("net.lobby.waitHost")}</span>
            ))}
          <button className={styles.leave} onClick={leave}>
            {tr("net.lobby.leave")}
          </button>
        </div>
      </div>
    </div>
  );
}
