import { t } from "../../../content/i18n";
import type { GameState, InstId } from "../../../engine/types";
import { db, gameStore, useGame } from "../../state/context";
import { useView } from "../../state/view";
import { useCardOptions } from "../Modals";
import { optionLabel } from "../../game/optionText";
import styles from "./CardOptions.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
/** options on the act or agenda (Advance act…) as buttons laid over the card; the rest of the card still opens the viewer */
export function CardOptions({ id }: { id: InstId | null }) {
  const choose = useGame((s) => s.choose);
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const options = useCardOptions([id]);
  if (!options.length) return null;
  return (
    <div className={styles.cardOptions}>
      {options.map((o) => (
        <button
          key={o.id}
          className="primary"
          title={o.label}
          onClick={(e) => {
            e.stopPropagation();
            useView.getState().setModal(null);
            choose(o.id);
          }}
        >
          {(o.value as { kind?: string } | null)?.kind === "advanceAct"
            ? tr("act.advance")
            : optionLabel(o, game, locale)}
        </button>
      ))}
    </div>
  );
}
