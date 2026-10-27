import { cardText, encounterSetName, t } from "../../../content/i18n";
import { db, useGame } from "../../state/context";
import { CardFace } from "../../components/CardFace/index";
import { cardDetails } from "../../game/details";
import { Row } from "../../hud/HandDetails";
import { Icon } from "../../components/Icon/index";
import { cycleName } from "../../menu/wizard";
import { cycleOf } from "../filter";
import { implemented } from "../../../content/implemented";
import { useCatalog } from "../state";
import { formatText } from "../../hud/Hud";
import { cx } from "../../components/cx";
import styles from "./CardPage.module.css";

const SKILLS = ["willpower", "intellect", "combat", "agility"] as const;

/** a card's name as a link to its own page */
function CardLink({ code, n }: { code: string; n?: number }) {
  const locale = useGame((s) => s.locale);
  const open = useCatalog((s) => s.openCard);
  if (!db.cards[code]) return <span>{code}</span>;
  return (
    <button className={cx("link-btn", styles.catLink)} onClick={() => open(code)}>
      {n && n > 1 ? `${n}× ` : ""}
      {cardText(db, code, locale).name}
    </button>
  );
}

/** the badge: does the game act on this card */
export function WorksBadge({ code }: { code: string }) {
  const locale = useGame((s) => s.locale);
  const works = implemented(db, code);
  return (
    <span
      className={cx(styles.catBadge, works ? styles.works : styles.textOnly)}
      title={t(db, locale, works ? "catalog.worksHint" : "catalog.textOnlyHint")}
    >
      {t(db, locale, works ? "catalog.works" : "catalog.textOnly")}
    </span>
  );
}

/** the numbers cardDetails does not carry: investigator skills and health, location and act and agenda figures */
function Facts({ code, locale }: { code: string; locale: string }) {
  const d = db.cards[code];
  const label = (k: string) => <span className="hd-label">{t(db, locale, k)}</span>;
  return (
    <>
      {d.skills && (
        <div className="hd-icons">
          {label("catalog.skills")}
          {SKILLS.map((s) => (
            <span key={s} className="cat-skill">
              <Icon name={s} size={24} /> <b className="hd-num">{d.skills![s]}</b>
            </span>
          ))}
        </div>
      )}
      {d.type === "investigator" && (d.health !== undefined || d.sanity !== undefined) && (
        <div className="hd-icons">
          {d.health !== undefined && (
            <>
              <Icon name="health" size={26} /> <b className="hd-num">{d.health}</b>
            </>
          )}
          {d.sanity !== undefined && (
            <>
              <Icon name="sanity" size={26} /> <b className="hd-num">{d.sanity}</b>
            </>
          )}
        </div>
      )}
      {d.shroud !== undefined && (
        <div>
          {label("card.shroud")}
          <b className="hd-num">{d.shroud}</b> {label("card.clues")}
          <b className="hd-num">{d.clues ?? 0}</b>
          {d.cluesPerInvestigator ? ` ${t(db, locale, "card.perInvestigator")}` : ""}
        </div>
      )}
      {d.doom !== undefined && (
        <div>
          <Icon name="doom" size={24} /> <b className="hd-num">{d.doom}</b>
        </div>
      )}
      {d.actClues !== undefined && (
        <div>
          {label("card.clues")}
          <b className="hd-num">{d.actClues}</b>
          {d.actCluesPerInvestigator ? ` ${t(db, locale, "card.perInvestigator")}` : ""}
        </div>
      )}
      {d.victory ? (
        <div className="hd-strong">{t(db, locale, "card.victory", { n: d.victory })}.</div>
      ) : null}
    </>
  );
}

/** a card's page: its images, its details, where it comes from, and for an investigator the rules of their deck */
export function CardPage({ code }: { code: string }) {
  const locale = useGame((s) => s.locale);
  const back = useCatalog((s) => s.back);
  const d = db.cards[code];
  if (!d) return null;
  const tx = cardText(db, code, locale);
  const inv = db.investigators[code];
  const starters = Object.values(db.decks).filter((x) => x.investigator === code);
  const set = d.encounterSet
    ? (encounterSetName(db, d.encounterSet, locale) ?? d.encounterSet)
    : null;
  const cycle = cycleOf(db, code);
  const rows = cardDetails(db, code, locale);
  const twoSided = d.doubleSided || !!d.backImage;
  return (
    <article className={styles.catPage}>
      <button className="big" onClick={back}>
        {t(
          db,
          locale,
          useCatalog.getState().open.length > 1 ? "catalog.back" : "catalog.backToList",
        )}
      </button>
      <div className={styles.catPageBody}>
        <div className={styles.catImages}>
          <figure>
            <CardFace code={code} locale={locale} remote />
            <figcaption>{t(db, locale, "catalog.front")}</figcaption>
          </figure>
          {twoSided && (
            <figure>
              <CardFace code={code} locale={locale} side="back" remote />
              <figcaption>{t(db, locale, "catalog.backSide")}</figcaption>
            </figure>
          )}
        </div>
        <div className={cx("hand-details", styles.static, styles.catDetails)}>
          <WorksBadge code={code} />
          {rows.map((r) => (
            <Row key={r.k} r={r} locale={locale} />
          ))}
          <Facts code={code} locale={locale} />
          <div className="hd-traits">
            {t(db, locale, "catalog.packLine", {
              cycle: cycle ? cycleName(db, locale, cycle) : "",
              pack: d.pack.toUpperCase(),
            })}
          </div>
          {set && <div className="hd-traits">{set}</div>}
          {d.type === "investigator" && tx.backText && (
            <div className={cx(styles.catSec, "cat-back")}>
              <h3>{t(db, locale, "catalog.deckbuilding")}</h3>
              <p
                className="hd-text"
                dangerouslySetInnerHTML={{ __html: formatText(tx.backText) }}
              />
            </div>
          )}
          {inv && (
            <>
              {inv.signatures.length > 0 && (
                <div className={styles.catSec}>
                  <h3>{t(db, locale, "catalog.signatures")}</h3>
                  {inv.signatures.map((c) => (
                    <CardLink key={c} code={c} />
                  ))}
                </div>
              )}
              {inv.weaknesses.length > 0 && (
                <div className={styles.catSec}>
                  <h3>{t(db, locale, "catalog.weaknesses")}</h3>
                  {inv.weaknesses.map((c) => (
                    <CardLink key={c} code={c} />
                  ))}
                </div>
              )}
            </>
          )}
          {starters.map((deck) => (
            <div key={deck.id} className={styles.catSec}>
              <h3>{t(db, locale, "catalog.starter")}</h3>
              <div className={styles.catDeck}>
                {Object.entries(deck.cards)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([c, n]) => (
                    <CardLink key={c} code={c} n={n} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
