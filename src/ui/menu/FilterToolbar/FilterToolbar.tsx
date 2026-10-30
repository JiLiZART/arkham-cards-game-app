import { useCallback, useRef, useState, type ReactNode } from "react";
import { t } from "../../../content/i18n";
import { cx } from "../../components/cx";
import { db, gameStore } from "../../state/context";
import { FilterPanel } from "../FilterPanel";
import styles from "./FilterToolbar.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

export interface ToolbarPill {
  key: string;
  label: string;
  clear(): void;
}

/**
 * The picker's one-row toolbar: the search, the step's inline filter (desktop only; the caller leaves it out on the phone and
 * puts it in the panel), the Filters control with a count of the filters set, and under it a pill for each filter set in the
 * panel and how many match. The panel's open state is the toolbar's (view state, ADR-0004).
 */
export function FilterToolbar({
  query,
  onQuery,
  inline,
  count,
  shown,
  total,
  pills,
  onClear,
  children,
}: {
  query: string;
  onQuery(q: string): void;
  inline?: ReactNode;
  count: number;
  shown: number;
  total: number;
  pills: ToolbarPill[];
  onClear(): void;
  /** the panel's groups */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    button.current?.focus({ preventScroll: true });
  }, []);
  const match = tr("wizard.filter.match", { n: shown, total });
  return (
    <div className={styles.toolbar} data-testid="wz-toolbar">
      <div className={styles.row}>
        <input
          type="search"
          className={styles.search}
          placeholder={tr("wizard.filter.search")}
          aria-label={tr("wizard.filter.search")}
          data-testid="wz-search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={(e) => e.currentTarget.scrollIntoView({ block: "nearest" })}
        />
        {inline}
        <div className={styles.anchor} data-filter-root>
          <button
            ref={button}
            type="button"
            className={cx("wz-chip", open || count ? "on" : "")}
            data-testid="wz-filters"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {count ? tr("wizard.filter.count", { n: count }) : tr("wizard.filter.toggle")}
          </button>
          {open && (
            <FilterPanel onClose={close} onClear={onClear} match={match}>
              {children}
            </FilterPanel>
          )}
        </div>
      </div>
      <div className={styles.under}>
        {pills.map((p) => (
          <button
            key={p.key}
            type="button"
            className={cx("wz-chip", styles.pill)}
            data-testid="wz-pill"
            aria-label={`${p.label}: ${tr("wizard.filter.remove")}`}
            onClick={p.clear}
          >
            {p.label} <span aria-hidden="true">×</span>
          </button>
        ))}
        <span className={styles.match} data-testid="wz-match" aria-live="polite">
          {match}
        </span>
      </div>
    </div>
  );
}
