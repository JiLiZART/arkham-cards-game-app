import { scenarioText, t } from "../../../content/i18n";
import { db, gameStore, useGame } from "../../state/context";
import { Glyph } from "../../components/Icon";
import { hasSymbol, scenarioIcon } from "../../assets/icons";
import { ribbonModel } from "../../game/ribbon";
import { cx } from "../../components/cx";
import styles from "./Ribbon.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

/** where the game is: scenario and round, the round's four phases, and in the investigation phase whose turn it is with the actions left */
export function Ribbon() {
  const game = useGame((s) => s.game)!;
  const locale = useGame((s) => s.locale);
  const m = ribbonModel(game);
  return (
    <div className="ribbon">
      <span className={styles.ribbonScen}>
        {hasSymbol(scenarioIcon(game.scenarioId)) && (
          <Glyph
            name={scenarioIcon(game.scenarioId)}
            size={20}
            title={scenarioText(db, game.scenarioId, locale).name}
          />
        )}
        <b>{scenarioText(db, game.scenarioId, locale).name}</b>
        <span className={styles.ribbonRound}>{tr("phase.round", { n: m.round })}</span>
      </span>
      {m.stage !== "play" ? (
        <span className={cx(styles.ribbonPhase, "current")}>
          {tr(m.stage === "setup" ? "phase.setup" : "phase.ended")}
        </span>
      ) : (
        m.phases.map((p) => {
          const name = tr(`phase.${p.id}`);
          return (
            <span key={p.id} className={styles.ribbonSeg}>
              <span
                className={cx(styles.ribbonPhase, p.state, styles[p.state])}
                title={p.state === "skipped" ? tr("ribbon.skipped", { phase: name }) : name}
              >
                <span className={styles.full}>{name}</span>
                <span className={styles.short}>{name[0]}</span>
              </span>
            </span>
          );
        })
      )}
    </div>
  );
}
