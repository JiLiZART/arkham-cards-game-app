import { useEffect, type ReactNode } from "react";
import { t } from "../../../content/i18n";
import { BottomSheet } from "../../components/BottomSheet";
import { cx } from "../../components/cx";
import { db, gameStore } from "../../state/context";
import { useLayoutMode } from "../../state/layoutMode";
import styles from "./FilterPanel.module.css";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

/** one group of the panel: a label and chips, one value at a time; a second tap on the lit chip unsets it */
export function FilterChips<T extends string | number>({
  name,
  label,
  options,
  value,
  onChange,
  all,
}: {
  name: string;
  label: string;
  options: { value: T; label: ReactNode; title?: string }[];
  value: T | null;
  onChange(v: T | null): void;
  /** a first segment that stands for "unset", for a segmented control that needs a resting state */
  all?: string;
}) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      <span className={styles.groupLabel}>{label}</span>
      <div className="wz-chips">
        {all && (
          <button
            className={cx("wz-chip", value === null ? "on" : "")}
            aria-pressed={value === null}
            data-testid={`wz-opt-${name}-all`}
            onClick={() => onChange(null)}
          >
            {all}
          </button>
        )}
        {options.map((o) => (
          <button
            key={o.value}
            className={cx("wz-chip", value === o.value ? "on" : "")}
            aria-pressed={value === o.value}
            title={o.title}
            data-testid={`wz-opt-${name}-${o.value}`}
            onClick={() => onChange(value === o.value ? null : o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The filters' panel: a popover under the Filters control on the desktop (closed by Escape, a tap outside or the control), the
 * bottom sheet on the phone (ADR-0017). Same content in both: the caller's groups, Clear all and how many match.
 */
export function FilterPanel({
  onClose,
  onClear,
  match,
  children,
}: {
  onClose: () => void;
  onClear: () => void;
  match: string;
  children: ReactNode;
}) {
  const phone = useLayoutMode() === "phone";
  useEffect(() => {
    if (phone) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const away = (e: PointerEvent) => {
      if (!(e.target as Element).closest("[data-filter-root]")) onClose();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
    };
  }, [phone, onClose]);

  const body = (
    <>
      {children}
      <div className={styles.foot}>
        <button type="button" className="wz-chip" data-testid="wz-clear" onClick={onClear}>
          {tr("wizard.filter.clear")}
        </button>
        <span className={styles.match} data-testid="wz-panel-match">
          {match}
        </span>
      </div>
    </>
  );
  return phone ? (
    <BottomSheet
      title={tr("wizard.filter.toggle")}
      onClose={onClose}
      testId="wz-filter-sheet"
      portal={false}
    >
      {body}
    </BottomSheet>
  ) : (
    <div
      className={styles.popover}
      role="dialog"
      aria-label={tr("wizard.filter.toggle")}
      data-testid="wz-filter-popover"
    >
      {body}
    </div>
  );
}
