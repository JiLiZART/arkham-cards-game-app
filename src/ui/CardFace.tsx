import { useState } from "react";
import { cardText } from "../content/i18n";
import { db } from "./context";
import { cardImage, FACTION_COLORS, faceLines } from "./images";

/** card face: the scan, or a text face drawn from card data when the image can't load; `remote` lets an HTML view link the scans the game does not host */
export function CardFace({
  code,
  locale,
  side = "front",
  remote = false,
}: {
  code: string;
  locale: string;
  side?: "front" | "back";
  remote?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const d = db.cards[code];
  const tx = cardText(db, code, locale);
  const url = cardImage(d, side, locale, { remote });
  if (url && !broken)
    return <img src={url} alt={tx.name} draggable={false} onError={() => setBroken(true)} />;
  const f =
    side === "back"
      ? faceLines(d, "back", tx.backName ?? tx.name, tx.backText ?? "")
      : faceLines(d, "front", tx.name, tx.text);
  return (
    <div className="text-face" style={{ borderTopColor: FACTION_COLORS[d.faction] }}>
      <b>{f.title}</b>
      <small>{f.stats}</small>
      {f.body.map((l, k) => (
        <span key={k}>{l}</span>
      ))}
    </div>
  );
}
