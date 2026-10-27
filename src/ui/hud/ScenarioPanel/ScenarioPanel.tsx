import { t } from "../../../content/i18n";
import { actClueCost, doomInPlay } from "../../../engine/rules/scenario";
import type { GameState } from "../../../engine/types";
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

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
const gOf = () => ({ s: gameStore.getState().game!, db, events: [] });

/** act and agenda, small and the right way up, top-left; a click shows both sides */
export function ScenarioPanel() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const { byCard } = useCardClick();
  const g = gOf();
  const open = (deck: "act" | "agenda" | "reference") => useView.getState().setModal({ deck });
  const ref = db.scenarios[game.scenarioId].card;
  const refDimmed = useDimmed("reference");
  const agendaDef = game.agenda ? db.cards[game.cards[game.agenda].code] : null;
  const cost = actClueCost(g);
  // during the mulligan and the introduction the cards keep their place (the introduction flies them there) but hide
  const hides = introHides(
    game,
    useView((s) => s.intro?.step),
  );
  return (
    <div className={styles.scenarioPanel} data-ui="scenario-panel">
      {game.agenda && (
        <div
          className={cx(styles.scenarioCard, hides.agenda ? styles.introHidden : "")}
          data-tip="agenda"
        >
          <MiniCard
            id={game.agenda}
            w={170}
            h={122}
            hover={false}
            legal={byCard.has(game.agenda)}
            onClick={() => open("agenda")}
          />
          <CardOptions id={game.agenda} />
          <span
            className={styles.scenarioBadge}
            title={`${tr("stat.doom")} ${doomInPlay(g)} / ${agendaDef?.doom ?? "?"}`}
          >
            <Icon name="doom" size={22} /> <b>{doomInPlay(g)}</b>
            <small>/{agendaDef?.doom ?? "?"}</small>
          </span>
        </div>
      )}
      {game.act && (
        <div
          className={cx(styles.scenarioCard, hides.act ? styles.introHidden : "")}
          data-tip="act"
        >
          <MiniCard
            id={game.act}
            w={170}
            h={122}
            hover={false}
            legal={byCard.has(game.act)}
            onClick={() => open("act")}
          />
          <CardOptions id={game.act} />
          {Number.isFinite(cost) && (
            <span className={styles.scenarioBadge} title={`${tr("stat.clues")} ${cost}`}>
              <Icon name="clue" size={22} /> <b>{cost}</b>
            </span>
          )}
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
