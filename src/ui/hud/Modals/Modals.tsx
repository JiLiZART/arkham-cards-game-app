import { useEffect, useRef, type ReactNode } from "react";
import { cardText, encounterSetName, t } from "../../../content/i18n";
import type { ChoiceOption, GameState, InstId } from "../../../engine/types";
import { CardFace } from "../../components/CardFace";
import { cardDetails } from "../../game/details";
import { db, useGame } from "../../state/context";
import { Glyph, Icon } from "../../components/Icon";
import type { IconName } from "../../assets/icons";
import { useChoicesOffered } from "../../state/usePlayers";
import { optionLabel } from "../../game/optionText";
import { useView } from "../../state/view";
import { abilitySymbol } from "../ActionRail";
import { formatText } from "../Hud";
import { InvModal } from "../Investigators";
import { ChaosBagModal } from "../ChaosBagModal";
import { moment } from "../SoundLayer";
import { DeckViewer } from "../DeckViewer";
import { AssetsModal } from "../AssetsModal";
import styles from "./Modals.module.css";

/** a native modal dialog: Escape and focus trapping come from <dialog>; a click on the backdrop closes it */
export function Modal({
  onClose: close,
  className,
  children,
}: {
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onClose = () => {
    moment("close");
    close();
  };
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      d.showModal();
      moment("open");
    }
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className ?? ""}`}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </dialog>
  );
}

/** pending options tied to some cards, when nothing is animating */
export function useCardOptions(ids: (InstId | null | undefined)[]): ChoiceOption[] {
  const game = useGame((s) => s.game) as GameState;
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const offered = useChoicesOffered();
  if (busy || !offered || !game.pending) return [];
  return game.pending.options.filter((o) => o.card && ids.includes(o.card));
}

export function OptionButtons({
  options,
  onChosen,
}: {
  options: ChoiceOption[];
  onChosen?: () => void;
}) {
  const choose = useGame((s) => s.choose);
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  if (!options.length) return null;
  return (
    <div className={styles.modalOptions}>
      {options.map((o) => {
        const sym = abilitySymbol(o, game);
        return (
          <button
            key={o.id}
            className="primary"
            onClick={() => {
              onChosen?.();
              choose(o.id);
            }}
          >
            <Glyph name={sym ?? "action"} size={22} title="" />{" "}
            <span>{optionLabel(o, game, locale)}</span>
          </button>
        );
      })}
    </div>
  );
}

const TOKENS: [
  keyof Pick<GameState["cards"][string], "damage" | "horror" | "clues" | "doom" | "resources">,
  IconName,
][] = [
  ["damage", "damage"],
  ["horror", "horror"],
  ["clues", "clue"],
  ["doom", "doom"],
  ["resources", "resource"],
];

/** one card at full size with its tokens, its text and the options it offers */
/** the card's keywords explained, as in the details column */
function Keywords({ code, locale }: { code: string; locale: string }) {
  const row = cardDetails(db, code, locale).find((r) => r.k === "keywords");
  if (row?.k !== "keywords") return null;
  return (
    <dl className="hd-keywords" aria-label={row.label}>
      {row.items.map((k) => (
        <div key={k.name}>
          <dt>{k.name}</dt>
          <dd>{k.text}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CardModal({ id }: { id: InstId }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const close = () => useView.getState().setModal(null);
  const options = useCardOptions([id]);
  const inst = game.cards[id];
  if (!inst) return null;
  const d = db.cards[inst.code];
  const tx = cardText(db, inst.code, locale);
  const back = d.type === "location" && !inst.revealed;
  // act and agenda: both sides side by side (the back holds what happens when it advances)
  const both = (d.type === "act" || d.type === "agenda") && d.doubleSided;
  return (
    <Modal onClose={close} className={`card-modal ${both ? "both" : ""}`}>
      {both ? (
        <div className="modal-sides">
          <div className="modal-card landscape">
            <CardFace code={inst.code} locale={locale} side="front" />
          </div>
          <div className="modal-card landscape">
            <CardFace code={inst.code} locale={locale} side="back" />
          </div>
        </div>
      ) : (
        <div
          className={`modal-card ${["act", "agenda", "investigator"].includes(d.type) ? "landscape" : ""}`}
        >
          <CardFace code={inst.code} locale={locale} side={back ? "back" : "front"} />
        </div>
      )}
      <div className="modal-side">
        <h2 className="card-name">{back ? (tx.backName ?? tx.name) : tx.name}</h2>
        {tx.subname && <div className="muted">{tx.subname}</div>}
        {d.encounterSet && encounterSetName(db, d.encounterSet, locale) && (
          <div className="muted">{encounterSetName(db, d.encounterSet, locale)}</div>
        )}
        <div className={styles.modalTokens}>
          {TOKENS.filter(([k]) => inst[k] > 0).map(([k, icon]) => (
            <span key={k} className="stat" title={`${t(db, locale, `stat.${k}`)} ${inst[k]}`}>
              <Icon name={icon} size={34} />
              <b>{inst[k]}</b>
            </span>
          ))}
        </div>
        <p
          className="card-text"
          dangerouslySetInnerHTML={{ __html: formatText(back ? (tx.backText ?? "") : tx.text) }}
        />
        {!back && <Keywords code={inst.code} locale={locale} />}
        <OptionButtons options={options} onChosen={close} />
        <button className="modal-close" onClick={close}>
          {t(db, locale, "modal.close")}
        </button>
      </div>
    </Modal>
  );
}

/** whichever modal is open */
export function Modals() {
  const modal = useView((s) => s.modal);
  if (!modal) return null;
  if ("card" in modal) return <CardModal key={modal.card} id={modal.card} />;
  if ("bag" in modal) return <ChaosBagModal />;
  if ("deck" in modal) return <DeckViewer key={modal.deck} kind={modal.deck} />;
  if ("assets" in modal) return <AssetsModal key={modal.assets} inv={modal.assets} />;
  if ("threats" in modal)
    return <AssetsModal key={modal.threats} inv={modal.threats} part="threats" />;
  return <InvModal key={modal.inv} inv={modal.inv} />;
}
