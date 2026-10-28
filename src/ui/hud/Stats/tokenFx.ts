import type { InvId } from "../../../engine/types";
import { iconUrl } from "../../assets/icons";
import { reducedMotion } from "../../game/arrivals";
import styles from "./Stats.module.css";

const DROP_MS = 1000;
const GAP_MS = 160;
/** a big gain or cost moves a few tokens, not a shower */
const MAX_TOKENS = 5;

/** the investigator's resource pile in the stat dock (or the open investigator sheet) */
export const pileEl = (inv: InvId) =>
  document.querySelector<HTMLElement>(
    `[data-inv="${inv}"] [data-testid="token-stack"][data-kind="resource"]`,
  );

/** a loose resource token over the pile, removed when its animation ends */
function looseToken(pile: HTMLElement): HTMLImageElement | null {
  const r = pile.getBoundingClientRect();
  if (!r.width) return null;
  const token = document.createElement("img");
  token.src = iconUrl("resource");
  token.alt = "";
  token.className = styles.tokenFly;
  Object.assign(token.style, {
    left: `${r.x}px`,
    top: `${r.y}px`,
    width: `${r.height}px`,
    height: `${r.height}px`,
  });
  document.body.appendChild(token);
  return token;
}

const animateLoose = (token: HTMLImageElement, frames: Keyframe[], delay: number, easing: string) =>
  token
    .animate(frames, { duration: DROP_MS, delay, easing, fill: "backwards" })
    .finished.catch(() => undefined)
    .finally(() => token.remove());

/** the tokens of the pile jump and glow (a gain has landed) */
export function popPile(pile: HTMLElement, delay: number) {
  for (const img of pile.querySelectorAll("img")) {
    img.animate(
      [
        { transform: "translateY(0) scale(1)", filter: "drop-shadow(0 0 0 var(--lamp))" },
        {
          transform: "translateY(-12px) scale(1.35)",
          filter: "drop-shadow(0 0 14px var(--lamp)) brightness(1.4)",
          offset: 0.35,
        },
        { transform: "translateY(0) scale(1)", filter: "drop-shadow(0 0 0 var(--lamp))" },
      ],
      { duration: 900, delay, easing: "ease-out" },
    );
  }
}

/** resource tokens fall one by one from above the pile and land on it; the pile's tokens jump as the last one lands */
export function playGain(inv: InvId, n: number) {
  const pile = pileEl(inv);
  if (!pile) return;
  if (reducedMotion()) return popPile(pile, 0);
  const count = Math.min(n, MAX_TOKENS);
  for (let k = 0; k < count; k++) {
    const token = looseToken(pile);
    if (!token) return;
    animateLoose(
      token,
      [
        { transform: "translateY(-140px) scale(1.7)", opacity: 0 },
        { opacity: 1, offset: 0.35 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      k * GAP_MS,
      "cubic-bezier(.3,0,.7,1)",
    );
  }
  popPile(pile, DROP_MS + (count - 1) * GAP_MS - 80);
}

/** resource tokens rise from the pile one by one and fade away (a cost paid, or resources lost) */
export function playSpend(pile: HTMLElement, n: number) {
  if (reducedMotion()) return;
  const count = Math.min(n, MAX_TOKENS);
  for (let k = 0; k < count; k++) {
    const token = looseToken(pile);
    if (!token) return;
    animateLoose(
      token,
      [
        { transform: "translateY(0) scale(1)", opacity: 1 },
        { opacity: 1, offset: 0.4 },
        { transform: "translateY(-140px) scale(1.7)", opacity: 0 },
      ],
      k * GAP_MS,
      "cubic-bezier(.3,0,.7,1)",
    );
  }
}
