import { t } from "../../../content/i18n";
import type { GameState, InvId } from "../../../engine/types";
import { useOptionsByCard } from "../../game/cardClick";
import { UiIcon } from "../../components/Icon";
import { db, useGame } from "../../state/context";
import { useView } from "../../state/view";
import { SlotChips } from "../GlanceBadge";
import { MiniCard } from "../MiniCard";
import { Modal, OptionButtons } from "../Modals";
import styles from "./AssetsModal.module.css";

/**
 * The phone's view of a strip (ADR-0005): an investigator's cards in play, or their threat area and engaged enemies
 * (`part`), every card large enough to read, side by side and scrolling sideways, each with its pending options (Fight,
 * Evade, an ability) as buttons over its centre, its slots, its tokens and whether it is exhausted. Opened from any
 * card of the phone's asset column or threat row; a tap on a card opens it at full size.
 */
export function AssetsModal({ inv, part = "assets" }: { inv: InvId; part?: "assets" | "threats" }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const byCard = useOptionsByCard();
  const close = () => useView.getState().setModal(null);
  const all = Object.values(game.cards);
  const cards =
    part === "assets"
      ? all.filter((c) => c.zone === "play" && c.controller === inv)
      : [
          ...all.filter((c) => c.zone === "threat" && c.controller === inv),
          ...all.filter((c) => c.zone === "enemy" && c.engagedWith === inv),
        ];
  const target = game.skillTest?.target ?? null;
  const tr = (key: string) => t(db, locale, key);
  return (
    <Modal onClose={close} className={styles.assetsModal}>
      <header className={styles.head}>
        <h2>{tr(part === "assets" ? "phone.strip" : "phone.threats")}</h2>
        <button
          type="button"
          className={styles.close}
          data-testid="assets-close"
          onClick={close}
          title={tr("sheet.close")}
          aria-label={tr("sheet.close")}
        >
          <UiIcon name="none" size={20} />
        </button>
      </header>
      <div className={styles.row} data-testid={`${part}-modal`}>
        {cards.map((c) => {
          const opts = byCard.get(c.id) ?? [];
          return (
            <figure key={c.id} className={styles.item} data-testid="assets-card">
              <div className={styles.cardBox}>
                <MiniCard
                  id={c.id}
                  w="100%"
                  h="100%"
                  hover={false}
                  legal={opts.length > 0}
                  target={c.id === target}
                  onClick={() => useView.getState().setModal({ card: c.id })}
                />
                {opts.length > 0 && (
                  <div className={styles.actions}>
                    <OptionButtons options={opts} onChosen={close} />
                  </div>
                )}
              </div>
              <figcaption className={styles.meta}>
                <SlotChips card={db.cards[c.code]} className={styles.slot} />
                {c.exhausted && <span className={styles.exhausted}>{tr("phone.exhausted")}</span>}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </Modal>
  );
}
