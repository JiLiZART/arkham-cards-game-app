import { t } from "../../content/i18n";
import type { CardDef } from "../../content/schema";
import { db, useGame } from "../context";
import { Glyph, Icon } from "../Icon";
import { chipsFor, type Chip } from "../glance";
import { isIcon } from "../icons";

/** the chip's tooltip: its name, with the amount ("Damage +1", "Combat 1") */
function chipTitle(chip: Chip, locale: string): string {
  const name = t(db, locale, `glance.${chip.icon}`);
  return chip.n === undefined ? name : `${name} ${chip.plus ? "+" : ""}${chip.n}`;
}

/** up to three chips along a hand card's top edge saying what the card is for; part of the card, so it scales with it */
export function GlanceBadge({ card }: { card: CardDef }) {
  const locale = useGame((s) => s.locale);
  const chips = chipsFor(card);
  if (!chips.length) return null;
  return (
    <span className="glance">
      {chips.map((c, k) => (
        <span key={k} className="glance-chip" title={chipTitle(c, locale)}>
          {isIcon(c.icon) ? <Icon name={c.icon} size={20} title="" /> : <Glyph name={c.icon} size={18} title="" />}
          {c.n !== undefined && <b>{c.plus ? "+" : ""}{c.n}</b>}
        </span>
      ))}
    </span>
  );
}
