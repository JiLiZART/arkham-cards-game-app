import { t } from "../../../content/i18n";
import type { GameState } from "../../../engine/types";
import { CardFace } from "../../components/CardFace";
import { groupTokens } from "../../game/chaos";
import { db, gameStore, useGame } from "../../state/context";
import { useView } from "../../state/view";
import { ChaosTokenIcon } from "../ChaosTokenIcon";
import { Modal } from "../Modals";
import styles from "./ChaosBagModal.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
/** every token in the bag with its count, next to the scenario reference card for the difficulty */
export function ChaosBagModal() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const close = () => useView.getState().setModal(null);
  const ref = db.scenarios[game.scenarioId].card;
  const side = game.difficulty === "hard" || game.difficulty === "expert" ? "back" : "front";
  return (
    <Modal onClose={close} className={styles.bagModal}>
      <div className={styles.bagTokens}>
        <h2 className="card-name">
          {tr("bag.title")} · {game.chaosBag.length}
        </h2>
        <div className="bag-grid">
          {groupTokens(game.chaosBag).map(([tok, n]) => (
            <div key={tok} className="bag-token" title={`${tok} ×${n}`}>
              <ChaosTokenIcon token={tok} size={56} />
              <b>×{n}</b>
            </div>
          ))}
        </div>
        <button className="modal-close" onClick={close}>
          {tr("modal.close")}
        </button>
      </div>
      {ref && db.cards[ref] && (
        <div className={styles.bagReference}>
          <CardFace code={ref} locale={locale} side={side} />
        </div>
      )}
    </Modal>
  );
}
