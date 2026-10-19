import { useState } from "react";
import { campaignBlurb, cardText, interludeName, t } from "../../content/i18n";
import type { CampaignDef } from "../../content/schema";
import { db, gameStore, useGame } from "../context";
import { formatText } from "../hud/Hud";
import { Modal } from "../hud/Modals";
import { cardImage } from "../images";
import { blurb } from "./blurb";
import { tileName } from "./wizard";

const tr = (key: string, vars?: Record<string, string | number>) => t(db, gameStore.getState().locale, key, vars);

/** "1 scenario", "8 scenarios" */
export const scenarioCount = (n: number) => (n === 1 ? tr("wizard.length.one") : tr("wizard.scenarios", { n }));

/** one side of a chapter's card, found by its code (its pack need not be loaded; an act or agenda is printed on both sides) */
function Face({ code, side, alt, lazy }: { code: string; side: "front" | "back"; alt: string; lazy?: boolean }) {
  const locale = useGame((s) => s.locale);
  const [broken, setBroken] = useState(false);
  const url = cardImage(db.cards[code] ?? { code, doubleSided: true }, side, locale);
  if (!url || broken) return null;
  return <img src={url} alt={alt} loading={lazy ? "lazy" : undefined} draggable={false} onError={() => setBroken(true)} />;
}

/** a chapter's card at full size, both sides (the back of an act or agenda is what happens when it advances), to read */
function ChapterCard({ code, title, onClose }: { code: string; title: string; onClose: () => void }) {
  const locale = useGame((s) => s.locale);
  // the text only once its pack is in (the scans carry it either way)
  const tx = db.cards[code] ? cardText(db, code, locale) : null;
  return (
    <Modal onClose={onClose} className="card-modal both chapter-modal">
      <div className="modal-sides">
        <div className="modal-card landscape">
          <Face code={code} side="front" alt={`${title} (1)`} />
        </div>
        <div className="modal-card landscape">
          <Face code={code} side="back" alt={`${title} (2)`} />
        </div>
      </div>
      <div className="modal-side">
        <h2 className="card-name">{tx?.name ?? title}</h2>
        {tx?.text && <p className="card-text" dangerouslySetInnerHTML={{ __html: formatText(tx.text) }} />}
        {tx?.backText && <p className="card-text" dangerouslySetInnerHTML={{ __html: formatText(tx.backText) }} />}
        <button className="modal-close" onClick={onClose}>
          {tr("modal.close")}
        </button>
      </div>
    </Modal>
  );
}

/**
 * The campaign in the sidebar of the picker: its name and number of scenarios, whether its rules are complete, the
 * guide's opening text, then the chapters in order, each scenario's first agenda and first act (their art, as the act
 * and agenda viewer shows a scenario in play) and the interludes
 * between them (the way the act and agenda viewer lays out a scenario's chapters in play). Everything comes from the
 * campaign's own file, so it is all here before the scenarios are loaded.
 */
export function CampaignSheet({ campaign, onClose }: { campaign: CampaignDef; onClose: () => void }) {
  const locale = useGame((s) => s.locale);
  const [more, setMore] = useState(false);
  const [reading, setReading] = useState<{ code: string; title: string } | null>(null);
  const { prologue, scenarios } = campaignBlurb(db, campaign.id, locale);
  const { lead, more: rest } = blurb(prologue);
  // an epigraph is set in italics: it opens with a quotation mark
  const quote = /^[“"«„]/.test(lead);
  // the chapters: the guide's order with the interludes in it, from the campaign's file
  const chapters = campaign.cards;
  let n = 0;
  return (
    <aside className="wz-camp-sheet" aria-label={tileName(db, campaign, locale)}>
      <div className="wz-sheet-head">
        <div>
          <b>{tileName(db, campaign, locale)}</b>
          <i>{scenarioCount(campaign.scenarios.length)}</i>
        </div>
        <button className="wz-camp-close" onClick={onClose} aria-label={tr("wizard.close")}>
          ×
        </button>
      </div>
      {campaign.generated && <small className="wz-generated">{tr("wizard.generated")}</small>}
      {lead && <p className={`wz-sheet-text ${quote ? "wz-quote" : ""}`}>{lead}</p>}
      {rest && (
        <>
          {more && <p className="wz-sheet-text wz-quote-more">{rest}</p>}
          <button className="link-btn wz-more" aria-expanded={more} onClick={() => setMore(!more)}>
            {tr(more ? "wizard.less" : "wizard.more")}
          </button>
        </>
      )}
      <h4 className="wz-chapters">{tr("wizard.chapters")}</h4>
      <ol className="wz-chapter-list">
        {chapters.map((ch) => {
          const playable = !("interlude" in ch && ch.interlude);
          const k = campaign.scenarios.indexOf(ch.scenario);
          const name = (playable ? (scenarios[k] ?? ch.name) : (interludeName(db, campaign.id, ch.scenario, locale) ?? ch.name)) ?? ch.scenario;
          if (playable) n++;
          return (
            <li key={ch.scenario} className={playable ? "wz-chapter" : "wz-chapter wz-interlude"}>
              <div className="wz-chapter-name">
                {playable ? <span className="wz-chapter-n">{n}</span> : <span className="wz-chapter-n">·</span>}
                <b>{name}</b>
                {!playable && <small>{tr("wizard.interlude")}</small>}
              </div>
              {playable && (ch.agenda || ch.act) && (
                <div className="wz-chapter-cards">
                  {(
                    [
                      [ch.agenda, "agenda"],
                      [ch.act, "act"],
                    ] as const
                  ).map(([code, type]) =>
                    code ? (
                      <button key={type} className="wz-chapter-card" title={tr("wizard.readCard")} onClick={() => setReading({ code, title: `${name}: ${tr(`card.type.${type}`)}` })}>
                        <Face code={code} side="front" alt={`${name}: ${tr(`card.type.${type}`)}`} lazy />
                      </button>
                    ) : null,
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {reading && <ChapterCard code={reading.code} title={reading.title} onClose={() => setReading(null)} />}
    </aside>
  );
}
