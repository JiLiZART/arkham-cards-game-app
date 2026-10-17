import { t } from "../content/i18n";
import type { CardInst } from "../engine/types";
import { db, useGame } from "./context";
import { intentOf } from "./intent";
import { Glyph, Icon } from "./Icon";
import type { IconName } from "./icons";

const TOKEN_ICONS: Record<string, IconName | undefined> = { damage: "damage", horror: "horror", clues: "clue", doom: "doom", resources: "resource" };

/** tokens lying on a card (damage, horror, clues, doom, uses, resources) as icon + number badges */
export function TokenBadges({ inst, size = 26, skip = [] }: { inst: CardInst; size?: number; skip?: string[] }) {
  const tokens = ([
    ["damage", inst.damage],
    ["horror", inst.horror],
    ["clues", inst.clues],
    ["doom", inst.doom],
    ["uses", inst.uses],
    ["resources", inst.resources],
  ] as const).filter(([k, n]) => n > 0 && !skip.includes(k));
  if (!tokens.length) return null;
  return (
    <div className="tokens">
      {tokens.map(([k, n]) =>
        TOKEN_ICONS[k] ? (
          <span key={k} className="tok-icon" title={`${k} ${n}`}>
            <Icon name={TOKEN_ICONS[k]!} size={size} />
            <b>{n}</b>
          </span>
        ) : (
          <span key={k} className={`tok tok-${k}`} title={`${k} ${n}`}>
            <Glyph name="uses" size={12} />
            {n}
          </span>
        ),
      )}
    </div>
  );
}

const INTENT_MARK = { attack: "⚔", hunt: "»", rest: "z", wait: "…" } as const;

/** an enemy's intent for the coming enemy phase: attack (damage, horror), hunt, rest or wait; `words` spells it out (the hover copy) */
export function IntentBadge({ inst, words }: { inst: CardInst; words?: boolean }) {
  const game = useGame((s) => s.game);
  const locale = useGame((s) => s.locale);
  if (inst.zone !== "enemy" || !game?.cards[inst.id] || game.phase === "ended") return null;
  const it = intentOf(game, inst.id);
  const tip = t(db, locale, `intent.${it.kind}`, it.kind === "attack" ? { damage: it.damage, horror: it.horror } : undefined);
  return (
    <span className={`intent ${it.kind} ${words ? "words" : ""}`} title={tip} aria-label={tip}>
      <span>{INTENT_MARK[it.kind]}</span>
      {it.kind === "attack" && (
        <>
          {it.damage > 0 && <><Icon name="damage" size={14} /><b>{it.damage}</b></>}
          {it.horror > 0 && <><Icon name="horror" size={14} /><b>{it.horror}</b></>}
        </>
      )}
      {words && <span className="intent-words">{tip}</span>}
    </span>
  );
}
