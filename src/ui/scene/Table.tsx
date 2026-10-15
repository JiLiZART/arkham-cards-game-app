import { Html, Line, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import { t } from "../../content/i18n";
import type { GameState, InstId } from "../../engine/types";
import { useCardClick } from "../cardClick";
import { iconUrl } from "../icons";
import { Portrait } from "../Portrait";
import { db, useGame } from "../context";
import { CARD_H, CARD_W, footprint, layout, type Placement, type Vec3 } from "../layout";
import { hitRect, type ScreenRect } from "../hit";
import { viewerOf } from "../store";
import { useView } from "../view";
import { CardMesh } from "./CardMesh";
import { EventFx } from "./EventFx";
import { camInput, MapCamera } from "./MapCamera";

/** on-screen rect of a card on the map (set by the scene; the HTML hover overlay uses it) */
export const mapProjector: {
  rect: (id: InstId) => Omit<ScreenRect, "id"> | null;
  /** screen point of an investigator's portrait on the map */
  mini: (inv: string) => { x: number; y: number } | null;
} = { rect: () => null, mini: () => null };

export function handVisible(privacy: boolean, players: number, viewer: string | null, revealedFor: string | null) {
  return !privacy || players <= 1 || (viewer !== null && revealedFor === viewer);
}

/** on-screen rectangle of a placement through the current camera */
export function projectRect(p: Placement, camera: THREE.Camera, box: DOMRect): Omit<ScreenRect, "id"> {
  const f = footprint(p);
  const toScreen = (x: number, z: number) => {
    const v = new THREE.Vector3(x, 0, z).project(camera);
    return [box.left + ((v.x + 1) / 2) * box.width, box.top + ((1 - v.y) / 2) * box.height];
  };
  const [x0, y0] = toScreen(f.x0, f.z0);
  const [x1, y1] = toScreen(f.x1, f.z1);
  return { x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) };
}

/** an investigator's position: a small round portrait on their location card; the deciding investigator can drag it to move */
/** portrait marker: drawn MINI_PX wide in its own space, scaled with the map zoom to about a third of a location's width */
const MINI_PX = 100;

function Mini({ pos, code, active, worldSize, moves, rects, onTap }: { pos: Vec3; code: string; active: boolean; worldSize: number; moves: Record<InstId, string> | null; rects: () => ScreenRect[]; onTap: (x: number, y: number) => void }) {
  const camera = useThree((s) => s.camera);
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
    // the marker is scaled with the zoom: convert the pointer's screen offset into its own space
    const scale = camera.zoom * (worldSize / MINI_PX);
    const move = (ev: PointerEvent) => {
      const over = hitRect(ev.clientX, ev.clientY, all);
      view.setMoveDrag({ inv: code, targets, rects: all, dx: (ev.clientX - x0) / scale, dy: (ev.clientY - y0) / scale, over });
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
      <Html center zIndexRange={[drag ? 60 : 25, 0]} distanceFactor={worldSize / MINI_PX} pointerEvents={moves ? "auto" : "none"}>
        <div
          className={`mini ${moves ? "draggable" : ""} ${drag ? "dragging" : ""}`}
          style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.15)` } : undefined}
          onPointerDown={start}
          title={moves ? t(db, locale, "hud.dragToMove") : undefined}
        >
          <Portrait code={code} size={MINI_PX} active={active} />
        </div>
      </Html>
    </group>
  );
}

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
  const hovered = useView((st) => st.hovered);
  const setHovered = useView((st) => st.setHovered);
  const viewer = viewerOf(game);
  const L = useMemo(() => layout(db, game, viewer), [game, viewer]);
  const { byCard, click: clickCard } = useCardClick();
  const locH = CARD_H * L.locScale;

  // the camera follows the deciding investigator's location
  const decider = game.pending?.inv ?? game.active ?? viewer;
  const deciderLoc = decider ? game.invs[decider]?.location : null;
  const focus = deciderLoc ? (L.cards.get(deciderLoc)?.pos ?? null) : null;

  // Move options of the pending choice (by destination), for dragging the portrait
  const moveTargets = useMemo(() => {
    const m: Record<InstId, string> = {};
    for (const [id, opts] of byCard) for (const o of opts) if ((o.value as { kind?: string } | null)?.kind === "move") m[id] = o.id;
    return Object.keys(m).length ? m : null;
  }, [byCard]);
  const camera = useThree((st) => st.camera);
  const gl = useThree((st) => st.gl);
  // screen rects of the map cards, projected through the current camera
  const cardRects = (): ScreenRect[] => {
    const box = gl.domElement.getBoundingClientRect();
    return [...L.cards.entries()].map(([id, p]) => ({ id, ...projectRect(p, camera, box) }));
  };
  const locationRects = () => cardRects().filter((r) => game.cards[r.id].zone === "location");
  mapProjector.mini = (inv) => {
    const m = L.minis.find((x) => x.inv === inv);
    if (!m) return null;
    const box = gl.domElement.getBoundingClientRect();
    const v = new THREE.Vector3(m.pos[0], 0, m.pos[2]).project(camera);
    return { x: box.left + ((v.x + 1) / 2) * box.width, y: box.top + ((1 - v.y) / 2) * box.height };
  };
  mapProjector.rect = (id) => {
    const p = L.cards.get(id);
    return p ? projectRect(p, camera, gl.domElement.getBoundingClientRect()) : null;
  };
  // dev-only: lets browser automation find a card on the map
  if (import.meta.env.DEV) (window as unknown as { __arkhamRects: unknown }).__arkhamRects = cardRects;
  const moveDrag = useView((st) => st.moveDrag);

  // a press that panned the map is not a click
  const click = (id: InstId, x: number, y: number) => {
    if (camInput.panned) return;
    clickCard(id, x, y);
  };

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 50, 0]} near={0.1} far={200} />
      <MapCamera bounds={L.bounds} locH={locH} focus={focus} focusKey={`${decider}:${deciderLoc}`} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[4, 20, 6]} intensity={0.6} />
      {L.links.map(({ a, b }, k) => (
        <Line key={k} points={[[a[0], -0.25, a[2]], [b[0], -0.25, b[2]]]} color="#4a2e14" lineWidth={2} transparent opacity={0.5} />
      ))}
      <Suspense fallback={null}>
        {L.links.map((l, k) => (
          <Connector key={k} {...l} size={L.connectorSize} />
        ))}
      </Suspense>
      {L.minis.map((m) => (
        <Mini
          key={m.inv}
          pos={m.pos}
          code={m.inv}
          active={game.active === m.inv}
          worldSize={CARD_W * L.locScale * 0.32}
          moves={m.inv === game.pending?.inv ? moveTargets : null}
          rects={locationRects}
          onTap={(x, y) => {
            const at = game.invs[m.inv].location;
            if (at) click(at, x, y);
          }}
        />
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
            exhausted={inst.exhausted && inst.zone === "enemy"}
            onHover={(over) => setHovered(over ? id : useView.getState().hovered === id ? null : useView.getState().hovered)}
            onClick={(e) => {
              e.stopPropagation();
              click(id, e.nativeEvent.clientX, e.nativeEvent.clientY);
            }}
          />
        );
      })}
      <EventFx cards={L.cards} minis={L.minis} />
    </>
  );
}

export function Table() {
  return (
    // transparent canvas: the table background is the page's fixed, full-screen CSS background (it doesn't pan or zoom)
    <Canvas dpr={[1, 2]} gl={{ alpha: true }} onPointerMissed={() => !camInput.panned && useView.getState().closeMenu()}>
      <Scene />
    </Canvas>
  );
}
