import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGame } from "../state/context";
import { useView } from "../state/view";
import type { Vec3 } from "../game/layout";
import { Icon } from "../components/Icon/index";
import type { IconName } from "../assets/icons";

/** "−2 [damage]" style numbers floating up from a card */
/** matches the HUD's hit streak (hud/Floats HIT_MS plus its start delay) */
const HIT_WAIT_MS = 600;

function FloatingNumber({
  parts,
  at,
  startedAt,
  color,
}: {
  parts: [IconName | null, number][];
  at: Vec3;
  startedAt: number;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = Math.min(1, (performance.now() - startedAt) / 700);
    ref.current?.position.set(at[0], 6, at[2] - Math.max(0, t) * 1.4);
    if (ref.current) ref.current.visible = t >= 0;
  });
  return (
    <group ref={ref}>
      <Html center zIndexRange={[15, 0]} pointerEvents="none">
        <div className="float-num" style={{ color }}>
          {parts.map(([icon, n], k) => (
            <span key={k}>
              −{n}
              {icon && <Icon name={icon} size={30} />}
            </span>
          ))}
        </div>
      </Html>
    </group>
  );
}

/** damage numbers floating up from the map (encounter draws and token reveals are HTML overlays, see hud/Reveal) */
export function EventFx({
  cards,
  minis,
}: {
  cards: Map<string, { pos: Vec3 }>;
  minis: { inv: string; pos: Vec3 }[];
}) {
  const current = useGame((s) => s.current);
  const game = useGame((s) => s.game);
  const started = useRef<{ e: unknown; at: number }>({ e: null, at: 0 });
  // an event plays once the HUD's event player lets it start (a hit from a card: settled, then its streak, then the numbers)
  const playing = useView((s) => s.playing);
  if (!current || !game || playing !== current) return null;
  if (started.current.e !== current) started.current = { e: current, at: performance.now() };
  const at = started.current.at;
  if (current.type === "damage" && current.inv && game.invs[current.inv]) {
    // investigators are not on the board: numbers float up from their portrait on the map
    const p = minis.find((m) => m.inv === current.inv)?.pos;
    const d = current.data as { damage: number; horror: number };
    const parts: [IconName, number][] = [];
    if (d.damage) parts.push(["damage", d.damage]);
    if (d.horror) parts.push(["horror", d.horror]);
    // a hit from a card: the numbers rise once its streak has landed
    const wait = d && current.data?.source ? HIT_WAIT_MS : 0;
    if (p)
      return <FloatingNumber key={at} parts={parts} at={p} startedAt={at + wait} color="#ff8a80" />;
  }
  if (current.type === "enemyDamage" && current.card) {
    const p = cards.get(current.card)?.pos;
    if (p)
      return (
        <FloatingNumber
          key={at}
          parts={[["damage", Number(current.data?.amount)]]}
          at={p}
          startedAt={at}
          color="#ffd27a"
        />
      );
  }
  return null;
}
