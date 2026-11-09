import { useEffect, type CSSProperties } from "react";
import { stepText, t } from "../../../content/i18n";
import { openChoices } from "../../../engine/campaign/flow";
import { db, gameStore, useGame } from "../../state/context";
import { useLayoutMode } from "../../state/layoutMode";
import { useView } from "../../state/view";
import { guideHtml } from "../../game/guideText";
import { scenarioAhead, type ReaderPage } from "../../game/readerPages";
import {
  answerOf,
  isOpen,
  revealAll,
  skipTo,
  turnPage,
  type ReaderState,
} from "../../game/readerState";
import { storyArt } from "../../assets/images";
import { cx } from "../../components/cx";
import { FlowPrompt } from "../FlowPrompt";
import { moment, playMenuMusic, playMusic } from "../../hud/SoundLayer";
import styles from "./StoryReader.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

/** the page's painting: the guide edition's full-bleed, or the painting strip of an agenda's scan with a blurred wash beside it */
function Painting({ page, scenario }: { page: ReaderPage; scenario: string | undefined }) {
  const locale = useGame((s) => s.locale);
  const campaign = useGame((s) => s.campaign);
  const art = campaign && scenario ? storyArt(db, campaign.campaignId, scenario, locale) : null;
  if (!art) return <div className={styles.art} data-testid="reader-art" data-from="none" />;
  return (
    <div className={styles.art} data-testid="reader-art" data-from={art.from} key={page.id}>
      {art.from === "agenda" && (
        <div className={styles.wash} style={{ backgroundImage: `url(${art.url})` }} />
      )}
      <div className={cx(styles.painting, art.from === "agenda" ? styles.strip : styles.guide)}>
        <img src={art.url} alt="" draggable={false} />
      </div>
    </div>
  );
}

/** a choice as dialog lines, numbered: the keys 1 to 9 answer too */
function DialogChoices({ page }: { page: ReaderPage }) {
  const campaign = useGame((s) => s.campaign)!;
  const locale = useGame((s) => s.locale);
  const w = campaign.flow.waiting;
  if (!w || w.step.kind !== "chooseOne") return null;
  const words = stepText(db, campaign.campaignId, w.id, locale);
  const choices = openChoices(db, campaign, w.step.choices);
  return (
    <ol className={styles.lines} data-testid="reader-choices" data-page={page.id}>
      {choices.map((c, k) => (
        <li key={c.id}>
          <button
            className={styles.line}
            onClick={() => gameStore.getState().answerFlow(c.id)}
            data-testid="reader-choice"
          >
            <b>{k + 1}</b>
            <span
              dangerouslySetInnerHTML={{ __html: guideHtml(words.choices?.[c.id] ?? c.text) }}
            />
          </button>
        </li>
      ))}
    </ol>
  );
}

/**
 * The guide's text before a scenario, fullscreen (ADR-0084): the painting on the left, the title and text on the right,
 * a paragraph at a time. A tap, a click, Space or Enter shows the next; a choice is answered as numbered dialog lines, any
 * other prompt with the campaign screen's own controls; Begin on the scenario's page sets the scenario up.
 */
export function StoryReader() {
  const reader = useView((s) => s.reader);
  return reader ? <ReaderBody reader={reader} /> : null;
}

/** the tension music under the reader, in as it opens and out as it closes (the table's own music takes over on Begin) */
function useReaderMusic() {
  useEffect(() => {
    playMusic("tension");
    return () => {
      if (gameStore.getState().screen !== "game") playMenuMusic();
    };
  }, []);
}

/** the reader with its state given (the screen itself; `StoryReader` hands it the state in `useView`) */
export function ReaderBody({ reader }: { reader: ReaderState }) {
  const campaign = useGame((s) => s.campaign);
  const locale = useGame((s) => s.locale);
  const phone = useLayoutMode() === "phone";
  useReaderMusic();
  const page = reader.pages[reader.at];
  // a page opening is the sound of a book
  const pageId = page?.id;
  useEffect(() => {
    if (pageId) moment("readerPage");
  }, [pageId]);
  const open = !!campaign && !!page && isOpen(campaign, page);
  const done = !!page && reader.revealed >= page.paragraphs.length;

  const turn = () => {
    const r = useView.getState().reader;
    const c = gameStore.getState().campaign;
    if (!r || !c) return;
    const t = turnPage(r, c);
    if (!t) return;
    if (!t.flow) return void useView.setState({ reader: t.reader });
    // the flow's Continue: answer it, and read on from the first page it brings (online, when the move comes back)
    const had = r.pages.length;
    gameStore.getState().answerFlow(t.flow);
    const now = useView.getState().reader;
    if (now && now.pages.length > had)
      useView.setState({
        reader: { ...now, at: had, revealed: Math.min(1, now.pages[had].paragraphs.length) },
      });
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("button, input, textarea, select, a"))
        return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        turn();
        return;
      }
      const n = Number(e.key);
      const c = gameStore.getState().campaign;
      const r = useView.getState().reader;
      const w = c?.flow.waiting;
      if (n >= 1 && n <= 9 && c && r && w?.step.kind === "chooseOne") {
        const p = r.pages[r.at];
        if (p && isOpen(c, p) && r.revealed >= p.paragraphs.length) {
          const choice = openChoices(db, c, w.step.choices)[n - 1];
          if (choice) gameStore.getState().answerFlow(choice.id);
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  if (!campaign || !page) return null;
  const scenario = page.scenario ?? scenarioAhead(db, campaign);
  const answer = answerOf(db, campaign, locale, page);
  const last = reader.at === reader.pages.length - 1;
  // another player has begun: the game exists, this reader is for finishing the page
  const began = !!reader.movers.start;
  return (
    <div
      className={cx(styles.reader, phone && styles.phone)}
      data-testid="story-reader"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, a, input, textarea, select, label")) turn();
      }}
      style={{ "--paras": page.paragraphs.length } as CSSProperties}
    >
      <Painting page={page} scenario={scenario} />
      <article
        className={styles.page}
        key={page.id}
        data-testid="reader-page"
        data-kind={page.kind}
      >
        <div className={styles.head}>
          {page.label && <p className={styles.label}>{page.label}</p>}
          {page.title && <h1 className={styles.title}>{page.title}</h1>}
          <div className={styles.rule} />
        </div>
        <div className={styles.text}>
          {page.paragraphs.slice(0, reader.revealed).map((p, k) => (
            <div
              key={k}
              className={styles.para}
              data-testid="reader-paragraph"
              dangerouslySetInnerHTML={{ __html: guideHtml(p) }}
            />
          ))}
          {done &&
            page.notes.map((n, k) => (
              <p key={k} className={styles.note}>
                {n}
              </p>
            ))}
        </div>
        <div className={styles.ask}>
          {done && page.kind === "prompt" && answer !== null && (
            <p className={styles.answered} data-testid="reader-answered">
              <small>
                {page.step && reader.movers[page.step]
                  ? tr("reader.chose", { name: reader.movers[page.step] })
                  : tr("reader.youChose")}
              </small>{" "}
              {answer}
            </p>
          )}
          {done && open && page.prompt === "chooseOne" && <DialogChoices page={page} />}
          {done && open && page.prompt !== "chooseOne" && (
            <div className={styles.prompt}>
              <FlowPrompt campaign={campaign} bare />
            </div>
          )}
          {reader.movers.start && (
            <p className={styles.note} data-testid="reader-began">
              {tr("reader.began", { name: reader.movers.start })}
            </p>
          )}
          {done && page.kind === "scenario" && last && (
            <button
              className={cx("primary", "big", styles.begin)}
              data-testid="reader-begin"
              // began elsewhere: the game is already set up, Begin only goes to it
              onClick={() =>
                began
                  ? gameStore.setState({ screen: "game" })
                  : gameStore.getState().startScenario()
              }
            >
              {tr("reader.begin")}
            </button>
          )}
          {!done && <p className={styles.tap}>{tr("reader.tap")}</p>}
        </div>
      </article>
      <div className={styles.bar}>
        {!done && (
          <button
            className="link-btn"
            data-testid="reader-show"
            onClick={() => useView.setState({ reader: revealAll(reader) })}
          >
            {tr("reader.showPage")}
          </button>
        )}
        <button
          className="link-btn"
          data-testid="reader-skip"
          onClick={() =>
            began
              ? gameStore.setState({ screen: "game" })
              : useView.setState({ reader: skipTo(reader, campaign) })
          }
        >
          {tr("reader.skip")}
        </button>
      </div>
    </div>
  );
}
