import { useLayoutEffect, useRef, type RefObject } from "react";
import { t } from "../../content/i18n";
import type { GameState, InstId } from "../../engine/types";
import { db, useGame } from "../state/context";
import { blockedRow, cardDetails, placeDetails, type DetailRow } from "../game/details";
import type { Rect } from "../game/hover";
import { Glyph, Icon } from "../components/Icon/index";
import { isIcon } from "../assets/icons";
import { Portrait } from "../components/Portrait/index";
import { mapProjector } from "../scene/Table";
import { TokenPile } from "../components/TokenPile/index";
import { useView } from "../state/view";
import { formatText } from "./Hud";

export const DETAILS_W = 280;

export function Row({ r, locale }: { r: DetailRow; locale: string }) {
  const label = (k: string) => <span className="hd-label">{t(db, locale, k)}</span>;
  switch (r.k) {
    case "name":
      return (
        <div className="hd-name">
          <b className="card-name">{r.name}</b>
          {r.subname && <i> {r.subname}</i>}
        </div>
      );
    case "class":
      return (
        <div>
          {isIcon(r.faction) && <Icon name={r.faction} size={24} />} {r.label}
        </div>
      );
    case "level":
      return (
        <div className="hd-level">
          {Array.from({ length: Math.max(r.xp, 0) }, (_, k) => (
            <span key={k} className="pip" />
          ))}
          <span>{r.label}</span>
        </div>
      );
    case "cost":
      return (
        <div>
          {label("card.cost")}
          <Icon name="resource" size={26} /> <b className="hd-num">{r.cost}</b>
        </div>
      );
    case "traits":
      return <div className="hd-traits">{r.s}</div>;
    case "slots":
    case "icons":
      return (
        <div className="hd-icons">
          {label(r.k === "slots" ? "card.slots" : "card.icons")}
          {(r.k === "slots" ? r.slots : r.icons).map((n, k) => (
            <Icon key={k} name={n} size={28} />
          ))}
        </div>
      );
    case "stats":
      return (
        <div className="hd-icons">
          {r.health !== undefined && (
            <>
              <Icon name="health" size={26} /> <b className="hd-num">{r.health}</b>
            </>
          )}
          {r.sanity !== undefined && (
            <>
              <Icon name="sanity" size={26} /> <b className="hd-num">{r.sanity}</b>
            </>
          )}
        </div>
      );
    case "uses":
      return (
        <div>
          <b className="hd-num">{r.n}</b> {r.label}
        </div>
      );
    case "shroud":
      return (
        <div>
          <span className="hd-label">{r.label}</span>
          <b className="hd-num">{r.n}</b>
          {r.skill && <Icon name={r.skill} size={24} />}
        </div>
      );
    case "clues":
      return (
        <div>
          <span className="hd-label">{r.label}</span>
          {r.now > 0 && <TokenPile kind="clue" value={r.now} size={28} />}
          <b className="hd-num">{r.now}</b>
          {r.printed !== null && (
            <span className="hd-muted" title={r.perInv ? r.perInvLabel : undefined}>
              / {r.printed}
              {r.perInv && <Glyph name="per_investigator" size={18} title={r.perInvLabel} />}
            </span>
          )}
        </div>
      );
    case "victory":
      return <div className="hd-strong">{r.label}.</div>;
    case "connections":
      return (
        <div>
          <span className="hd-label">{r.label}</span>
          <span>{r.names.join(", ")}</span>
        </div>
      );
    case "here":
      return (
        <div>
          <span className="hd-label">{r.label}</span>
          {r.invs.map((i) => (
            <Portrait key={i} code={i} size={30} />
          ))}
          {r.enemies.length > 0 && <b className="hd-enemy">{r.enemies.join(", ")}</b>}
        </div>
      );
    case "enemy":
      return (
        <>
          <div className="hd-icons">
            <span className="hd-label">{r.labels.fight}</span>
            <Icon name="combat" size={24} /> <b className="hd-num">{r.fight}</b>
          </div>
          <div className="hd-icons">
            <span className="hd-label">{r.labels.health}</span>
            <Icon name="health" size={24} /> <b className="hd-num">{r.health}</b>
            {r.perInv && <Glyph name="per_investigator" size={18} title={r.labels.perInv} />}
          </div>
          <div className="hd-icons">
            <span className="hd-label">{r.labels.evade}</span>
            <Icon name="agility" size={24} /> <b className="hd-num">{r.evade}</b>
          </div>
        </>
      );
    case "attack":
      return (
        <div className="hd-icons">
          {label("card.attack")}
          {r.damage > 0 && (
            <>
              <Icon name="damage" size={26} /> <b className="hd-num">{r.damage}</b>
            </>
          )}
          {r.horror > 0 && (
            <>
              <Icon name="horror" size={26} /> <b className="hd-num">{r.horror}</b>
            </>
          )}
        </div>
      );
    case "wounds":
      return (
        <div>
          <span className="hd-label">{r.label}</span>
          <TokenPile kind="damage" value={r.n} size={26} />
          <b className="hd-num">{r.n}</b>
        </div>
      );
    case "blocked":
      return <div className="hd-blocked">{r.text}</div>;
    case "text":
      return <p className="hd-text" dangerouslySetInnerHTML={{ __html: formatText(r.s) }} />;
    case "keywords":
      return (
        <dl className="hd-keywords" aria-label={r.label}>
          {r.items.map((k) => (
            <div key={k.name}>
              <dt>{k.name}</dt>
              <dd>{k.text}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

/** a column of details rows beside a card (right, or left if no room; clamped to the window); never takes the pointer */
export function DetailsColumn({
  rows,
  rect,
  boxRef,
  prefer,
}: {
  rows: DetailRow[];
  rect: Rect;
  boxRef?: RefObject<HTMLDivElement>;
  prefer?: "right" | "left";
}) {
  const locale = useGame((s) => s.locale);
  const own = useRef<HTMLDivElement>(null);
  const ref = boxRef ?? own;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const p = placeDetails(rect, DETAILS_W, el.offsetHeight, innerWidth, innerHeight, prefer);
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
  });
  return (
    <div ref={ref} className="hand-details" style={{ width: DETAILS_W }}>
      {rows.map((r) => (
        <Row key={r.k} r={r} locale={locale} />
      ))}
    </div>
  );
}

/** what the raised hand card is: class, type, level, cost, traits, slots, icons, text; first, why it can't be played if it can't */
export function HandDetails({
  id,
  rect,
  boxRef,
}: {
  id: InstId;
  rect: Rect;
  boxRef?: RefObject<HTMLDivElement>;
}) {
  const locale = useGame((s) => s.locale);
  const game = useGame((s) => s.game) as GameState;
  const [name, ...rest] = cardDetails(db, game.cards[id].code, locale);
  const blocked = blockedRow(db, game, id, locale);
  const rows = blocked ? [name, blocked, ...rest] : [name, ...rest];
  return <DetailsColumn rows={rows} rect={rect} boxRef={boxRef} />;
}

/** what a hovered map location is: shroud, clues, victory, connections, who is there, text (only its back while unrevealed) */
export function LocationDetails({ id }: { id: InstId }) {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  useView((s) => s.camTick); // follow the map as it pans and zooms
  const inst = game.cards[id];
  const rect = mapProjector.rect(id);
  if (!inst || !rect) return null;
  return <DetailsColumn rows={cardDetails(db, inst.code, locale, { inst, game })} rect={rect} />;
}
