import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cardText, t } from "../../content/i18n";
import type { ChoiceOption, GameEvent, GameState, InvId, SkillTestState } from "../../engine/types";
import { rememberRect } from "../arrivals";
import { useOptionsByCard } from "../cardClick";
import { CardFace } from "../CardFace";
import { db, gameStore, useGame } from "../context";
import { Icon } from "../Icon";
import { isIcon } from "../icons";
import { Portrait } from "../Portrait";
import { viewerOf } from "../store";
import { cardDetails } from "../details";
import { addTokens, calcParts, finishOption, isTestEvent, placedCards, sessionId, subjectOf, type CalcParts, type PlacedCard, type Subject } from "../testScreen";
import { useStage, useView } from "../view";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { useFlyIn } from "./flights";
import { RESOLVE_BOX } from "./Reveal";
import { DetailsColumn } from "./HandDetails";
import { MiniCard } from "./Panels";
import { DrawStage } from "./TokenDraw";
import { moment } from "./SoundLayer";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

/** what the screen knows of a test: its static facts and the strip and placed cards as they stood when it last was live */
interface Snap {
  id: number;
  inv: InvId;
  skill: string;
  kind: string;
  subject: Subject;
  placed: PlacedCard[];
  /** the strip without tokens */
  calc: CalcParts;
}

const snapOf = (test: SkillTestState, game: GameState): Snap => ({
  id: test.id,
  inv: test.inv,
  skill: test.skill,
  kind: test.kind,
  subject: subjectOf(test, game),
  placed: placedCards(test, game, db, game.pending),
  calc: calcParts(test, game, db, 0),
});

/** a test the screen never saw live (nothing could be committed): rebuilt from its first event */
function snapFromEvent(e: GameEvent, game: GameState): Snap {
  const d = (e.data ?? {}) as { testId: number; skill?: string; kind?: string; value?: number; difficulty?: number; base?: number; icons?: number; total?: number };
  const isResult = e.type === "testResult";
  const base = isResult ? (d.base ?? 0) : (d.value ?? 0);
  const icons = isResult && d.icons ? [d.icons] : [];
  const value = isResult ? (d.value ?? base) : base;
  const card = e.card && game.cards[e.card] ? e.card : null;
  return {
    id: d.testId,
    inv: e.inv ?? game.order[0],
    skill: d.skill ?? "willpower",
    kind: d.kind ?? "plain",
    subject: card ? { kind: "card", id: card } : { kind: "portrait", inv: e.inv ?? game.order[0] },
    placed: [],
    calc: { skill: d.skill ?? "willpower", base, icons, mods: value - base - icons.reduce((n, i) => n + i, 0), tokens: [], autoFail: false, total: value, difficulty: d.difficulty ?? 0 },
  };
}

/** the test whose screen is up (or about to be), with the tokens revealed so far; null when none */
export interface TestView {
  snap: Snap;
  /** the strip: placed icons, and every token that has been drawn on screen */
  calc: CalcParts;
  /** the result, once its event is the one playing */
  result: GameEvent | null;
  /** the committing player's live test, when the commit prompt is up */
  live: SkillTestState | null;
}

/** tokens of one test: their strings and resolved modifiers, from the log (the state is ahead of the animations) */
function tokensOf(game: GameState, id: number): { token: string; mod: number }[] {
  const res = game.log.find((e) => e.type === "testResult" && e.data?.testId === id);
  const names = (res?.data?.tokens as string[] | undefined) ?? game.log.filter((e) => e.type === "token" && e.data?.testId === id).map((e) => String(e.data?.token));
  const mods = (res?.data?.tokenMods as number[] | undefined) ?? [];
  return names.map((token, k) => ({ token, mod: mods[k] ?? (/^[+-]?\d+$/.test(token) ? Number(token) : 0) }));
}

/** is the screen showing a test now: from its commit prompt through the draw and the result */
export function useTestView(): TestView | null {
  const game = useGame((s) => s.game) as GameState;
  const current = useGame((s) => s.current);
  const queue = useGame((s) => s.queue);
  const snaps = useRef(new Map<number, Snap>());
  const started = useRef<number | null>(null);
  const live = game.skillTest;
  const mine = useMemo(() => (live ? snapOf(live, game) : null), [live, game]);
  if (live && mine) snaps.current.set(live.id, mine);
  const events: GameEvent[] = [current, ...queue].flatMap((e) => (isTestEvent(e) ? [e!] : []));
  // the screen ends with the result: reactions and effects after it (the test is still live in the state) play on the table
  const resolved = !!live && game.log.some((e) => e.type === "testResult" && e.data?.testId === live.id);
  const id = sessionId({ events, lead: current ?? queue[0] ?? null, live: live?.id ?? null, resolved, commitPending: game.pending?.kind === "commit", started: started.current });
  started.current = id;
  if (id === null) return null;
  const snap = snaps.current.get(id) ?? (events[0] ? snapFromEvent(events[0], game) : null);
  if (!snap) return null;
  const mineEvents = events.filter((e) => e.data!.testId === id);
  const result = game.log.find((e) => e.type === "testResult" && e.data?.testId === id) ?? null;
  // tokens still to be drawn on screen aren't in the strip yet; the result's own total counts once every token is
  const all = tokensOf(game, id);
  const pending = mineEvents.filter((e) => e.type === "token").length;
  const drawn = all.slice(0, Math.max(0, all.length - pending));
  const done = result && pending === 0 ? (result.data?.total as number) : undefined;
  return { snap, calc: addTokens(snap.calc, drawn, done), result: result && pending === 0 ? result : null, live: live && live.id === id ? live : null };
}

/**
 * The card (or investigator) the test is about, large, in the centre; hovering shows its details column (no enlarged copy,
 * it is large already). While the viewer's commit window is open it is lit like any card with an option, and tapping it
 * finishes committing, as the bar's Done does.
 */
function SubjectView({ subject, finish }: { subject: Subject; finish: ChoiceOption | null }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const choose = useGame((s) => s.choose);
  const [hover, setHover] = useState<DOMRect | null>(null);
  const tap = finish ? () => choose(finish.id) : undefined;
  const lit = finish ? "legal" : "";
  if (subject.kind === "portrait") {
    return (
      <div className="st-subject">
        <div className={`st-subject-portrait ${lit}`} onClick={tap} role={tap ? "button" : undefined}>
          <Portrait code={subject.inv} size={150} />
        </div>
      </div>
    );
  }
  const inst = game.cards[subject.id];
  if (!inst) return null;
  const back = db.cards[inst.code].type === "location" && !inst.revealed;
  return (
    <div className="st-subject">
      <div
        className={`st-subject-card ${lit}`}
        data-card={inst.id}
        onClick={tap}
        role={tap ? "button" : undefined}
        onMouseEnter={(ev) => setHover(ev.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHover(null)}
      >
        <CardFace code={inst.code} locale={locale} side={back ? "back" : "front"} />
      </div>
      {hover && <DetailsColumn rows={cardDetails(db, inst.code, locale, { inst, game })} rect={{ x0: hover.left, y0: hover.top, x1: hover.right, y1: hover.bottom }} />}
    </div>
  );
}

/** "Investigate: Study · shroud 2", "Willpower test · 3 vs 3" */
function lineOf(snap: Snap, calc: CalcParts, game: GameState, locale: string): string {
  const name = snap.subject.kind === "card" && game.cards[snap.subject.id] ? cardText(db, game.cards[snap.subject.id].code, locale).name : "";
  const skill = t(db, locale, `stat.${snap.skill}`);
  const key = ["investigate", "fight", "evade"].includes(snap.kind) && name ? `test.${snap.kind}` : "test.plain";
  return t(db, locale, key, { name, skill, n: calc.difficulty, value: calc.base + calc.icons.reduce((n, i) => n + i, 0) + calc.mods });
}

const sign = (n: number) => (n >= 0 ? `+ ${n}` : `− ${-n}`);

/** the calculation as icons: skill and base, each placed card, other modifiers, each token, "= total vs difficulty" */
function CalcStrip({ calc }: { calc: CalcParts }) {
  return (
    <div className="st-strip" data-tip="skilltest">
      {isIcon(calc.skill) && <Icon name={calc.skill} size={34} />}
      <b className="st-num">{calc.base}</b>
      {calc.icons.map((n, k) => (
        <span key={`i${k}`} className="st-term">
          {sign(n)}
        </span>
      ))}
      {calc.mods !== 0 && <span className="st-term">{sign(calc.mods)}</span>}
      {calc.tokens.map((tk, k) => (
        <span key={`t${k}`} className="st-term st-token">
          {tk.mod === 0 && tk.token !== "0" ? "+" : sign(tk.mod)}
          <ChaosTokenIcon token={tk.token} size={34} />
        </span>
      ))}
      <span className="st-eq">=</span>
      <b className={`st-num st-total ${calc.autoFail || calc.total < calc.difficulty ? "low" : "ok"}`}>{calc.total}</b>
      <span className="st-vs">{tr("draw.vs")}</span>
      <b className="st-num st-diff">{calc.difficulty}</b>
    </div>
  );
}

/** the placed cards: owner's portrait when several investigators placed, the icons each adds, a tap takes one back */
function PlacedCards({ placed, skill, viewerCanAct }: { placed: PlacedCard[]; skill: string; viewerCanAct: boolean }) {
  const game = useGame((s) => s.game) as GameState;
  const choose = useGame((s) => s.choose);
  const byCard = useOptionsByCard();
  const ref = useRef<HTMLDivElement>(null);
  // remember where placed cards are, so one taken back flies from here into the fan
  useLayoutEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => rememberRect(el.dataset.card!, el));
  });
  const setup = useGame((s) => s.setup);
  const viewer = viewerOf(game);
  useFlyIn(ref, !!viewer, viewer, RESOLVE_BOX, setup);
  const owners = new Set(placed.map((p) => p.owner));
  return (
    <div className="st-placed" ref={ref}>
      {placed.map((p) => {
        const back = viewerCanAct && p.removable ? byCard.get(p.card)?.find((o) => o.id === `un:${p.card}`) : undefined;
        return (
          <div key={p.card} className={`st-placed-slot ${back ? "removable" : ""}`} title={back ? back.label : undefined}>
            <MiniCard id={p.card} w={86} h={120} legal={!!back} onClick={() => back && choose(back.id)} />
            {back && <span className="st-takeback">↶</span>}
            {owners.size > 1 && (
              <span className="st-owner">
                <Portrait code={p.owner} size={26} />
              </span>
            )}
            {p.icons > 0 && (
              <span className="st-icons">
                +{p.icons} {isIcon(skill) && <Icon name={skill} size={16} />}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** the result stage: the big total, Success or Fail, and Continue (by hand or at the Tap pace; otherwise it closes by itself) */
function ResultStage({ e, waits }: { e: GameEvent; waits: boolean }) {
  const next = useGame((s) => s.nextEvent);
  const ok = !!e.data?.success;
  return (
    <div className={`breakdown st-result ${ok ? "ok" : "bad"}`} onClick={(ev) => ev.stopPropagation()}>
      <div className="st-result-total">{String(e.data?.total ?? 0)}</div>
      <div className="bd-result">{tr(ok ? "draw.success" : "draw.fail")}</div>
      {waits && (
        <button className="primary big" onClick={next} autoFocus>
          {tr("draw.continue")}
        </button>
      )}
    </div>
  );
}

/**
 * The skill-test screen: one overlay from the commit prompt through the chaos draw to the result. It holds the stage
 * for the whole test, so the draw and the result (which play inside it) wait for it and nothing else takes the middle.
 */
export function SkillTestScreen() {
  const view = useTestView();
  const game = useGame((s) => s.game) as GameState;
  const playing = useView((s) => s.playing) as GameEvent | null;
  const byHand = useGame((s) => s.drawByHand);
  // drawing by hand, or at the Tap pace, the result waits for Continue
  const waits = useGame((s) => s.drawByHand || s.pace === "tap");
  const locale = useGame((s) => s.locale);
  const holds = useStage(view ? `test:${view.snap.id}` : null);
  const shown = holds && !!view;
  // the HUD raises the strip, the bar and the fan above the overlay while it is up
  useEffect(() => {
    useView.setState({ testing: shown });
    return () => useView.setState({ testing: false });
  }, [shown]);
  // a card committed: its sound (one taken back makes none)
  const committed = game.skillTest?.committed.length ?? 0;
  const lastCommitted = game.skillTest?.committed.at(-1) ?? null;
  const was = useRef(committed);
  useEffect(() => {
    if (committed > was.current) moment("commit", lastCommitted);
    was.current = committed;
  }, [committed, lastCommitted]);
  // the viewer's commit window: the subject finishes it (tap, Space or Enter). Not while the draw or the result holds the stage: they have their own keys
  const viewing = useView((s) => s.viewing);
  const stageBusy = playing?.type === "token" || playing?.type === "testResult";
  const finish = shown && !stageBusy ? finishOption(game, { viewing }) : null;
  // calling the test off (the action and the cards placed, all taken back) while nothing hidden has come out of it
  const actionsN = useGame((s) => s.actions.length);
  const seq = game.pending?.seq;
  const cancellable = useMemo(() => !!finish && gameStore.getState().testCancellable(), [finish, actionsN, seq]);
  useEffect(() => {
    if (!cancellable) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || useView.getState().modal) return;
      e.preventDefault();
      gameStore.getState().cancelTest();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [cancellable]);
  useEffect(() => {
    if (!finish) return;
    const key = (e: KeyboardEvent) => {
      if ((e.key !== " " && e.key !== "Enter") || e.repeat || e.defaultPrevented) return;
      // a focused button or field answers its own Enter and Space
      if ((e.target as Element | null)?.closest("button, a, input, select, textarea")) return;
      e.preventDefault();
      gameStore.getState().choose(finish.id);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [finish]);
  if (!shown || !view) return null;
  const { snap, calc } = view;
  return (
    <div className="skill-test-screen">
      <div className="st-middle">
        <div className="st-line">{lineOf(snap, view.calc, game, locale)}</div>
        {cancellable && (
          <button className="st-cancel" onClick={() => gameStore.getState().cancelTest()} title={tr("test.cancelHint")}>
            ↶ {tr("test.cancel")}
          </button>
        )}
        <div className="st-center">
          <SubjectView subject={snap.subject} finish={finish} />
          <div className="st-stage">
            {playing?.type === "testResult" && playing.data?.testId === snap.id && <ResultStage key={(playing as GameEvent & { logIndex?: number }).logIndex} e={playing} waits={waits} />}
            {playing?.type === "token" && playing.data?.testId === snap.id && <DrawStage key={(playing as GameEvent & { logIndex?: number }).logIndex} e={playing} byHand={byHand} />}
          </div>
        </div>
      </div>
      <PlacedCards skill={snap.skill} placed={view.live ? placedCards(view.live, game, db, game.pending) : snap.placed.map((p) => ({ ...p, removable: false }))} viewerCanAct={!!view.live} />
      <CalcStrip calc={calc} />
    </div>
  );
}
