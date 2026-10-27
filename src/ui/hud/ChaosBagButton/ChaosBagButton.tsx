import { t } from "../../../content/i18n";
import { db, gameStore, useGame } from "../../state/context";
import { Icon } from "../../components/Icon";
import { useView } from "../../state/view";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);
/** the chaos bag, top-right corner (on a phone, a small icon in the top bar); a click lists its tokens */
export function ChaosBagButton({ size = 96 }: { size?: number }) {
  const count = useGame((s) => s.game?.chaosBag.length ?? 0);
  return (
    <button
      className="chaos-bag"
      id="chaos-bag"
      data-tip="bag"
      onClick={() => useView.getState().setModal({ bag: true })}
      title={`${tr("bag.title")}: ${count}`}
    >
      <Icon name="chaosBag" size={size} title={tr("bag.title")} />
      <span className="pile-count">{count}</span>
    </button>
  );
}
