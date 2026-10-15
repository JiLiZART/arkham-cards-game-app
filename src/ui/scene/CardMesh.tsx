import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { cardText, t } from "../../content/i18n";
import type { CardInst } from "../../engine/types";
import { db, useGame } from "../context";
import { CARD_H, CARD_W, type Placement } from "../layout";
import { Portrait } from "../Portrait";
import { TokenBadges } from "../TokenBadges";
import { useCardTexture } from "./textures";

const edge = new THREE.MeshStandardMaterial({ color: "#d8cfb5", roughness: 0.9 });
const glow = new THREE.MeshBasicMaterial({ color: "#ffcf5a", transparent: true, opacity: 0.85 });
const hoverGlow = new THREE.MeshBasicMaterial({ color: "#8fd3ff", transparent: true, opacity: 0.9 });

const damp = THREE.MathUtils.damp;

export interface CardMeshProps {
  inst: CardInst;
  place: Placement;
  highlighted: boolean;
  hovered: boolean;
  exhausted: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onHover?: (over: boolean) => void;
}

/** one card on the table: eases toward its layout target every frame */
export function CardMesh({ inst, place, highlighted, hovered, exhausted, onClick, onHover }: CardMeshProps) {
  const locale = useGame((s) => s.locale);
  const card = db.cards[inst.code];
  const tr = cardText(db, inst.code, locale);
  const w = place.landscape ? CARD_H : CARD_W;
  const h = place.landscape ? CARD_W : CARD_H;
  // a location's "front" is its revealed side; other cards show their back when face down
  const showFront = card.type === "location" ? inst.revealed : place.faceUp;
  const front = useCardTexture(card, "front", tr.name, tr.text, place.landscape);
  const back = useCardTexture(card, "back", tr.backName ?? tr.name, tr.backText ?? "", place.landscape);
  const geometry = useMemo(() => new THREE.BoxGeometry(w, h, 0.012), [w, h]);
  const materials = useMemo(
    () => [edge, edge, edge, edge, new THREE.MeshStandardMaterial({ map: front, roughness: 0.75 }), new THREE.MeshStandardMaterial({ map: back, roughness: 0.75 })],
    [front, back],
  );
  const group = useRef<THREE.Group>(null);
  const flip = useRef<THREE.Group>(null);
  const started = useRef(false);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g || !flip.current) return;
    if (!started.current) {
      g.position.set(...place.from);
      started.current = true;
    }
    // top-down orthographic view: height only orders overlapping cards, size comes from scale
    const [x, y, z] = place.pos;
    const k = 8;
    g.position.x = damp(g.position.x, x, k, dt);
    g.position.y = damp(g.position.y, y, k, dt);
    g.position.z = damp(g.position.z, z, k, dt);
    // hovering only highlights: the enlarged copy is the HTML hover overlay
    g.scale.setScalar(damp(g.scale.x, place.scale, k, dt));
    g.rotation.x = -Math.PI / 2;
    g.rotation.z = damp(g.rotation.z, place.yaw + (exhausted ? -Math.PI / 2 : 0), k, dt);
    flip.current.rotation.y = damp(flip.current.rotation.y, showFront ? 0 : Math.PI, k, dt);
  });

  return (
    <group ref={group}>
      <group ref={flip}>
        <mesh
          geometry={geometry}
          material={materials}
          castShadow
          onClick={onClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover?.(true);
          }}
          onPointerOut={() => onHover?.(false)}
        />
      </group>
      {(highlighted || hovered) && (
        <mesh position={[0, 0, -0.012]} material={hovered ? hoverGlow : glow}>
          <planeGeometry args={[w + 0.12, h + 0.12]} />
        </mesh>
      )}
      {place.badge && (
        <Html position={[-w / 2 + 0.1, h / 2 - 0.1, 0.03]} zIndexRange={[21, 0]} pointerEvents="none">
          <div className="engaged-badge">
            <Portrait code={place.badge} size={30} title={t(db, locale, "hud.engaged", { name: cardText(db, place.badge, locale).name })} />
          </div>
        </Html>
      )}
      <Html position={[w / 2 - 0.05, h / 2 - 0.05, 0.02]} center zIndexRange={[20, 0]} pointerEvents="none">
        <TokenBadges inst={inst} />
      </Html>
    </group>
  );
}
