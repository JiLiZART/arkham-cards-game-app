import { locales, t } from "../content/i18n";
import { db, gameStore, useGame } from "./context";

/** the language from any screen: a tab per locale (EN | RU), each named in its own tongue; `compact` (phone top bar) is one tab that steps to the next */
export function LangSwitch({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const locale = useGame((s) => s.locale);
  const all = [...locales(db)].sort();
  if (all.length < 2) return null;
  const { setLocale } = gameStore.getState();
  const name = (l: string) => t(db, l, "lang.name");
  if (compact) {
    const next = all[(all.indexOf(locale) + 1) % all.length];
    return (
      <button
        className={`lang-step ${className}`}
        onClick={() => setLocale(next)}
        title={name(next)}
        aria-label={`${t(db, locale, "menu.language")}: ${name(next)}`}
      >
        {locale.toUpperCase()}
      </button>
    );
  }
  return (
    <div
      className={`lang-switch ${className}`}
      role="group"
      aria-label={t(db, locale, "menu.language")}
    >
      {all.map((l) => (
        <button
          key={l}
          lang={l}
          aria-pressed={l === locale}
          title={name(l)}
          aria-label={`${l.toUpperCase()} · ${name(l)}`}
          onClick={() => setLocale(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
