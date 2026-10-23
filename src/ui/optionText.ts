import { cardText, t } from "../content/i18n";
import type { ChoiceOption, GameState } from "../engine/types";
import { db } from "./context";

/**
 * The card ability an option uses, by card code and the ability's place on it: a reaction is "card:index", a turn's
 * option { kind: "ability", card, index }, a fast ability during a test carries its ability. Null for anything else.
 */
export function abilityRef(
  o: ChoiceOption,
  game: Pick<GameState, "cards">,
): { code: string; index: number } | null {
  const v = o.value as
    | { kind?: string; card?: string; index?: number; ability?: { card: string; index: number } }
    | string
    | null;
  const m = typeof v === "string" ? /^(.+):(\d+)$/.exec(v) : null;
  const ref = m
    ? { card: m[1], index: +m[2] }
    : typeof v === "object" && v?.kind === "ability"
      ? { card: v.card!, index: v.index! }
      : typeof v === "object" && v?.ability
        ? v.ability
        : null;
  const code = ref && game.cards[ref.card]?.code;
  return code ? { code, index: ref!.index } : null;
}

/**
 * An option's label in the game's language: a card ability's from the strings (`ability.<code>.<index>`), after the card's
 * name in that language when the engine's label names the card ("Roland: discover…" → "Роланд Бэнкс: найти…"); the
 * engine's own label otherwise.
 */
export function optionLabel(
  o: ChoiceOption,
  game: Pick<GameState, "cards">,
  locale: string,
): string {
  // an option with a string of its own (who takes the damage): the card's name in the game's language goes into it
  if (o.key)
    return (
      t(
        db,
        locale,
        o.key,
        o.vars?.code ? { card: cardText(db, String(o.vars.code), locale).name } : {},
      ) + (o.vars?.defeated ? t(db, locale, "option.defeated") : "")
    );
  const ref = abilityRef(o, game);
  if (!ref) return o.label;
  const key = `ability.${ref.code}.${ref.index}`;
  const text = t(db, locale, key);
  if (text === key) return o.label;
  return /^[^:]+: /.test(o.label) ? `${cardText(db, ref.code, locale).name}: ${text}` : text;
}
