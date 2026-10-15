import { useEffect, useState } from "react";
import { cardText } from "../content/i18n";
import { db, useGame } from "./context";
import { cardImage, FACTION_COLORS } from "./images";

const broken = new Set<string>();

export const initials = (name: string) =>
  name
    .replace(/["«»]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3);

/** round investigator portrait cropped from the card art, ringed in the class colour; initials if the art can't load */
export function Portrait({ code, size, active, title }: { code: string; size: number; active?: boolean; title?: string }) {
  const locale = useGame((s) => s.locale);
  const d = db.cards[code];
  const name = cardText(db, code, locale).name;
  const url = cardImage(d, "front");
  const [ok, setOk] = useState(!!url && !broken.has(url));
  useEffect(() => {
    if (!url || broken.has(url)) return setOk(false);
    // probe the image so a failure falls back to initials
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => {
      broken.add(url);
      setOk(false);
    };
    img.src = url;
  }, [url]);
  const ring = FACTION_COLORS[d.faction] ?? "#c9a95c";
  return (
    <div
      className={`portrait ${active ? "active" : ""}`}
      title={title ?? name}
      style={{ width: size, height: size, borderColor: ring, backgroundImage: ok ? `url(${url})` : "none", backgroundColor: ok ? "#333" : ring, fontSize: size * 0.36 }}
    >
      {!ok && <span className="portrait-initials">{initials(name)}</span>}
    </div>
  );
}
