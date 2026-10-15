import { Html, Line, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ChoiceOption, GameState, InstId } from "../../engine/types";
import { FACTION_COLORS } from "../images";
import { db, useGame } from "../context";
import { BOARD, CARD_H, CARD_W, layout, type Pile, type Vec3 } from "../layout";
import { SAFE_INSETS } from "../safeArea";
import { viewerOf } from "../store";
import { useView } from "../view";
import { CardMesh } from "./CardMesh";
import { EventFx } from "./EventFx";
import { backTexture, useCardTexture } from "./textures";

export function handVisible(privacy: boolean, players: number, viewer: string | null, revealedFor: string | null) {
  return !privacy || players <= 1 || (viewer !== null && revealedFor === viewer);
}

const BOARD_W = BOARD.x1 - BOARD.x0;
const BOARD_H = BOARD.z1 - BOARD.z0;

/** the Learn to Play play-area spread as the table surface */
function Parchment() {
  const tex = useLoader(THREE.TextureLoader, "/table/parchment.jpg");
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(BOARD.x0 + BOARD.x1) / 2, -0.03, (BOARD.z0 + BOARD.z1) / 2]} receiveShadow>
      <planeGeometry args={[BOARD_W, BOARD_H]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

/**
 * Fixed top-down orthographic camera, zoomed so the whole board fits the screen area not covered by HUD panels.
 * There are no controls: the view never pans, zooms or rotates.
 */
function FittedCamera() {
  const { size, camera } = useThree();
  useLayoutEffect(() => {
    const w = Math.max(100, size.width - SAFE_INSETS.left - SAFE_INSETS.right);
    const h = Math.max(100, size.height - SAFE_INSETS.top - SAFE_INSETS.bottom);
    const zoom = Math.min(w / BOARD_W, h / BOARD_H);
    // screen offset of the safe rect's centre from the canvas centre, converted to world units
    const dx = SAFE_INSETS.left + w / 2 - size.width / 2;
    const dz = SAFE_INSETS.top + h / 2 - size.height / 2;
    camera.zoom = zoom;
    camera.position.set((BOARD.x0 + BOARD.x1) / 2 - dx / zoom, 50, (BOARD.z0 + BOARD.z1) / 2 - dz / zoom);
    camera.rotation.set(-Math.PI / 2, 0, 0);
    camera.updateProjectionMatrix();
  }, [size, camera]);
  return null;
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
      <Html position={[0, h / 2 + 0.05, CARD_H / 2 + 0.12]} center zIndexRange={[10, 0]}>
        {/* small piles (other players) only show their count; the name is in the tooltip */}
        <div className="pile-label" title={`${pile.label}: ${pile.count}`}>
          {pile.scale >= 1 ? `${pile.label} · ${pile.count}` : pile.count}
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
  const { hovered, setHovered, openMenu } = useView();
  const viewer = viewerOf(game);
  const visible = handVisible(privacy, game.order.length, viewer, revealedFor);
  const L = useMemo(() => layout(db, game, viewer), [game, viewer]);

  // options that correspond to a card or location on the table
  const byCard = useMemo(() => {
    const m = new Map<InstId, ChoiceOption[]>();
    if (!game.pending || busy || !visible) return m;
    for (const o of game.pending.options) if (o.card) m.set(o.card, [...(m.get(o.card) ?? []), o]);
    return m;
  }, [game.pending, busy, visible]);

  const click = (id: InstId, x: number, y: number) => {
    const opts = byCard.get(id);
    if (!opts?.length) return;
    if (opts.length === 1) choose(opts[0].id);
    else openMenu(x, y, opts);
  };

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 50, 0]} near={0.1} far={200} />
      <FittedCamera />
      <ambientLight intensity={1.6} />
      <directionalLight position={[4, 20, 6]} intensity={0.6} castShadow shadow-mapSize={[2048, 2048]} />
      <Suspense fallback={null}>
        <Parchment />
      </Suspense>
      {L.links.map(([a, b], k) => (
        <Line key={k} points={[[a[0], 0.01, a[2]], [b[0], 0.01, b[2]]]} color="#4a2e14" lineWidth={2.5} transparent opacity={0.7} />
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
        return (
          <CardMesh
            key={id}
            inst={inst}
            place={place}
            highlighted={byCard.has(id)}
            hovered={hovered === id}
            exhausted={inst.exhausted && ["play", "enemy"].includes(inst.zone)}
            onHover={(over) => setHovered(over ? id : hovered === id ? null : hovered)}
            onClick={(e) => {
              e.stopPropagation();
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
      <color attach="background" args={["#1a120b"]} />
      <Scene />
    </Canvas>
  );
}
