import { t } from "../../../content/i18n";
import { actClueCost, doomFor } from "../../../engine/rules/scenario";
import type { GameState } from "../../../engine/world/types";
import { CardFace } from "../../components/CardFace";
import { useCardClick } from "../../game/cardClick";
import { db, gameStore, useGame } from "../../state/context";
import { Icon } from "../../components/Icon";
import { introHides } from "../../game/intro";
import { useDimmed, useView } from "../../state/view";
import { referenceSide } from "../DeckViewer";
import { CardOptions } from "../CardOptions";
import { MiniCard } from "../MiniCard";
import { cx } from "../../components/cx";
import styles from "./ScenarioPanel.module.css";
import { cardOf, cardsOf } from "../../../engine/context";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
const gOf = () => ({ s: gameStore.getState().game!, db, events: [] });

/** each agenda and act deck's current card, small and the right way up, top-left; a click shows both sides */
export function ScenarioPanel() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const { byCard } = useCardClick();
  const g = gOf();
  const open = (deck: "act" | "agenda" | "reference") => useView.getState().setModal({ deck });
  const ref = db.scenarios[game.scenarioId].card;
  const refDimmed = useDimmed("reference");
  // during the mulligan and the introduction the cards keep their place (the introduction flies them there) but hide
  // cards out of play in the void, keeping what is on them (the Hunting Horror): dimmed, off the map
  const inVoid = cardsOf(game).filter((c) => c.zone === "void");
  const hides = introHides(
    game,
    useView((s) => s.intro?.step),
  );
  return (
    <div className={styles.scenarioPanel} data-testid="scenario-panel">
      {Object.entries(game.agendas).map(([deck, id]) => {
        if (!id) return null;
        const threshold = db.cards[cardOf(game, id).code]?.doom ?? "?";
        const doom = doomFor(g, id);
        return (
          <div
            key={`agenda:${deck}`}
            className={cx(styles.scenarioCard, hides.agenda ? styles.introHidden : "")}
            data-tip="agenda"
          >
            <MiniCard
              id={id}
              w={170}
              h={122}
              hover={false}
              legal={byCard.has(id)}
              onClick={() => open("agenda")}
            />
            <CardOptions id={id} />
            <span
              className={styles.scenarioBadge}
              title={`${tr("stat.doom")} ${doom} / ${threshold}`}
            >
              <Icon name="doom" size={22} /> <b>{doom}</b>
              <small>/{threshold}</small>
            </span>
          </div>
        );
      })}
      {Object.entries(game.acts).map(([deck, id]) => {
        if (!id) return null;
        const cost = actClueCost(g, deck);
        return (
          <div
            key={`act:${deck}`}
            className={cx(styles.scenarioCard, hides.act ? styles.introHidden : "")}
            data-tip="act"
          >
            <MiniCard
              id={id}
              w={170}
              h={122}
              hover={false}
              legal={byCard.has(id)}
              onClick={() => open("act")}
            />
            <CardOptions id={id} />
            {Number.isFinite(cost) && (
              <span className={styles.scenarioBadge} title={`${tr("stat.clues")} ${cost}`}>
                <Icon name="clue" size={22} /> <b>{cost}</b>
              </span>
            )}
          </div>
        );
      })}
      {inVoid.length > 0 && (
        <div className={styles.voidShelf} data-testid="void-shelf" title={tr("hud.void")}>
          {inVoid.map((c) => (
            <MiniCard key={c.id} id={c.id} w={86} h={122} hover={false} />
          ))}
        </div>
      )}
      {ref && db.cards[ref] && (
        <div className={cx(styles.scenarioCard, hides.act ? styles.introHidden : "")}>
          <button
            className={cx("mini-card", styles.scenarioRef, refDimmed ? "dimmed" : "")}
            style={{ width: 86, height: 122 }}
            onClick={() => open("reference")}
            title={tr("viewer.reference")}
          >
            <CardFace code={ref} locale={locale} side={referenceSide(game)} />
          </button>
        </div>
      )}
    </div>
  );
}
