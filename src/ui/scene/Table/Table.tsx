import { Html, Line, OrthographicCamera } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { heldGame } from "../../game/spotlight";
import { eventFocus } from "../../game/camera";
import { heldCards, needsNext, type QueuedEvent } from "../../state/store";
import * as THREE from "three";
import { t } from "../../../content/i18n";
import type { GameState, InstId } from "../../../engine/types";
import {
  domPlace,
  lastRects,
  mapDealing,
  mapMoving,
  originRect,
  reducedMotion,
  takeArrival,
  type ScreenBox,
} from "../../game/arrivals";
import { useCardClick } from "../../game/cardClick";
import { clearPeek, setMapCardAt, tapCard } from "../../game/touch";
import { iconUrl } from "../../assets/icons";
import { Portrait } from "../../components/Portrait/index";
import { db, gameStore, useGame } from "../../state/context";
import { RESOLVE_BOX } from "../../hud/Reveal";
import { CARD_H, CARD_W, footprint, layout, type Placement, type Vec3 } from "../../game/layout";
import { hitRect, type ScreenRect } from "../../game/hit";
import { introHides } from "../../game/intro";
import { viewerOf } from "../../state/store";
import { useShown } from "../../state/usePlayers";
import { useView } from "../../state/view";
import { CardMesh, SPOT_Y } from "../CardMesh";
import { EventFx } from "../EventFx";
import { camInput, MapCamera } from "../MapCamera";
import { cx } from "../../components/cx";
import styles from "./Table.module.css";

/** on-screen rect of a card on the map (set by the scene; the HTML hover overlay uses it) */
export const mapProjector: {
  rect: (id: InstId) => Omit<ScreenRect, "id"> | null;
  /** screen point of an investigator's portrait on the map */
  mini: (inv: string) => { x: number; y: number } | null;
} = { rect: () => null, mini: () => null };

/** locations are dealt this far apart (ms) */
const DEAL_MS = 250;
const hiddenAll = () => true;

/** on-screen rectangle of a placement through the current camera */
export function projectRect(
  p: Placement,
  camera: THREE.Camera,
  box: DOMRect,
): Omit<ScreenRect, "id"> {
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

function Mini({
  pos,
  code,
  at,
  hidden,
  active,
  dimmed,
  worldSize,
  moves,
  rects,
  onTap,
}: {
  pos: Vec3;
  code: string;
  at: InstId | null;
  hidden: boolean;
  active: boolean;
  dimmed: boolean;
  worldSize: number;
  moves: Record<InstId, string> | null;
  rects: () => ScreenRect[];
  onTap: (x: number, y: number) => void;
}) {
  const camera = useThree((s) => s.camera);
  const ref = useRef<THREE.Group>(null);
  const el = useRef<HTMLDivElement>(null);
  const key = `mini:${code}`;
  useEffect(() => () => void mapMoving.delete(key), [key]);
  const drag = useView((s) => (s.moveDrag?.inv === code ? s.moveDrag : null));
  const choose = useGame((s) => s.choose);
  const locale = useGame((s) => s.locale);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.x = THREE.MathUtils.damp(g.position.x, pos[0], 6, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, pos[2], 6, dt);
    // a location the portrait moves into turns over once it has arrived
    if (Math.abs(g.position.x - pos[0]) + Math.abs(g.position.z - pos[2]) > 0.03)
      mapMoving.add(key);
    else mapMoving.delete(key);
    // a portrait appears on its starting location once that has been dealt and turned over
    if (el.current)
      el.current.style.visibility = hidden || (at && mapDealing.has(at)) ? "hidden" : "";
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
      view.setMoveDrag({
        inv: code,
        targets,
        rects: all,
        dx: (ev.clientX - x0) / scale,
        dy: (ev.clientY - y0) / scale,
        over,
      });
    };
    const end = (ev: PointerEvent | null) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key);
      view.setMoveDrag(null);
      const over = ev && hitRect(ev.clientX, ev.clientY, all);
      if (over) choose(targets[over]);
      // a tap without dragging is a click on the location underneath
      else if (ev && Math.abs(ev.clientX - x0) < 6 && Math.abs(ev.clientY - y0) < 6)
        onTap(ev.clientX, ev.clientY);
    };
    const up = (ev: PointerEvent) => end(ev);
    const key = (ev: KeyboardEvent) => ev.key === "Escape" && end(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", key);
  };
  return (
    <group ref={ref} position={pos}>
      <Html
        center
        zIndexRange={[drag ? 60 : 25, 0]}
        distanceFactor={worldSize / MINI_PX}
        pointerEvents={moves ? "auto" : "none"}
      >
        <div
          ref={el}
          className={cx(
            "mini",
            moves ? styles.draggable : "",
            drag ? "dragging" : "",
            dimmed ? "dimmed" : "",
          )}
          style={
            drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.15)` } : undefined
          }
          onPointerDown={start}
          data-tip={moves ? "move" : undefined}
          title={moves ? t(db, locale, "hud.dragToMove") : undefined}
        >
          <Portrait code={code} size={MINI_PX} active={active} />
        </div>
      </Html>
    </group>
  );
}

/** the dark veil over the map while an event spotlights some of it (fades in and out; never takes the pointer) */
function DimPlane() {
  const on = useView((s) => !!s.spotlight);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    const target = on && !reducedMotion() ? 0.55 : 0;
    // about 150 ms from clear to full
    m.opacity =
      target > m.opacity
        ? Math.min(target, m.opacity + dt * 3.7)
        : Math.max(target, m.opacity - dt * 3.7);
    m.visible = m.opacity > 0.001;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SPOT_Y, 0]} raycast={() => null}>
      <planeGeometry args={[2000, 2000]} />
      <meshBasicMaterial
        ref={mat}
        color="black"
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
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
  const real = useGame((s) => s.game);
  const queue = useGame((s) => s.queue);
  // an enemy whose move hasn't played yet stays where it was
  const game = useMemo(() => (real ? heldGame(real, queue) : null), [real, queue]);
  return game ? <SceneInner game={game} /> : null;
}

function SceneInner({ game }: { game: GameState }) {
  const hovered = useView((st) => st.hovered);
  const setHovered = useView((st) => st.setHovered);
  // the table is drawn for the investigator being looked at (ADR-0004)
  const viewer = useShown();
  const L = useMemo(() => layout(db, game, viewer), [game, viewer]);
  const { byCard, click: clickCard } = useCardClick();
  const locH = CARD_H * L.locScale;

  // the camera follows the deciding investigator's location
  const decider = game.pending?.inv ?? game.active ?? viewerOf(game);
  const deciderLoc = decider ? game.invs[decider]?.location : null;
  // while an event plays, the camera looks at what it is about (the hunter that moves, the enemy that attacks)
  const playing = useView((st) => st.playing) as QueuedEvent | null;
  const eventLoc = eventFocus(playing, game);
  const focusLoc = (eventLoc && L.cards.get(eventLoc) ? eventLoc : null) ?? deciderLoc;
  const focus = focusLoc ? (L.cards.get(focusLoc)?.pos ?? null) : null;
  const focusKey =
    focusLoc === eventLoc && playing
      ? `ev:${playing.logIndex}:${eventLoc}`
      : `${decider}:${deciderLoc}`;

  // Move options of the pending choice (by destination), for dragging the portrait
  const moveTargets = useMemo(() => {
    const m: Record<InstId, string> = {};
    for (const [id, opts] of byCard)
      for (const o of opts)
        if ((o.value as { kind?: string } | null)?.kind === "move") m[id] = o.id;
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
  // cards that just arrived on the map glide in from where they came from (a shown encounter card, a pile, the act panel)
  const known = useRef<Set<InstId> | null>(null);
  const arrivals = useRef(
    new Map<InstId, { from: Vec3; scale: number; hold?: () => boolean; faceDown?: boolean }>(),
  );
  // card ids repeat between games: a new game starts from scratch
  const setup = useGame((st) => st.setup);
  const forSetup = useRef(setup);
  if (forSetup.current !== setup) {
    forSetup.current = setup;
    known.current = null;
    arrivals.current = new Map();
  }
  if (!known.current) {
    // first sight of the map (new or loaded game): everything is simply there
    known.current = new Set(L.cards.keys());
    for (const id of L.cards.keys()) takeArrival(id);
  }
  // a map card gliding in from a screen box: where it starts and at what size
  const glideFrom = (
    o: ScreenBox,
    place: typeof L.cards extends Map<InstId, infer P> ? P : never,
  ) => {
    const box = gl.domElement.getBoundingClientRect();
    const v = new THREE.Vector3(
      ((o.x + o.w / 2 - box.left) / box.width) * 2 - 1,
      -(((o.y + o.h / 2 - box.top) / box.height) * 2 - 1),
      0,
    ).unproject(camera);
    const r = projectRect(place, camera, box);
    return {
      from: [v.x, place.pos[1] + 0.5, v.z] as Vec3,
      scale: place.scale * (o.h / Math.max(1, r.y1 - r.y0)),
    };
  };
  const t0 = performance.now();
  for (const [id, place] of L.cards) {
    if (known.current.has(id)) continue;
    known.current.add(id);
    const a = takeArrival(id);
    if (!a) continue;
    const o = originRect(
      a,
      viewer,
      (pl) => domPlace(pl, RESOLVE_BOX),
      (i) => lastRects.get(i) ?? null,
      innerWidth,
      innerHeight,
    );
    // locations put into play are dealt face down one after another, then turn over if they came in revealed
    const dealt = a.to === "location";
    const shown = a.shown ? () => heldCards(gameStore.getState()).has(id) : null;
    arrivals.current.set(id, {
      ...glideFrom(o, place),
      // an enemy from an encounter card stays hidden until that card has been shown
      hold:
        shown || dealt
          ? () => !!shown?.() || (dealt && performance.now() < t0 + a.batch * DEAL_MS)
          : undefined,
      faceDown: dealt,
    });
  }

  // the scenario introduction: nothing is on the map until its locations are dealt from the act/agenda panel
  const intro = useView((st) => st.intro);
  const hides = introHides(game, intro?.step);
  const dealing = useRef<{ intro: unknown; n: number }>({ intro: null, n: 0 });
  if (intro?.step === "deal" && dealing.current.intro !== intro) {
    dealing.current = { intro, n: dealing.current.n + 1 };
    const o = domPlace("actAgenda", RESOLVE_BOX);
    const starts = new Set(game.order.map((i) => game.invs[i].location));
    const locs = [...L.cards.keys()].filter((id) => game.cards[id].zone === "location");
    // the starting locations first, then the rest in layout order
    [...locs.filter((id) => starts.has(id)), ...locs.filter((id) => !starts.has(id))].forEach(
      (id, k) => {
        arrivals.current.set(id, {
          ...(o
            ? glideFrom(o, L.cards.get(id)!)
            : { from: L.cards.get(id)!.pos, scale: L.cards.get(id)!.scale }),
          hold: () => performance.now() < t0 + k * DEAL_MS,
          faceDown: true,
        });
      },
    );
  }

  // dev-only: lets browser automation find a card on the map
  if (import.meta.env.DEV)
    (window as unknown as { __arkhamRects: unknown }).__arkhamRects = cardRects;
  // a long press finds the card under the finger here (enemies and attachments over the location they sit on)
  setMapCardAt((x, y) => {
    const hit = cardRects().filter((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
    return (hit.find((r) => game.cards[r.id].zone !== "location") ?? hit[0])?.id ?? null;
  });
  const moveDrag = useView((st) => st.moveDrag);
  const spotlight = useView((st) => st.spotlight);

  // a press that panned the map is not a click
  const click = (id: InstId, x: number, y: number) => {
    if (camInput.panned || hides.map) return;
    // at the Tap pace, clicking the card a held event is about continues it
    const g = gameStore.getState();
    if (spotlight?.cards.includes(id) && needsNext(g.current, g.pace, g.drawByHand))
      return g.nextEvent();
    clickCard(id, x, y);
  };

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 50, 0]} near={0.1} far={200} />
      <MapCamera bounds={L.bounds} locH={locH} focus={focus} focusKey={focusKey} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[4, 20, 6]} intensity={0.6} />
      {!hides.map &&
        L.links.map(({ a, b }, k) => (
          <Line
            key={k}
            points={[
              [a[0], -0.25, a[2]],
              [b[0], -0.25, b[2]],
            ]}
            color="#c9c6b8"
            lineWidth={2}
            transparent
            opacity={0.5}
          />
        ))}
      <Suspense fallback={null}>
        {!hides.map && L.links.map((l, k) => <Connector key={k} {...l} size={L.connectorSize} />)}
      </Suspense>
      {L.minis.map((m) => (
        <Mini
          key={m.inv}
          pos={m.pos}
          code={m.inv}
          at={game.invs[m.inv].location}
          hidden={hides.map}
          active={game.active === m.inv}
          dimmed={!!spotlight && !reducedMotion() && !spotlight.invs.includes(m.inv)}
          worldSize={CARD_W * L.locScale * 0.32}
          moves={m.inv === game.pending?.inv ? moveTargets : null}
          rects={locationRects}
          onTap={(x, y) => {
            const at = game.invs[m.inv].location;
            // a finger peeks the marker's location first; a second tap chooses
            if (at) tapCard(at, () => click(at, x, y));
          }}
        />
      ))}
      {[...L.cards.entries()].map(([id, place]) => {
        const inst = game.cards[id];
        const arr = arrivals.current.get(id);
        return (
          <CardMesh
            // dealing restarts every map card from the act/agenda panel
            key={`${id}:${dealing.current.n}`}
            inst={inst}
            place={arr ? { ...place, from: arr.from } : place}
            fromScale={arr?.scale}
            hold={hides.map ? hiddenAll : arr?.hold}
            faceDown={arr?.faceDown}
            spotlit={!!spotlight?.cards.includes(id)}
            highlighted={moveDrag ? id in moveDrag.targets : byCard.has(id)}
            hovered={moveDrag ? moveDrag.over === id : hovered === id}
            exhausted={inst.exhausted && inst.zone === "enemy"}
            onHover={(over) =>
              !hides.map &&
              setHovered(
                over ? id : useView.getState().hovered === id ? null : useView.getState().hovered,
              )
            }
            onClick={(e) => {
              e.stopPropagation();
              const { clientX, clientY } = e.nativeEvent;
              tapCard(id, () => click(id, clientX, clientY));
            }}
          />
        );
      })}
      <DimPlane />
      <EventFx cards={L.cards} minis={L.minis} />
    </>
  );
}

export function Table() {
  return (
    // transparent canvas: the table background is the page's fixed, full-screen CSS background (it doesn't pan or zoom)
    <Canvas
      dpr={[1, 2]}
      gl={{ alpha: true }}
      onPointerMissed={() => {
        if (camInput.panned) return;
        useView.getState().closeMenu();
        clearPeek();
      }}
    >
      <Scene />
    </Canvas>
  );
}
