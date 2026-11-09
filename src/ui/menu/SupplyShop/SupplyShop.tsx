import { useState } from "react";
import { cardText, t } from "../../../content/i18n";
import type { CampaignStep } from "../../../content/schema";
import { supplyPoints } from "../../../engine/campaign/flow";
import type { CampaignState } from "../../../engine/campaign/types";
import { db, gameStore, useGame } from "../../state/context";
import { Portrait } from "../../components/Portrait";
import { cx } from "../../components/cx";
import styles from "./SupplyShop.module.css";

type Buy = Extract<CampaignStep, { kind: "buySupplies" }>;

/** what buying `counts` costs: the experience it takes beyond the points, or null when it can't be paid */
export function supplyCost(st: Buy, players: number, xp: number, counts: Record<string, number>) {
  const spent = st.list.reduce((n, x) => n + x.cost * (counts[x.id] ?? 0), 0);
  const left = supplyPoints(st, players) - spent;
  const xpUsed = left < 0 ? -left * (st.xpRate ?? Infinity) : 0;
  return { left, xpUsed, ok: xpUsed <= Math.min(st.xpMax ?? Infinity, xp) };
}

/**
 * A Supply Point (ADR-0053): one investigator buys from the guide's list with their points, a counter for a supply
 * bought by the many, a tick for one bought once; points beyond the budget cost experience where the guide allows it.
 */
export function SupplyShop({
  campaign,
  step,
  onBuy,
}: {
  campaign: CampaignState;
  step: Buy;
  onBuy: (ids: string[]) => void;
}) {
  const locale = useGame((s) => s.locale);
  const tr = (key: string, vars?: Record<string, string | number>) =>
    t(db, gameStore.getState().locale, key, vars);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const inv = campaign.investigators.find((i) => i.code === step.inv);
  if (!inv) return null;
  const cost = supplyCost(step, campaign.investigators.length, inv.xp, counts);
  const set = (id: string, n: number) => setCounts((x) => ({ ...x, [id]: Math.max(0, n) }));
  const ids = step.list.flatMap((x) => Array<string>(counts[x.id] ?? 0).fill(x.id));
  return (
    <div className={styles.supplyShop} data-testid="supply-shop">
      <header className={styles.buyer}>
        <Portrait code={inv.code} size={56} />
        <b>{cardText(db, inv.code, locale).name}</b>
        <output data-testid="supply-points" className={cost.left < 0 ? styles.over : ""}>
          {tr("supply.pointsLeft", { n: Math.max(0, cost.left) })}
        </output>
        {cost.xpUsed > 0 && Number.isFinite(cost.xpUsed) && (
          <small>{tr("supply.xpUsed", { n: cost.xpUsed, max: step.xpMax ?? inv.xp })}</small>
        )}
      </header>
      <ul className={styles.items}>
        {step.list.map((x) => {
          const n = counts[x.id] ?? 0;
          return (
            <li key={x.id} className={cx(n > 0 && styles.on)}>
              <span className={styles.name}>{tr(`supply.${x.id}`)}</span>
              <span className={styles.cost}>{tr("supply.cost", { n: x.cost })}</span>
              {x.multiple ? (
                <span className={styles.counter}>
                  <button
                    aria-label={tr("flow.less")}
                    disabled={!n}
                    onClick={() => set(x.id, n - 1)}
                  >
                    −
                  </button>
                  <output>{n}</output>
                  <button aria-label={tr("flow.more")} onClick={() => set(x.id, n + 1)}>
                    +
                  </button>
                </span>
              ) : (
                <input
                  type="checkbox"
                  aria-label={tr(`supply.${x.id}`)}
                  checked={n > 0}
                  onChange={() => set(x.id, n ? 0 : 1)}
                />
              )}
            </li>
          );
        })}
      </ul>
      <button className="primary big" disabled={!cost.ok} onClick={() => onBuy(ids)}>
        {tr("flow.confirm")}
      </button>
    </div>
  );
}
