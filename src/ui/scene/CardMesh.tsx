import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { cardText, t } from "../../content/i18n";
import type { CardInst } from "../../engine/types";
import { db, useGame } from "../state/context";
import { CARD_H, CARD_W, type Placement } from "../game/layout";
import { Portrait } from "../components/Portrait/index";
import { IntentBadge, TokenBadges } from "../components/TokenBadges/index";
import { TokenPile } from "../components/TokenPile/index";
import { mapDealing, mapMoving, mapPending, reducedMotion } from "../game/arrivals";
import { cardFace, cardFrame } from "./cardShape";
import { useCardTexture } from "./textures";
import { moment } from "../hud/SoundLayer";

// DESIGN.md, The Earned Glow Rule: Playable Green frames a legal target, as the hand's rings do; Lamp Glow the card
// under the pointer and the card an event is about
// not tone-mapped: the frame keeps the palette's own colour on the pale map instead of a washed-out one
const frameOf = (color: string) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, toneMapped: false });
const glow = frameOf("#7fe08a");
const hoverGlow = frameOf("#ffd27a");

const damp = THREE.MathUtils.damp;
/** height of the plane that dims the map around a spotlit card (above every card lying on the table) */
export const SPOT_Y = 2;
/** a card turning over: it lifts (grows a little, the camera looks straight down) and turns in 3D (ms) */
export const FLIP_MS = 600;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
/** a portrait still gliding on the map: a location it enters turns over once it has arrived */
const miniMoving = () => [...mapMoving].some((k) => k.startsWith("mini:"));

export interface CardMeshProps {
  inst: CardInst;
  place: Placement;
  highlighted: boolean;
  hovered: boolean;
  exhausted: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onHover?: (over: boolean) => void;
  /** size to start at when flying in (default: its own) */
  fromScale?: number;
  /** keep the card hidden at its start until this turns false (an enemy waits for its encounter card to be shown) */
  hold?: () => boolean;
  /** dealt face down: it glides showing its back, then turns to its side once it has landed */
  faceDown?: boolean;
  /** what the playing event is about: raised above the dimmed map, a little larger, outlined */
  spotlit?: boolean;
}

/** one card on the table: eases toward its layout target every frame */
export function CardMesh({
  inst,
  place,
  highlighted,
  hovered,
  exhausted,
  onClick,
  onHover,
  fromScale,
  hold,
  faceDown,
  spotlit,
}: CardMeshProps) {
  const locale = useGame((s) => s.locale);
  const card = db.cards[inst.code];
  const isLocation = card.type === "location" && inst.zone === "location";
  const tr = cardText(db, inst.code, locale);
  const w = place.landscape ? CARD_H : CARD_W;
  const h = place.landscape ? CARD_W : CARD_H;
  // a location's "front" is its revealed side; other cards show their back when face down
  const showFront = card.type === "location" ? inst.revealed : place.faceUp;
  const front = useCardTexture(card, "front", tr.name, tr.text, place.landscape);
  const back = useCardTexture(
    card,
    "back",
    tr.backName ?? tr.name,
    tr.backText ?? "",
    place.landscape,
  );
  // rounded like the printed cards: a face on each side (the back faces away until the card flips)
  const face = cardFace(w, h);
  const frontMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: front, roughness: 0.75 }),
    [front],
  );
  const backMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: back, roughness: 0.75 }),
    [back],
  );
  const group = useRef<THREE.Group>(null);
  const flip = useRef<THREE.Group>(null);
  const started = useRef(false);
  // the side shown now (true: front) and a running flip
  const shown = useRef(false);
  const tween = useRef<{ t0: number; to: boolean } | null>(null);
  const dealt = useRef(false);
  const frame = useRef<THREE.Mesh>(null);
  // tokens and badges over the card show only once it is on the table the right way up
  const overlays = useRef(new Set<HTMLElement>());
  const overlaysOn = useRef(!faceDown && !hold);
  const overlay = (el: HTMLElement | null) => {
    if (!el) return;
    overlays.current.add(el);
    el.style.visibility = overlaysOn.current ? "" : "hidden";
  };
  useEffect(
    () => () => {
      mapMoving.delete(inst.id);
      mapPending.delete(inst.id);
      mapDealing.delete(inst.id);
    },
    [inst.id],
  );

  useFrame((_, dt) => {
    const g = group.current;
    if (!g || !flip.current) return;
    if (!started.current) {
      g.position.set(...place.from);
      if (fromScale) g.scale.setScalar(fromScale);
      shown.current = faceDown ? false : showFront;
      flip.current.rotation.y = shown.current ? 0 : Math.PI;
      started.current = true;
    }
    const held = !!hold?.();
    g.visible = !held;
    const settled = !held && shown.current === showFront && !tween.current;
    if (settled !== overlaysOn.current) {
      overlaysOn.current = settled;
      for (const el of overlays.current) el.style.visibility = settled ? "" : "hidden";
    }
    if ((held && faceDown) || shown.current !== showFront || tween.current) mapPending.add(inst.id);
    else mapPending.delete(inst.id);
    if (faceDown && !dealt.current && (held || !settled)) mapDealing.add(inst.id);
    else {
      dealt.current = true;
      mapDealing.delete(inst.id);
    }
    if (!g.visible) return;
    // top-down orthographic view: height only orders overlapping cards, size comes from scale
    const [x, y0, z] = place.pos;
    // spotlit: above the dim plane (see Table), and lifted a little unless motion is reduced
    const y = spotlit ? y0 + SPOT_Y + 1 : y0;
    const scale = spotlit && !reducedMotion() ? place.scale * 1.06 : place.scale;
    const moving =
      Math.abs(g.position.x - x) + Math.abs(g.position.z - z) + Math.abs(g.scale.x - scale) > 0.03;
    if (moving) mapMoving.add(inst.id);
    else mapMoving.delete(inst.id);
    const k = 8;
    g.position.x = damp(g.position.x, x, k, dt);
    g.position.y = damp(g.position.y, y, k, dt);
    g.position.z = damp(g.position.z, z, k, dt);
    // hovering only highlights: the enlarged copy is the HTML hover overlay
    g.scale.setScalar(damp(g.scale.x, scale, k, dt));
    g.rotation.x = -Math.PI / 2;
    g.rotation.z = damp(g.rotation.z, place.yaw + (exhausted ? -Math.PI / 2 : 0), k, dt);
    // turning over: a timed lift-and-turn once the card has landed and any portrait moving in has arrived
    const f = flip.current;
    const tw = tween.current;
    if (tw) {
      const t = Math.min(1, (performance.now() - tw.t0) / FLIP_MS);
      const from = tw.to ? Math.PI : 0;
      f.rotation.y = from + ((tw.to ? 0 : Math.PI) - from) * easeInOut(t);
      f.scale.setScalar(1 + 0.14 * Math.sin(Math.PI * t));
      if (t >= 1) {
        shown.current = tw.to;
        tween.current = null;
        f.scale.setScalar(1);
      }
    } else if (shown.current !== showFront && !moving && !miniMoving()) {
      if (reducedMotion()) shown.current = showFront;
      else {
        tween.current = { t0: performance.now(), to: showFront };
        moment("flip", inst.id);
      }
    }
    if (!tween.current) f.rotation.y = shown.current ? 0 : Math.PI;
    // the highlight frame doesn't turn: it waits for the flip to end
    if (frame.current) frame.current.visible = !tween.current;
  });

  return (
    <group ref={group}>
      <group ref={flip}>
        {[0, Math.PI].map((ry) => (
          <mesh
            key={ry}
            geometry={face}
            material={ry ? backMat : frontMat}
            position={[0, 0, ry ? -0.006 : 0.006]}
            rotation={[0, ry, 0]}
            onClick={onClick}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover?.(true);
            }}
            onPointerOut={() => onHover?.(false)}
          />
        ))}
      </group>
      {(highlighted || hovered || spotlit) && (
        <mesh
          ref={frame}
          geometry={cardFrame(w, h)}
          position={[0, 0, 0.001]}
          material={hovered || (spotlit && !highlighted) ? hoverGlow : glow}
        />
      )}
      {place.badge && (
        <Html
          position={[-w / 2 + 0.1, h / 2 - 0.1, 0.03]}
          zIndexRange={[21, 0]}
          pointerEvents="none"
        >
          <div className="engaged-badge" ref={overlay}>
            <Portrait
              code={place.badge}
              size={30}
              title={t(db, locale, "hud.engaged", { name: cardText(db, place.badge, locale).name })}
            />
          </div>
        </Html>
      )}
      <Html
        position={[w / 2 - 0.05, h / 2 - 0.05, 0.02]}
        center
        zIndexRange={[20, 0]}
        pointerEvents="none"
      >
        <div ref={overlay}>
          <TokenBadges inst={inst} skip={isLocation ? ["clues"] : []} />
        </div>
      </Html>
      {inst.zone === "enemy" && (
        <Html position={[-w / 2 + 0.05, -h / 2 + 0.05, 0.02]} zIndexRange={[20, 0]}>
          <div className="map-intent" ref={overlay}>
            <IntentBadge inst={inst} />
          </div>
        </Html>
      )}
      {/* clues on a location: a pile of clue tokens with the total, like the stat bar */}
      {isLocation && inst.clues > 0 && (
        <Html position={[0, -h * 0.12, 0.03]} center zIndexRange={[20, 0]} pointerEvents="none">
          <div
            className="loc-clues"
            ref={overlay}
            title={`${t(db, locale, "stat.clues")} ${inst.clues}`}
          >
            <TokenPile kind="clue" value={inst.clues} size={34} />
            <b>{inst.clues}</b>
          </div>
        </Html>
      )}
    </group>
  );
}
