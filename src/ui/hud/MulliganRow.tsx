import { useLayoutEffect, useRef } from "react";
import { t } from "../../content/i18n";
import type { GameState, InstId, InvId } from "../../engine/types";
import { domPlace, noteLocalMove, reducedMotion, takeLocalMove, type ScreenBox } from "../arrivals";
import { db, useGame } from "../context";
import { backUrl } from "../images";
import { viewerOf } from "../store";
import { centreTransform, flyGhost, flyIn, STAGGER_MS } from "./flights";
import { MiniCard } from "./Panels";
import { RESOLVE_BOX } from "./Reveal";
import { moment } from "./SoundLayer";

/** the cards the viewer has picked for their mulligan redraw (they stay in the hand zone until confirmed) */
export function mulliganPicks(game: GameState, viewer: InvId | null): InstId[] {
  const p = game.pending;
  if (!p || p.kind !== "mulligan" || p.inv !== viewer || p.step.t !== "Mulligan") return [];
  return p.step.chosen ?? [];
}

const boxOf = (el: Element): ScreenBox => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/**
 * The "to redraw" row on the table above the hand: cards picked for the mulligan fly here out of the fan, a click
 * flies one back, and on confirm they fly face down into the deck.
 */
export function MulliganRow() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const choose = useGame((s) => s.choose);
  const viewer = viewerOf(game);
  const picks = mulliganPicks(game, viewer);
  const ref = useRef<HTMLDivElement>(null);
  // where each card in the row was last drawn: a confirmed redraw flies the cards from there into the deck
  const rects = useRef(new Map<InstId, ScreenBox>());

  useLayoutEffect(() => {
    const els = new Map([...(ref.current?.querySelectorAll<HTMLElement>("[data-card]") ?? [])].map((el) => [el.dataset.card!, el]));
    // picks that left the row into the deck (the redraw was confirmed)
    let k = 0;
    for (const [id, from] of rects.current) {
      if (els.has(id)) continue;
      rects.current.delete(id);
      if (game.cards[id]?.zone === "deck" && !k) moment("shuffle");
      const to = domPlace("deck", RESOLVE_BOX);
      if (game.cards[id]?.zone === "deck" && to && !reducedMotion()) flyGhost(backUrl("player"), from, to, k++ * STAGGER_MS);
    }
    // a card just picked flies in from its place in the fan
    for (const [id, el] of els) {
      if (!rects.current.has(id)) {
        const from = takeLocalMove(id);
        if (from) flyIn(el, null, centreTransform(boxOf(el), from), "none", 0);
      }
      rects.current.set(id, boxOf(el));
    }
  });

  return (
    <div className={`mulligan-row ${picks.length ? "" : "empty"}`} ref={ref} aria-hidden={!picks.length}>
      {picks.length > 0 && <div className="mulligan-label">{t(db, locale, "mulligan.row")}</div>}
      <div className="mulligan-cards">
        {picks.map((id) => {
          const back = game.pending?.options.find((o) => o.id === `un:${id}`);
          return (
            <MiniCard
              key={id}
              id={id}
              w={124}
              h={173}
              legal={!busy && !!back}
              onClick={(e) => {
                if (busy || !back) return;
                noteLocalMove(id, e.currentTarget);
                choose(back.id);
              }}
            />
          );
        })}
      </div>
      {picks.length > 0 && <div className="mulligan-hint">{t(db, locale, "mulligan.hint")}</div>}
    </div>
  );
}
