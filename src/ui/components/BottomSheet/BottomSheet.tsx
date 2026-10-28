import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { t } from "../../../content/i18n";
import { db, useGame } from "../../state/context";
import { UiIcon } from "../Icon";
import { closesOnDrag, closesOnKey, dragOffset } from "./sheetDrag";
import styles from "./BottomSheet.module.css";

/**
 * The phone's details pane (ADR-0017): a panel rising from the bottom edge over a scrim, about 70 % of the height, with a drag
 * handle, a Close control and a body that scrolls. The caller owns whether it is open (view state, ADR-0004) and renders the
 * same content the desktop shows in its popover or sidebar. Closes on the scrim, Escape, Close, or a drag down on the handle.
 */
export function BottomSheet({
  title,
  onClose,
  children,
  testId = "bottom-sheet",
  portal = true,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  /** false renders the sheet in place, so it keeps its screen's theme (the wizard's paper notes); it is fixed either way */
  portal?: boolean;
}) {
  const locale = useGame((s) => s.locale);
  const [offset, setOffset] = useState(0);
  const start = useRef<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  // focus moves into the dialog on open and returns to what had it on close
  useEffect(() => {
    const was = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    return () => was?.focus?.({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!closesOnKey(e.key)) return;
      e.stopPropagation();
      close.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // taps on the sheet or its scrim stop here: they must not reach the table or the portal's React parents
  const stop = (e: PointerEvent) => e.stopPropagation();
  const down = (e: PointerEvent<HTMLDivElement>) => {
    start.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (start.current !== null) setOffset(dragOffset(start.current, e.clientY));
  };
  const up = (e: PointerEvent) => {
    if (start.current === null) return;
    const d = dragOffset(start.current, e.clientY);
    start.current = null;
    if (closesOnDrag(d)) close.current();
    else setOffset(0);
  };

  const sheet = (
    <div
      className={styles.scrim}
      data-testid={`${testId}-scrim`}
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        tabIndex={-1}
        className={styles.sheet}
        data-testid={testId}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={offset ? { transform: `translateY(${offset}px)`, transition: "none" } : undefined}
        onPointerDown={stop}
      >
        <div
          className={styles.handle}
          data-testid={`${testId}-handle`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <i aria-hidden="true" />
        </div>
        <header className={styles.head}>
          <h2>{title}</h2>
          <button
            type="button"
            className={styles.close}
            data-testid={`${testId}-close`}
            onClick={onClose}
            title={t(db, locale, "sheet.close")}
            aria-label={t(db, locale, "sheet.close")}
          >
            <UiIcon name="none" size={20} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
  return portal ? createPortal(sheet, document.body) : sheet;
}
