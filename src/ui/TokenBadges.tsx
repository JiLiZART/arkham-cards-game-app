import type { CardInst } from "../engine/types";
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
