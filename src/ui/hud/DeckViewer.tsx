import { useState } from "react";
import { cardText, t } from "../../content/i18n";
import type { GameState } from "../../engine/types";
import { CardFace } from "../components/CardFace";
import { groupTokens } from "../game/chaos";
import { db, useGame } from "../state/context";
import { useView } from "../state/view";
import { ChaosTokenIcon } from "./ChaosTokenIcon";
import { formatText } from "./Hud";
import { Modal } from "./Modals";
import { CardOptions } from "./Panels";

export type DeckKind = "act" | "agenda" | "reference";

/** the scenario reference card for the game's difficulty: its front on Easy/Standard, its back on Hard/Expert */
export const referenceSide = (game: GameState) =>
  game.difficulty === "hard" || game.difficulty === "expert" ? "back" : "front";

/**
 * Every act or agenda of the scenario in order (the current one marked; ones still to come keep their backs hidden),
 * or the scenario reference card with both sides and the tokens in the bag. Hovering a card shows its text beside.
 */
export function DeckViewer({ kind }: { kind: DeckKind }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const close = () => useView.getState().setModal(null);
  const sc = db.scenarios[game.scenarioId];
  const currentId = kind === "act" ? game.act : kind === "agenda" ? game.agenda : null;
  const codes = kind === "act" ? sc.acts : kind === "agenda" ? sc.agendas : [sc.card];
  const cur =
    kind === "reference" ? 0 : currentId ? codes.indexOf(game.cards[currentId].code) : codes.length;
  const first = kind === "reference" ? referenceSide(game) : "front";
  const [focus, setFocus] = useState<{ code: string; side: "front" | "back" }>({
    code: codes[Math.min(cur, codes.length - 1)],
    side: first,
  });
  const tx = cardText(db, focus.code, locale);
  const text = focus.side === "back" ? (tx.backText ?? "") : tx.text;

  const face = (code: string, side: "front" | "back") => (
    <div
      className={`dv-card ${kind === "reference" ? "" : "landscape"} ${focus.code === code && focus.side === side ? "focused" : ""}`}
      onMouseEnter={() => setFocus({ code, side })}
    >
      <CardFace code={code} locale={locale} side={side} />
    </div>
  );
  const title =
    kind === "reference" ? t(db, locale, "viewer.reference") : t(db, locale, `card.type.${kind}`);
  return (
    <Modal onClose={close} className={`deck-viewer dv-${kind}`}>
      <div className="dv-list">
        <h2 className="card-name">{title}</h2>
        {codes.map((code, i) => (
          <div
            key={code}
            className={`dv-item ${i === cur && kind !== "reference" ? "current" : ""}`}
          >
            {kind !== "reference" && (
              <div className="dv-label">
                {i + 1}. {cardText(db, code, locale).name}
                {i === cur && <span className="dv-current">{t(db, locale, "viewer.current")}</span>}
              </div>
            )}
            <div className="dv-sides">
              {kind === "reference" ? (
                <>
                  {face(code, first)}
                  {face(code, first === "front" ? "back" : "front")}
                </>
              ) : (
                <>
                  <div className="dv-front">
                    {face(code, "front")}
                    {i === cur && <CardOptions id={currentId} />}
                  </div>
                  {i <= cur ? (
                    face(code, "back")
                  ) : (
                    <div className="dv-card landscape dv-hidden">
                      {t(db, locale, "viewer.notRevealed")}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="dv-side">
        <h3 className="card-name">{focus.side === "back" ? (tx.backName ?? tx.name) : tx.name}</h3>
        {text && <p className="card-text" dangerouslySetInnerHTML={{ __html: formatText(text) }} />}
        {kind === "reference" && (
          <div className="bag-grid">
            {groupTokens(game.chaosBag).map(([tok, n]) => (
              <div key={tok} className="bag-token" title={`${tok} ×${n}`}>
                <ChaosTokenIcon token={tok} size={44} />
                <b>×{n}</b>
              </div>
            ))}
          </div>
        )}
        <button className="modal-close" onClick={close}>
          {t(db, locale, "modal.close")}
        </button>
      </div>
    </Modal>
  );
}
