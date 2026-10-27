import { cardText, t } from "../../content/i18n";
import type { GameState, InstId, InvId } from "../../engine/types";
import { CardFace } from "../components/CardFace/index";
import { db, gameStore, useGame } from "../state/context";
import { optionHome, optionOwner } from "../game/optionHome";
import { viewerOf } from "../state/store";
import { useView } from "../state/view";
import { Modal, OptionButtons, useCardOptions } from "./Modals";
import { StatBody } from "./Stats";

const tr = (key: string, vars?: Record<string, string | number>) =>
  t(db, gameStore.getState().locale, key, vars);

/** every card of an investigator shown in their modal: investigator card, hand, play area, threat area */
function cardsOf(game: GameState, i: InvId) {
  const all = Object.values(game.cards);
  return {
    hand: game.invs[i].hand,
    play: all.filter((c) => c.zone === "play" && c.controller === i).map((c) => c.id),
    threat: [
      ...all.filter((c) => c.zone === "threat" && c.controller === i),
      ...all.filter((c) => c.zone === "enemy" && c.engagedWith === i),
    ].map((c) => c.id),
  };
}

/** pending options that belong in this investigator's modal */
function useInvOptions(i: InvId) {
  const game = useGame((s) => s.game) as GameState;
  const c = cardsOf(game, i);
  const viewer = viewerOf(game);
  return useCardOptions([game.invs[i].cardId, ...c.hand, ...c.play, ...c.threat]).filter(
    (o) => optionHome(o, game, viewer) === "invModal" && optionOwner(o, game) === i,
  );
}

function CardRow({ title, ids }: { title: string; ids: InstId[] }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  if (!ids.length) return null;
  return (
    <section className="inv-row">
      <h3>
        {title} · {ids.length}
      </h3>
      <div className="inv-cards">
        {ids.map((id) => (
          <button
            key={id}
            className="card-btn"
            onClick={() => useView.getState().setModal({ card: id })}
            title={cardText(db, game.cards[id].code, locale).name}
          >
            <CardFace code={game.cards[id].code} locale={locale} />
          </button>
        ))}
      </div>
    </section>
  );
}

/** another investigator: stats like the stat bar, their investigator card, hand, play area, threat area and options */
export function InvModal({ inv }: { inv: InvId }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const options = useInvOptions(inv);
  const close = () => useView.getState().setModal(null);
  if (!game.invs[inv]) return null;
  const c = cardsOf(game, inv);
  const cardId = game.invs[inv].cardId;
  return (
    <Modal onClose={close} className="inv-modal">
      <div className="inv-head">
        <div className="inv-stats">
          <StatBody inv={inv} />
        </div>
        <button
          className="card-btn landscape"
          onClick={() => useView.getState().setModal({ card: cardId })}
          title={cardText(db, inv, locale).name}
        >
          <CardFace code={inv} locale={locale} />
        </button>
        <div className="inv-actions">
          <OptionButtons options={options} onChosen={close} />
          <button className="modal-close" onClick={close}>
            {tr("modal.close")}
          </button>
        </div>
      </div>
      <CardRow title={tr("modal.hand")} ids={c.hand} />
      <CardRow title={tr("modal.inPlay")} ids={c.play} />
      <CardRow title={tr("modal.threat")} ids={c.threat} />
    </Modal>
  );
}
