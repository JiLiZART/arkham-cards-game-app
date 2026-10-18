import { useEffect } from "react";
import { t } from "../../content/i18n";
import type { GameEvent } from "../../engine/types";
import { captionIndex, captionStageBusy } from "../feed";
import { db, useGame } from "../context";
import { needsNext } from "../store";
import { useView } from "../view";
import { Sentence, useFeedEntries } from "./Feed";

/** the log index of the phase step being played out, or null (the prompt banner gives way to it) */
export function useCaption(): number | null {
  const { shown, game } = useFeedEntries();
  const current = useGame((s) => s.current);
  const queue = useGame((s) => s.queue);
  const stageBusy = useView((s) => captionStageBusy(s.stage));
  return captionIndex(game.log, current, queue, shown, stageBusy, game.pending?.kind ?? null);
}

/** at the Tap pace: the playing event waits for Next (Space, Enter, or a click on its card) */
export function useHeld(): boolean {
  const playing = useView((s) => s.playing) as GameEvent | null;
  const pace = useGame((s) => s.pace);
  const byHand = useGame((s) => s.drawByHand);
  return needsNext(playing, pace, byHand);
}

/** names the automated step of a phase while its events play ("Hunters move"), with Next when the pace waits for a tap */
export function StepCaption() {
  const at = useCaption();
  const held = useHeld();
  const next = useGame((s) => s.nextEvent);
  const locale = useGame((s) => s.locale);
  const { entries } = useFeedEntries();
  useEffect(() => {
    if (!held) return;
    const key = (e: KeyboardEvent) => {
      if ((e.key !== " " && e.key !== "Enter") || e.repeat) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select")) return;
      e.preventDefault();
      next();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [held, next]);
  const e = at === null ? null : entries.get(at);
  if (!e && !held) return null;
  return (
    <div key={at ?? "held"} className={`step-caption ${held ? "held" : ""}`}>
      {e && <Sentence parts={e.parts} size={26} />}
      {held && (
        <button className="primary caption-next" onClick={next}>
          {t(db, locale, "caption.next")} ⏎
        </button>
      )}
    </div>
  );
}
