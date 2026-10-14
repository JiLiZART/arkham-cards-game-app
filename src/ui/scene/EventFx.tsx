import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { cardText } from "../../content/i18n";
import { db, useGame } from "../context";
import { CARD_H, CARD_W, type Vec3 } from "../layout";
import { tokenLabel } from "../tokens";
import { useCardTexture } from "./textures";

/** an encounter card flies off the deck, flips and hovers over the table while it resolves */
function EncounterFlight({ code, from, startedAt }: { code: string; from: Vec3; startedAt: number }) {
  const ref = useRef<THREE.Group>(null);
  const locale = useGame((s) => s.locale);
  const card = db.cards[code];
  const tr = cardText(db, code, locale);
  const tex = useCardTexture(card, "front", tr.name, tr.text, false);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const t = Math.min(1, (performance.now() - startedAt) / 700);
    const e = 1 - (1 - t) ** 3;
    g.position.set(from[0] * (1 - e), 0.3 + e * 3.2 + Math.sin(t * Math.PI) * 1.5, from[2] * (1 - e) + e * 1.2);
    g.rotation.set(-Math.PI / 2 + e * 0.9, 0, 0);
    g.children[0].rotation.y = Math.PI * (1 - e);
    g.scale.setScalar(1 + e * 1.1);
  });
  return (
    <group ref={ref}>
      <group>
        <mesh>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshBasicMaterial map={tex} side={THREE.FrontSide} />
        </mesh>
        <mesh rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshBasicMaterial color="#3a2448" />
        </mesh>
      </group>
    </group>
  );
}

/** a chaos token rises out of the bag */
function TokenPop({ token, at, startedAt }: { token: string; at: Vec3; startedAt: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const t = Math.min(1, (performance.now() - startedAt) / 500);
    const e = 1 - (1 - t) ** 3;
    g.position.set(at[0] - e * 2.5, 1 + e * 3, at[2] + e * 2.5);
    g.rotation.set(Math.PI / 2 - e * 0.9, e * Math.PI * 4, 0);
  });
  const bad = token === "autoFail" || token.startsWith("-");
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[0.45, 0.45, 0.08, 32]} />
        <meshStandardMaterial color={token === "elderSign" ? "#2d6fb3" : bad ? "#5a1d1d" : "#d8cfb5"} metalness={0.2} roughness={0.5} />
      </mesh>
      <Html center position={[0, 0.1, 0]} zIndexRange={[14, 0]} style={{ pointerEvents: "none" }}>
        <div className="token-pop">{tokenLabel(token)}</div>
      </Html>
    </group>
  );
}

/** "-2 ❤" style numbers floating up from a card */
function FloatingNumber({ text, at, startedAt, color }: { text: string; at: Vec3; startedAt: number; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = Math.min(1, (performance.now() - startedAt) / 700);
    ref.current?.position.set(at[0], 0.5 + t * 1.6, at[2] - t * 0.6);
  });
  return (
    <group ref={ref}>
      <Html center zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
        <div className="float-num" style={{ color }}>{text}</div>
      </Html>
    </group>
  );
}

export function EventFx({ encounterDeck, cards }: { encounterDeck: Vec3; cards: Map<string, { pos: Vec3 }> }) {
  const current = useGame((s) => s.current);
  const game = useGame((s) => s.game);
  const started = useRef<{ e: unknown; at: number }>({ e: null, at: 0 });
  if (!current || !game) return null;
  if (started.current.e !== current) started.current = { e: current, at: performance.now() };
  const at = started.current.at;
  if (current.type === "encounter" && current.card && game.cards[current.card]) {
    return <EncounterFlight key={at} code={game.cards[current.card].code} from={encounterDeck} startedAt={at} />;
  }
  if (current.type === "damage" && current.inv && game.invs[current.inv]) {
    const p = cards.get(game.invs[current.inv].cardId)?.pos;
    const d = current.data as { damage: number; horror: number };
    const text = [d.damage ? `−${d.damage} ❤` : "", d.horror ? `−${d.horror} 🧠` : ""].filter(Boolean).join("  ");
    if (p) return <FloatingNumber key={at} text={text} at={p} startedAt={at} color="#ff8a80" />;
  }
  if (current.type === "enemyDamage" && current.card) {
    const p = cards.get(current.card)?.pos;
    if (p) return <FloatingNumber key={at} text={`−${String(current.data?.amount)}`} at={p} startedAt={at} color="#ffd27a" />;
  }
  if (current.type === "token") return <TokenPop key={at} token={String(current.data?.token)} at={[8.0, 0, -7.4]} startedAt={at} />;
  return null;
}
