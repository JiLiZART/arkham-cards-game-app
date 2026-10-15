import { Html, Line, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import { t } from "../../content/i18n";
import type { ChoiceOption, GameState, InstId } from "../../engine/types";
import { iconUrl } from "../icons";
import { Portrait } from "../Portrait";
import { db, useGame } from "../context";
import { BOARD, CARD_H, CARD_W, footprint, layout, type Pile, type Vec3 } from "../layout";
import { hitRect, type ScreenRect } from "../hit";
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

/** the framed play-area background as the table surface */
function Parchment() {
  const tex = useLoader(THREE.TextureLoader, "/table/table-bg.jpg");
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(BOARD.x0 + BOARD.x1) / 2, -0.3, (BOARD.z0 + BOARD.z1) / 2]} receiveShadow>
      <planeGeometry args={[BOARD_W, BOARD_H]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

/**
 * Fixed top-down orthographic camera, zoomed so the whole board fits the screen area not covered by HUD panels.
 * There are no controls: the view never pans, zooms or rotates.
 */
/** pixels per world unit when the board is fitted into the free screen area */
export function fitZoom(width: number, height: number) {
  const w = Math.max(100, width - SAFE_INSETS.left - SAFE_INSETS.right);
  const h = Math.max(100, height - SAFE_INSETS.top - SAFE_INSETS.bottom);
  return { w, h, zoom: Math.min(w / BOARD_W, h / BOARD_H) };
}

function FittedCamera() {
  const { size, camera } = useThree();
  useLayoutEffect(() => {
    const { w, h, zoom } = fitZoom(size.width, size.height);
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

/** cards in the left scenario strip: clicking one opens the card modal */
const STRIP = new Set(["act", "agenda", "victory", "encounterDiscard"]);

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
      <mesh
        castShadow
        onClick={(e) => {
          // face-up strip piles (encounter discard, victory) open their top card
          if (!pile.faceUp || !pile.top || !STRIP.has(game.cards[pile.top].zone)) return;
          e.stopPropagation();
          useView.getState().setModal({ card: pile.top });
        }}
      >
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

/** an investigator's position: a small round portrait on their location card; the deciding investigator can drag it to move */
function Mini({ pos, code, active, size, moves, rects, onTap }: { pos: Vec3; code: string; active: boolean; size: number; moves: Record<InstId, string> | null; rects: () => ScreenRect[]; onTap: (x: number, y: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  const drag = useView((s) => (s.moveDrag?.inv === code ? s.moveDrag : null));
  const choose = useGame((s) => s.choose);
  const locale = useGame((s) => s.locale);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.x = THREE.MathUtils.damp(g.position.x, pos[0], 6, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, pos[2], 6, dt);
  });
  const start = (e: ReactPointerEvent) => {
    if (!moves || e.button !== 0) return;
    e.stopPropagation();
    const view = useView.getState();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const targets = moves;
    const all = rects().filter((r) => r.id in targets);
    view.setMoveDrag({ inv: code, targets, rects: all, dx: 0, dy: 0, over: null });
    const move = (ev: PointerEvent) => {
      const over = hitRect(ev.clientX, ev.clientY, all);
      view.setMoveDrag({ inv: code, targets, rects: all, dx: ev.clientX - x0, dy: ev.clientY - y0, over });
    };
    const end = (ev: PointerEvent | null) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key);
      view.setMoveDrag(null);
      const over = ev && hitRect(ev.clientX, ev.clientY, all);
      if (over) choose(targets[over]);
      // a tap without dragging is a click on the location underneath
      else if (ev && Math.abs(ev.clientX - x0) < 6 && Math.abs(ev.clientY - y0) < 6) onTap(ev.clientX, ev.clientY);
    };
    const up = (ev: PointerEvent) => end(ev);
    const key = (ev: KeyboardEvent) => ev.key === "Escape" && end(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", key);
  };
  return (
    <group ref={ref} position={pos}>
      <Html center zIndexRange={[drag ? 60 : 25, 0]}>
        <div
          className={`mini ${moves ? "draggable" : ""} ${drag ? "dragging" : ""}`}
          style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.15)` } : undefined}
          onPointerDown={start}
          title={moves ? t(db, locale, "hud.dragToMove") : undefined}
        >
          <Portrait code={code} size={size} active={active} />
        </div>
      </Html>
    </group>
  );
}

/** the chaos bag art lying on the table */
function ChaosBag({ pos, count }: { pos: Vec3; count: number }) {
  const tex = useLoader(THREE.TextureLoader, iconUrl("chaosBag"));
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[BAG_W, BAG_W * (118 / 139)]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
      <Html position={[0, 0, BAG_W * 0.55]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="pile-label" title="Chaos bag">{count}</div>
      </Html>
    </group>
  );
}
const BAG_W = 1.5;

/** a connector plaque midway along a location connection, turned to follow it (the one-way plaque points a → b) */
function Connector({ a, b, oneWay, size }: { a: Vec3; b: Vec3; oneWay: boolean; size: number }) {
  const tex = useLoader(THREE.TextureLoader, iconUrl(oneWay ? "connectorOneWay" : "connectorBoth"));
  tex.colorSpace = THREE.SRGBColorSpace;
  const angle = Math.atan2(b[2] - a[2], b[0] - a[0]);
  return (
    <group position={[(a[0] + b[0]) / 2, 0.04, (a[2] + b[2]) / 2]} rotation={[0, -angle, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size * (60 / 182)]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
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
  // portrait marker: about a third of a location card's width on screen
  const size = useThree((st) => st.size);
  const { zoom } = fitZoom(size.width, size.height);
  const miniPx = Math.round(Math.max(28, Math.min(56, L.locScale * 0.32 * zoom)));

  // options that correspond to a card or location on the table
  const byCard = useMemo(() => {
    const m = new Map<InstId, ChoiceOption[]>();
    if (!game.pending || busy || !visible) return m;
    for (const o of game.pending.options) if (o.card) m.set(o.card, [...(m.get(o.card) ?? []), o]);
    return m;
  }, [game.pending, busy, visible]);

  // Move options of the pending choice (by destination), for dragging the portrait
  const moveTargets = useMemo(() => {
    const m: Record<InstId, string> = {};
    for (const [id, opts] of byCard) for (const o of opts) if ((o.value as { kind?: string } | null)?.kind === "move") m[id] = o.id;
    return Object.keys(m).length ? m : null;
  }, [byCard]);
  const camera = useThree((st) => st.camera);
  const gl = useThree((st) => st.gl);
  // screen rects of the locations, projected through the fixed camera
  const cardRects = (): ScreenRect[] => {
    const box = gl.domElement.getBoundingClientRect();
    const toScreen = (x: number, z: number) => {
      const v = new THREE.Vector3(x, 0, z).project(camera);
      return [box.left + ((v.x + 1) / 2) * box.width, box.top + ((1 - v.y) / 2) * box.height];
    };
    return [...L.cards.entries()].map(([id, p]) => {
        const f = footprint(p);
        const [x0, y0] = toScreen(f.x0, f.z0);
        const [x1, y1] = toScreen(f.x1, f.z1);
      return { id, x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) };
    });
  };
  const locationRects = () => cardRects().filter((r) => game.cards[r.id].zone === "location");
  // dev-only: lets browser automation find a card on the board
  if (import.meta.env.DEV) (window as unknown as { __arkhamRects: unknown }).__arkhamRects = cardRects;
  const moveDrag = useView((st) => st.moveDrag);

  const click = (id: InstId, x: number, y: number) => {
    // scenario-strip cards open at full size, with their options in the modal
    if (STRIP.has(game.cards[id].zone)) return useView.getState().setModal({ card: id });
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
      {L.links.map(({ a, b }, k) => (
        <Line key={k} points={[[a[0], -0.25, a[2]], [b[0], -0.25, b[2]]]} color="#4a2e14" lineWidth={2} transparent opacity={0.5} />
      ))}
      <Suspense fallback={null}>
        {L.links.map((l, k) => (
          <Connector key={k} {...l} size={L.connectorSize} />
        ))}
        <ChaosBag pos={L.chaosBag} count={game.chaosBag.length} />
      </Suspense>
      {L.piles.map((p) => (
        <PileMesh key={p.key} pile={p} game={game} />
      ))}
      {L.minis.map((m) => (
        <Mini key={m.inv} pos={m.pos} code={m.inv} active={game.active === m.inv} size={miniPx} moves={m.inv === game.pending?.inv ? moveTargets : null} rects={locationRects} onTap={(x, y) => { const at = game.invs[m.inv].location; if (at) click(at, x, y); }} />
      ))}
      {[...L.cards.entries()].map(([id, place]) => {
        const inst = game.cards[id];
        return (
          <CardMesh
            key={id}
            inst={inst}
            place={place}
            highlighted={moveDrag ? id in moveDrag.targets : byCard.has(id)}
            hovered={moveDrag ? moveDrag.over === id : hovered === id}
            exhausted={inst.exhausted && ["play", "enemy"].includes(inst.zone)}
            onHover={(over) => setHovered(over ? id : hovered === id ? null : hovered)}
            onClick={(e) => {
              e.stopPropagation();
              click(id, e.nativeEvent.clientX, e.nativeEvent.clientY);
            }}
          />
        );
      })}
      <EventFx encounterDeck={L.piles.find((p) => p.key === "encounterDeck")!.pos} chaosBag={L.chaosBag} cards={L.cards} minis={L.minis} />
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
