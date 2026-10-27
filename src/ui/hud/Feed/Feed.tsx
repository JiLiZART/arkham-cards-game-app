import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import { cardText, encounterSetName, t } from "../../../content/i18n";
import type { GameState } from "../../../engine/types";
import { CardFace } from "../../components/CardFace";
import { ChaosToken } from "../../components/ChaosToken";
import { db, gameStore, useGame } from "../../state/context";
import { feedEntry, mergeLive, shownCount, STEP, type FeedEntry, type Part } from "../../game/feed";
import { Glyph, Icon } from "../../components/Icon";
import { CLASS_COLORS, hasSymbol } from "../../assets/icons";
import { Portrait } from "../../components/Portrait";
import { useView } from "../../state/view";
import { cx } from "../../components/cx";
import styles from "./Feed.module.css";

const LIVE_MAX = 4;
const LIVE_MS = 12000;
const LEAVE_MS = 400;

const classColor = (code: string) =>
  (CLASS_COLORS as Record<string, string>)[db.cards[code]?.faction] ?? "var(--accent)";

/** one styled part: portrait + class-coloured name, card thumbnail (click: modal, hover: enlarge), icons, tokens, outcome */
function PartView({ p, size }: { p: Part; size: number }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  switch (p.t) {
    case "text":
      return <span>{p.s}</span>;
    case "strong":
      return <b>{p.s}</b>;
    case "num":
      return <b className={styles.feNum}>{p.n}</b>;
    case "inv":
      return (
        <span className={styles.feInv}>
          <Portrait code={p.id} size={size} />
          <b style={{ color: classColor(p.id) }}>{cardText(db, p.id, locale).name}</b>
        </span>
      );
    case "card": {
      const inst = game.cards[p.id];
      if (!inst) return null;
      const d = db.cards[inst.code];
      const name =
        d.type === "location" && !inst.revealed
          ? (cardText(db, inst.code, locale).backName ?? cardText(db, inst.code, locale).name)
          : cardText(db, inst.code, locale).name;
      return (
        <span className={styles.feCard}>
          <button
            className={styles.feThumb}
            style={{ width: size * 0.72, height: size }}
            onClick={() => useView.getState().setModal({ card: p.id })}
            onMouseEnter={(e) =>
              useView.getState().setHover(p.id, e.currentTarget.getBoundingClientRect())
            }
            onMouseLeave={() => useView.getState().setHover(null)}
            title={name}
          >
            <CardFace
              code={inst.code}
              locale={locale}
              side={d.type === "location" && !inst.revealed ? "back" : "front"}
            />
          </button>
          <b className="card-name">{name}</b>
        </span>
      );
    }
    case "amount":
      return (
        <span className={styles.feAmount}>
          <b className={styles.feNum}>{p.n}</b>
          <Icon name={p.icon} size={size * 0.8} />
        </span>
      );
    case "icon":
      return <Icon name={p.name} size={size * 0.85} />;
    case "token":
      return <ChaosToken token={p.token} size={size * 0.85} />;
    case "glyphs":
      return (
        <span className={styles.feGlyphs}>
          {Array.from({ length: p.n }, (_, k) => (
            <Glyph key={k} name={p.name} size={size * 0.8} />
          ))}
          <b className={styles.feNum}>{p.n}</b>
        </span>
      );
    case "set":
      return hasSymbol(p.code) ? (
        <Glyph
          name={p.code}
          size={size * 0.8}
          title={encounterSetName(db, p.code, locale) ?? p.code.replace(/_/g, " ")}
        />
      ) : null;
    case "outcome":
      return (
        <b className={p.ok ? styles.feOk : styles.feFail}>
          {t(db, gameStore.getState().locale, p.ok ? "feed.outcome.ok" : "feed.outcome.fail")}
        </b>
      );
  }
}

/** a styled sentence (feed line, action float, prompt banner) */
export function Sentence({ parts, size = 22 }: { parts: Part[]; size?: number }) {
  return (
    <span className="sentence">
      {parts.map((p, k) => (
        <PartView key={k} p={p} size={size} />
      ))}
    </span>
  );
}

/** log index → feed entry, built once per entry (log entries never change) */
export function useFeedEntries(): {
  shown: number;
  entries: Map<number, FeedEntry | null>;
  game: GameState;
} {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const current = useGame((s) => s.current);
  const queue = useGame((s) => s.queue);
  // a new game (new or resumed scenario) has a new setup object: start a fresh cache
  const setup = useGame((s) => s.setup);
  const cache = useRef<{ locale: string; setup: unknown; map: Map<number, FeedEntry | null> }>({
    locale,
    setup: null,
    map: new Map(),
  });
  if (cache.current.locale !== locale || cache.current.setup !== setup)
    cache.current = { locale, setup, map: new Map() };
  // an undo shortens the log: entries past its end are gone (their indexes will be reused)
  for (const i of cache.current.map.keys()) if (i >= game.log.length) cache.current.map.delete(i);
  const shown = shownCount(game.log.length, current, queue);
  for (let i = 0; i < shown; i++)
    if (!cache.current.map.has(i))
      cache.current.map.set(i, feedEntry(game.log[i], game, db, locale));
  return { shown, entries: cache.current.map, game };
}

function toneColor(e: FeedEntry): string {
  if (e.tone === "enemy") return "var(--bad)";
  if (e.tone === "game") return "var(--accent)";
  const inv = e.actor?.inv;
  return inv ? classColor(inv) : "var(--muted)";
}

/** the live kill feed (newest at the top, fading toward the bottom) or the full Journal */
export function Feed() {
  const game = useGame((s) => s.game) as GameState;
  const mode = useView((s) => s.feedMode);
  const locale = useGame((s) => s.locale);
  const marks = useGame((s) => s.logMarks);
  const tops = useRef(new Map<number, number>());
  const { shown, entries } = useFeedEntries();
  const arrived = useRef(new Map<number, number>());
  const forGame = useRef(entries);
  if (forGame.current !== entries) {
    // a new game: forget arrival times and positions
    forGame.current = entries;
    arrived.current = new Map();
    tops.current = new Map();
  }
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const listRef = useRef<HTMLDivElement>(null);

  // the Journal: every visible log index, newest first; live: the newest lines, a choice's routine entries merged
  const visible = useMemo(() => {
    const out: number[] = [];
    for (let i = shown - 1; i >= 0; i--) if (entries.get(i)) out.push(i);
    return out;
  }, [shown, entries]);
  const lines = useMemo(
    () => new Map(mergeLive(game, entries, shown, marks, db, locale).map((l) => [l.key, l.entry])),
    [game, entries, shown, marks, locale],
  );
  const newest = useMemo(() => [...lines.keys()].reverse(), [lines]);

  const now = performance.now();
  for (const i of newest.slice(0, LIVE_MAX + 1))
    if (!arrived.current.has(i)) arrived.current.set(i, now);
  // live: the newest few, plus the ones still fading out
  const live = newest
    .slice(0, LIVE_MAX + 1)
    .filter((i) => now - (arrived.current.get(i) ?? now) < LIVE_MS + LEAVE_MS);
  const items = mode === "journal" ? visible : live;

  // age the live feed out
  useEffect(() => {
    if (mode !== "live" || !live.length) return;
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [mode, live.length]);

  // FLIP: entries already on screen glide to their new place when a new one drops in at the top
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const els = [...list.querySelectorAll<HTMLElement>("[data-log]")];
    for (const el of els) {
      const key = Number(el.dataset.log);
      const top = el.offsetTop;
      const prev = tops.current.get(key);
      if (prev !== undefined && prev !== top && mode === "live") {
        el.style.transition = "none";
        el.style.transform = `translateY(${prev - top}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "";
          el.style.transform = "";
        });
      }
      tops.current.set(key, top);
    }
  });

  // Escape closes the Journal
  useEffect(() => {
    if (mode !== "journal") return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && useView.getState().setFeedMode("live");
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [mode]);

  return (
    <div className={`feed ${mode}`} ref={listRef} aria-live="polite">
      {mode === "journal" && (
        <div className={cx(styles.feedTitle, "card-name")}>
          {t(db, gameStore.getState().locale, "hud.journal")}
        </div>
      )}
      {items.map((i, k) => {
        const e = (mode === "live" ? lines.get(i) : entries.get(i))!;
        // the Journal: a phase's step is a section line between the entries it introduces
        if (e.kind === STEP)
          return (
            <div key={i} data-log={i} className={styles.feedStep}>
              <Sentence parts={e.parts} size={20} />
            </div>
          );
        const age = now - (arrived.current.get(i) ?? now);
        const leaving = mode === "live" && (age > LIVE_MS || k >= LIVE_MAX);
        // the entry's frame takes the colour of whoever acted (--tone in the stylesheet)
        const tone = { "--tone": toneColor(e) } as CSSProperties;
        const style =
          mode === "live" ? { ...tone, opacity: leaving ? 0 : Math.max(0.25, 1 - 0.11 * k) } : tone;
        return (
          <div
            key={i}
            data-log={i}
            className={cx(styles.feedItem, leaving ? styles.leaving : "")}
            style={style}
          >
            <Sentence parts={e.parts} size={24} />
          </div>
        );
      })}
    </div>
  );
}
