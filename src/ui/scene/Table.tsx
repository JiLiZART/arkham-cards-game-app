import { Html, Line, MapControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ChoiceOption, GameState, InstId } from "../../engine/types";
import { FACTION_COLORS } from "../images";
import { db, useGame } from "../context";
import { CARD_H, CARD_W, layout, type Pile, type Vec3 } from "../layout";
import { viewerOf } from "../store";
import { useView } from "../view";
import { CardMesh } from "./CardMesh";
import { EventFx } from "./EventFx";
import { backTexture, useCardTexture } from "./textures";

export function handVisible(privacy: boolean, players: number, viewer: string | null, revealedFor: string | null) {
  return !privacy || players <= 1 || (viewer !== null && revealedFor === viewer);
}

function Felt() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[40, 26]} />
      <meshStandardMaterial color="#1f3a2b" roughness={1} />
    </mesh>
  );
}

function PileMesh({ pile, game }: { pile: Pile; game: GameState }) {
  const top = pile.top ? game.cards[pile.top] : null;
  const card = top ? db.cards[top.code] : null;
  const back = backTexture(pile.kind);
  const front = useCardTexture(card ?? db.cards["01000"] ?? Object.values(db.cards)[0], "front", card?.name ?? "", card?.text ?? "", false);
  const map = pile.faceUp && card ? front : back;
  if (pile.count === 0) {
    return (
      <mesh position={[pile.pos[0], 0, pile.pos[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={pile.scale}>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshBasicMaterial color="#000" transparent opacity={0.18} />
      </mesh>
    );
  }
  const h = Math.min(0.4, 0.01 + pile.count * 0.008);
  return (
    <group position={[pile.pos[0], h / 2, pile.pos[2]]} scale={pile.scale}>
      <mesh castShadow>
        <boxGeometry args={[CARD_W, h, CARD_H]} />
        <meshStandardMaterial attach="material-0" color="#d8cfb5" />
        <meshStandardMaterial attach="material-1" color="#d8cfb5" />
        <meshStandardMaterial attach="material-2" map={map} />
        <meshStandardMaterial attach="material-3" color="#222" />
        <meshStandardMaterial attach="material-4" color="#d8cfb5" />
        <meshStandardMaterial attach="material-5" color="#d8cfb5" />
      </mesh>
      <Html position={[0, h / 2 + 0.05, CARD_H / 2 + 0.15]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="pile-label">
          {pile.label} · {pile.count}
        </div>
      </Html>
    </group>
  );
}

function Mini({ pos, code, active }: { pos: Vec3; code: string; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const d = db.cards[code];
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.x = THREE.MathUtils.damp(g.position.x, pos[0], 6, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, pos[2], 6, dt);
    g.position.y = pos[1] + (active ? 0.1 + Math.sin(performance.now() / 300) * 0.05 : 0);
  });
  return (
    <group ref={ref} position={pos}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.3, 24]} />
        <meshStandardMaterial color={FACTION_COLORS[d.faction]} emissive={active ? "#ffd27a" : "#000"} emissiveIntensity={active ? 0.4 : 0} />
      </mesh>
      <Html position={[0, 0.3, 0]} center zIndexRange={[12, 0]} style={{ pointerEvents: "none" }}>
        <div className="mini-label">{d.name.replace(/"/g, "").split(" ").map((w) => w[0]).join("")}</div>
      </Html>
    </group>
  );
}

function ChaosBag({ pos, count }: { pos: Vec3; count: number }) {
  return (
    <group position={pos}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <sphereGeometry args={[0.55, 24, 16]} />
        <meshStandardMaterial color="#3b2416" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.18, 0.3, 0.3, 16]} />
        <meshStandardMaterial color="#2a190f" />
      </mesh>
      <Html position={[0, 0, 0.9]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="pile-label">Chaos bag · {count}</div>
      </Html>
    </group>
  );
}

/** the canvas has its own React root: it can render once more after the game is cleared */
function Scene() {
  const game = useGame((s) => s.game);
  return game ? <SceneInner game={game} /> : null;
}

function SceneInner({ game }: { game: GameState }) {
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const choose = useGame((s) => s.choose);
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const { hovered, setHovered, openMenu, dragging, setDragging } = useView();
  const viewer = viewerOf(game);
  const visible = handVisible(privacy, game.order.length, viewer, revealedFor);
  const L = useMemo(() => layout(db, game, viewer, visible), [game, viewer, visible]);
  const [dragDy, setDragDy] = useState(0);
  const dragStart = useRef(0);
  const controls = useThree((st) => st.controls) as unknown as { enabled: boolean } | null;
  useEffect(() => {
    // dragging a card must not pan the camera
    if (controls) controls.enabled = !dragging;
  }, [dragging, controls]);

  // options that correspond to a card or location on the table
  const byCard = useMemo(() => {
    const m = new Map<InstId, ChoiceOption[]>();
    if (!game.pending || busy) return m;
    if (!visible && game.order.length > 1 && privacy) return m;
    for (const o of game.pending.options) if (o.card) m.set(o.card, [...(m.get(o.card) ?? []), o]);
    return m;
  }, [game.pending, busy, visible, privacy, game.order.length]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setDragDy((dragStart.current - e.clientY) / 70);
    const up = (e: PointerEvent) => {
      const dy = dragStart.current - e.clientY;
      const play = byCard.get(dragging)?.find((o) => /^Play/.test(o.label));
      if (dy > 90 && play) choose(play.id);
      setDragging(null);
      setDragDy(0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, byCard, choose, setDragging]);

  const click = (id: InstId, x: number, y: number) => {
    const opts = byCard.get(id);
    if (!opts?.length) return;
    if (opts.length === 1) choose(opts[0].id);
    else openMenu(x, y, opts);
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 13.5, 9.8]} fov={52} />
      <MapControls makeDefault enableRotate={false} minDistance={8} maxDistance={30} target={[0, 0, 0.6]} screenSpacePanning={false} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[6, 14, 6]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
      <Felt />
      {L.links.map(([a, b], k) => (
        <Line key={k} points={[[a[0], 0.01, a[2]], [b[0], 0.01, b[2]]]} color="#c9a95c" lineWidth={2} transparent opacity={0.55} />
      ))}
      {L.piles.map((p) => (
        <PileMesh key={p.key} pile={p} game={game} />
      ))}
      {L.minis.map((m) => (
        <Mini key={m.inv} pos={m.pos} code={m.inv} active={game.active === m.inv} />
      ))}
      <ChaosBag pos={L.chaosBag} count={game.chaosBag.length} />
      {[...L.cards.entries()].map(([id, place]) => {
        const inst = game.cards[id];
        const inHand = place.group === "hand";
        return (
          <CardMesh
            key={id}
            inst={inst}
            place={place}
            highlighted={byCard.has(id)}
            hovered={hovered === id}
            exhausted={inst.exhausted && ["play", "enemy"].includes(inst.zone)}
            dragOffset={dragging === id ? Math.max(0, dragDy) : 0}
            onHover={(over) => setHovered(over ? id : hovered === id ? null : hovered)}
            onPointerDown={(e) => {
              if (!inHand || !byCard.get(id)?.some((o) => /^Play/.test(o.label))) return;
              e.stopPropagation();
              dragStart.current = e.nativeEvent.clientY;
              setDragging(id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (dragDy > 0.5) return;
              click(id, e.nativeEvent.clientX, e.nativeEvent.clientY);
            }}
          />
        );
      })}
      <EventFx encounterDeck={L.piles.find((p) => p.key === "encounterDeck")!.pos} cards={L.cards} />
    </>
  );
}

export function Table() {
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 2]} onPointerMissed={() => useView.getState().closeMenu()}>
      <color attach="background" args={["#0d1410"]} />
      <Scene />
    </Canvas>
  );
}
