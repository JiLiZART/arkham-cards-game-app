import { t } from "../../../content/i18n";
import type { CardDef } from "../../../content/schema";
import { db, useGame } from "../../state/context";
import { Glyph, Icon } from "../../components/Icon";
import { slotIcons } from "../../game/details";
import { chipsFor, type Chip } from "../../game/glance";
import { isIcon } from "../../assets/icons";
import { cx } from "../../components/cx";
import styles from "./GlanceBadge.module.css";

/** the chip's tooltip: its name, with the amount ("Damage +1", "Combat 1") */
function chipTitle(chip: Chip, locale: string): string {
  const name = t(db, locale, `glance.${chip.icon}`);
  return chip.n === undefined ? name : `${name} ${chip.plus ? "+" : ""}${chip.n}`;
}

/** the slots an asset takes, as chips: on a hand card's glance badge and on the cards in the asset area */
export function SlotChips({
  card,
  className = cx(styles.glanceChip, "slot-chip"),
}: {
  card: CardDef;
  className?: string;
}) {
  const locale = useGame((s) => s.locale);
  return slotIcons(card.slots).map((s) => {
    const name = t(db, locale, `card.slot.${s.slot}`);
    return (
      <span key={s.slot} className={className} title={s.n > 1 ? `${name} ×${s.n}` : name}>
        <Icon name={s.icon} size={20} title="" />
      </span>
    );
  });
}

/**
 * up to three chips along a hand card's top edge saying what the card is for, and at its right end the slots an asset
 * takes; part of the card, so it scales with it
 */
export function GlanceBadge({ card }: { card: CardDef }) {
  const locale = useGame((s) => s.locale);
  const chips = chipsFor(card);
  if (!chips.length && !card.slots.length) return null;
  return (
    <span className={styles.glance}>
      {chips.map((c, k) => (
        <span key={k} className={styles.glanceChip} title={chipTitle(c, locale)}>
          {isIcon(c.icon) ? (
            <Icon name={c.icon} size={20} title="" />
          ) : (
            <Glyph name={c.icon} size={18} title="" />
          )}
          {c.n !== undefined && (
            <b>
              {c.plus ? "+" : ""}
              {c.n}
            </b>
          )}
        </span>
      ))}
      {card.slots.length > 0 && (
        <span className={styles.glanceSlots}>
          <SlotChips card={card} />
        </span>
      )}
    </span>
  );
}
