import { useState } from "react";
import { t } from "../../../content/i18n";
import { db, useGame } from "../../state/context";
import {
  ASKED_KEY,
  askKind,
  fullscreenSupported,
  toggleFullscreen,
  useFullscreen,
} from "../../state/fullscreen";
import { useLayoutMode } from "../../state/layoutMode";
import { safeStorage } from "../../state/store";
import { useView } from "../../state/view";
import { UiIcon } from "../Icon";
import { cx } from "../cx";
import styles from "./FullscreenButton.module.css";

const tr = (locale: string, key: string) => t(db, locale, key);

/** the fullscreen toggle: an icon button that exists only where the page can go fullscreen (not on iPhone Safari) */
export function FullscreenButton({
  className = "",
  bare = false,
}: {
  className?: string;
  /** inside a bar that sizes its own buttons (the phone top bar): no box of its own */
  bare?: boolean;
}) {
  const locale = useGame((s) => s.locale);
  const active = useFullscreen();
  if (!fullscreenSupported()) return null;
  const label = tr(locale, active ? "fullscreen.exit" : "fullscreen.enter");
  return (
    <button
      type="button"
      data-testid="fullscreen-toggle"
      className={cx(!bare && styles.fsBtn, className)}
      onClick={() => void toggleFullscreen()}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <UiIcon name={active ? "windowed" : "fit"} size={20} />
    </button>
  );
}

const readAsked = () => {
  try {
    return !!safeStorage().getItem(ASKED_KEY);
  } catch {
    return false;
  }
};

/** the one-time line on the first phone visit: go fullscreen, or (no API) add the page to the Home Screen; answered once, remembered */
export function FullscreenAsk({ at = "top" }: { at?: "top" | "bottom" }) {
  const locale = useGame((s) => s.locale);
  const phone = useLayoutMode() === "phone";
  const active = useFullscreen();
  const [asked, setAsked] = useState(readAsked);
  const kind = askKind({ phone, supported: fullscreenSupported(), asked, active });
  // the online room's menu has the corner while it is open
  const roomMenu = useView((s) => s.netOpen);
  if (!kind || roomMenu) return null;
  const done = () => {
    try {
      safeStorage().setItem(ASKED_KEY, "1");
    } catch {
      // the ask just shows again next time
    }
    setAsked(true);
  };
  return (
    <div
      className={cx(styles.ask, at === "bottom" && styles.bottom)}
      role="region"
      aria-label={tr(locale, "fullscreen.enter")}
    >
      <span>{tr(locale, kind === "fullscreen" ? "fullscreen.ask" : "fullscreen.homeScreen")}</span>
      {kind === "fullscreen" ? (
        <>
          <button
            type="button"
            className="primary"
            data-testid="fullscreen-yes"
            onClick={() => {
              // the request must run inside this tap
              void toggleFullscreen();
              done();
            }}
          >
            {tr(locale, "fullscreen.yes")}
          </button>
          <button type="button" data-testid="fullscreen-no" onClick={done}>
            {tr(locale, "fullscreen.no")}
          </button>
        </>
      ) : (
        <button type="button" data-testid="fullscreen-dismiss" onClick={done}>
          {tr(locale, "fullscreen.dismiss")}
        </button>
      )}
    </div>
  );
}
