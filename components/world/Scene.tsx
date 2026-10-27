"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { world, emitChime } from "./store";
import { buildPiece, type Piece } from "./objects";
import { Curtain, SEG } from "./curtain";
import { ATLAS_COLS, INK, PAPER, makeGlyphAtlas, makeLinen } from "./textures";
import { glyphFragment, glyphVertex, shadowFragment, shadowVertex } from "./shaders/glyphs";
import { PIECES } from "@/lib/content";

const PIECE_WORDS = PIECES.map((p) => p.words);

export type Tier = "high" | "mid" | "low";

export const SPACING = 7;
/** Pieces draw closer together for the lineup, like objects gathered on a shelf. */
const LINE_SPACING = 4.3;
const viewK = () => THREE.MathUtils.smoothstep(world.view, 0, 1);
const pieceX = (i: number, k: number) => i * THREE.MathUtils.lerp(SPACING, LINE_SPACING, k);
const PIECE_Y = 1.25;
const WALL_Z = -1.6;
const GLYPH = 0.118;
// Key light: from upper left, in front — shadows fall down and to the right.
const LIGHT_DIR = new THREE.Vector3(0.62, -0.42, -1).normalize();

const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt));

/* ──────────────────────────── Environment ─────────────────────────── */

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    pm.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);
  return null;
}

/* ──────────────────────────── Paper wall ──────────────────────────── */

function Wall() {
  const linen = useMemo(() => {
    const t = makeLinen();
    t.repeat.set(26, 10);
    return t;
  }, []);
  useEffect(() => () => linen.dispose(), [linen]);
  return (
    <>
      <mesh position={[SPACING * 2, -2, WALL_Z]} renderOrder={-10}>
        <planeGeometry args={[110, 44]} />
        <meshBasicMaterial map={linen} toneMapped={false} />
      </mesh>
      <mesh position={[SPACING * 2, -2, WALL_Z + 0.001]} receiveShadow renderOrder={-9}>
        <planeGeometry args={[110, 44]} />
        <shadowMaterial color={INK} opacity={0.26} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

/* ─────────────────────────────── Light ────────────────────────────── */

function KeyLight({ shadowSize }: { shadowSize: number }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const tx = camera.position.x;
    l.target.position.set(tx, 0, WALL_Z);
    l.position.set(tx, 0, WALL_Z).addScaledVector(LIGHT_DIR, -14);
    l.target.updateMatrixWorld();
  });
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    const c = l.shadow.camera;
    c.left = -11;
    c.right = 11;
    c.top = 7;
    c.bottom = -7;
    c.near = 1;
    c.far = 30;
    c.updateProjectionMatrix();
    l.shadow.radius = 9;
    l.shadow.blurSamples = 16;
    l.shadow.bias = -0.0004;
  }, []);
  return (
    <directionalLight
      ref={light}
      intensity={1.25}
      color="#FFF6EA"
      castShadow
      shadow-mapSize-width={shadowSize}
      shadow-mapSize-height={shadowSize}
    />
  );
}

/* ─────────────────────────── Pieces + curtains ────────────────────── */

type Built = { pieces: Piece[]; curtains: Curtain[]; total: number };

function useGlyphGeometry(built: Built) {
  return useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute("position", base.attributes.position);
    geo.setAttribute("uv", base.attributes.uv);
    const n = built.total;
    const pos = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const dir = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const glyph = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    pos.setUsage(THREE.DynamicDrawUsage);
    dir.setUsage(THREE.DynamicDrawUsage);
    let o = 0;
    for (const c of built.curtains) {
      glyph.array.set(c.glyph, o);
      o += c.total;
    }
    geo.setAttribute("aPos", pos);
    geo.setAttribute("aDir", dir);
    geo.setAttribute("aGlyph", glyph);
    geo.instanceCount = n;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(SPACING * 2, 0, 0), 40);
    return geo;
  }, [built]);
}

function Pieces({ tier }: { tier: Tier }) {
  const { camera, size } = useThree();
  const q = useMemo(
    () => ({ transmission: tier === "high", segments: tier === "low" ? 32 : 64 }),
    [tier],
  );

  const built = useMemo<Built>(() => {
    const pieces: Piece[] = [];
    const curtains: Curtain[] = [];
    const lengthScale = tier === "low" ? 0.82 : 1;
    for (let i = 0; i < 5; i++) {
      const p = buildPiece(i, q);
      p.group.position.set(i * SPACING, PIECE_Y, 0);
      p.group.updateMatrixWorld(true);
      // Low tier: shorter strands.
      if (lengthScale !== 1) p.strands.forEach((s) => (s.nodes = Math.max(8, Math.round(s.nodes * lengthScale))));
      const words = PIECE_WORDS[i];
      const c = new Curtain(p.strands, words, 4111 + i * 97);
      c.reset(p.group.matrixWorld);
      pieces.push(p);
      curtains.push(c);
    }
    return { pieces, curtains, total: curtains.reduce((s, c) => s + c.total, 0) };
  }, [q, tier]);

  useEffect(
    () => () => {
      built.pieces.forEach((p) => p.dispose());
    },
    [built],
  );

  const geo = useGlyphGeometry(built);
  useEffect(() => () => geo.dispose(), [geo]);

  const atlas = useMemo(() => makeGlyphAtlas(), []);
  useEffect(() => () => atlas.dispose(), [atlas]);

  const glyphMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glyphVertex,
        fragmentShader: glyphFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uAtlas: { value: atlas },
          uSize: { value: GLYPH },
          uCols: { value: ATLAS_COLS },
          uFocus: { value: 10 },
          uPaper: { value: new THREE.Color(PAPER) },
        },
      }),
    [atlas],
  );
  const shadowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: shadowVertex,
        fragmentShader: shadowFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uLight: { value: LIGHT_DIR.clone() },
          uWall: { value: WALL_Z },
          uSize: { value: GLYPH },
          uInk: { value: new THREE.Color(INK) },
          uOpacity: { value: tier === "low" ? 0.075 : 0.055 },
        },
      }),
    [tier],
  );
  useEffect(() => () => (glyphMat.dispose(), shadowMat.dispose()), [glyphMat, shadowMat]);

  // Pointer → world ray, and pointer velocity measured on the curtain plane.
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const lastHit = useMemo(() => new THREE.Vector3(), []);
  const pVel = useMemo(() => new THREE.Vector3(), []);
  const hadHit = useRef(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const acc = useRef(0);
  const flames = useMemo(() => {
    const out: THREE.ShaderMaterial[] = [];
    built.pieces.forEach((p) =>
      p.group.traverse((o) => {
        if (o.name === "flame") out.push((o as THREE.Mesh).material as THREE.ShaderMaterial);
      }),
    );
    return out;
  }, [built]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const motion = world.reducedMotion ? 0.15 : 1;

    // Gentle float for every piece; spacing eases in for the lineup.
    const k = viewK();
    built.pieces.forEach((p, i) => {
      p.group.position.x = pieceX(i, k);
      p.group.position.y = PIECE_Y + (world.reducedMotion ? 0 : Math.sin(world.time * 0.6 + i * 1.3) * 0.035);
      p.group.updateMatrixWorld(true);
    });
    flames.forEach((f) => (f.uniforms.uTime.value = world.time));

    // Pointer ray.
    ndc.set(world.pointer.x, world.pointer.y);
    ray.setFromCamera(ndc, camera);
    let rayO: THREE.Vector3 | null = null;
    const recent = world.time - world.pointer.lastMove < 0.25;
    if (world.pointer.active && ray.ray.intersectPlane(plane, hit)) {
      if (hadHit.current) {
        tmp.subVectors(hit, lastHit).divideScalar(Math.max(rawDt, 1e-3));
        pVel.lerp(tmp, 0.5);
      }
      lastHit.copy(hit);
      hadHit.current = true;
      if (recent) rayO = ray.ray.origin;
    } else {
      hadHit.current = false;
      pVel.multiplyScalar(0.8);
    }
    if (!recent) pVel.multiplyScalar(0.85);

    // Which curtains need simulating: anything near the camera's view.
    const camX = camera.position.x;
    const halfSpan = (camera.position.z - WALL_Z) * Math.tan(THREE.MathUtils.degToRad(19)) * (size.width / size.height) + 2.5;

    // Fixed 60 Hz steps for stable physics on any display.
    acc.current += dt;
    const h = 1 / 60;
    let steps = 0;
    while (acc.current >= h && steps < 2) {
      acc.current -= h;
      steps++;
      const gust = world.gust;
      built.curtains.forEach((c, i) => {
        const x = pieceX(i, k);
        if (Math.abs(x - camX) > halfSpan + 2) return;
        c.updateAnchors(built.pieces[i].group.matrixWorld);
        c.step(
          {
            dt: h,
            time: world.time,
            rayO,
            rayD: ray.ray.direction,
            pVel,
            radius: 0.34,
            breath: world.breath,
            gust,
            motion,
          },
          (strand, s) => emitChime(i, strand / c.strands, s),
        );
      });
      world.gust *= Math.exp(-h / 0.35);
    }
    if (steps === 2) acc.current = 0;

    // Upload node positions and strand directions.
    const aPos = geo.getAttribute("aPos") as THREE.InstancedBufferAttribute;
    const aDir = geo.getAttribute("aDir") as THREE.InstancedBufferAttribute;
    const P = aPos.array as Float32Array;
    const D = aDir.array as Float32Array;
    let o = 0;
    for (const c of built.curtains) {
      P.set(c.pos, o * 3);
      for (let s = 0; s < c.strands; s++) {
        const s0 = c.start[s], n = c.count[s];
        for (let j = 0; j < n; j++) {
          const a = (s0 + Math.max(j - 1, 0)) * 3;
          const b = (s0 + Math.min(j + 1, n - 1)) * 3;
          const k = (o + s0 + j) * 3;
          D[k] = c.pos[b] - c.pos[a];
          D[k + 1] = c.pos[b + 1] - c.pos[a + 1];
          D[k + 2] = c.pos[b + 2] - c.pos[a + 2];
        }
      }
      o += c.total;
    }
    aPos.needsUpdate = true;
    aDir.needsUpdate = true;
    glyphMat.uniforms.uFocus.value = camera.position.z - 0.15;

    // Lineup labels follow their pieces.
    if (world.view > 0.01) {
      for (let i = 0; i < world.labels.length; i++) {
        const el = world.labels[i];
        if (!el) continue;
        tmp.set(pieceX(i, k), PIECE_Y - 0.4 - 24 * SEG, 0).project(camera);
        const x = (tmp.x * 0.5 + 0.5) * size.width;
        const y = (-tmp.y * 0.5 + 0.5) * size.height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, 0)`;
      }
    }
  });

  return (
    <>
      {built.pieces.map((p, i) => (
        <primitive key={i} object={p.group} />
      ))}
      <mesh geometry={geo} material={shadowMat} frustumCulled={false} renderOrder={-5} />
      <mesh geometry={geo} material={glyphMat} frustumCulled={false} renderOrder={5} />
    </>
  );
}

/* ───────────────────────────── Camera rig ─────────────────────────── */

function CameraRig() {
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const cur = useMemo(() => new THREE.Vector3(), []);
  const curLook = useMemo(() => new THREE.Vector3(), []);
  const ptr = useRef({ x: 0, y: 0 });
  const first = useRef(true);

  useFrame((_, rawDt) => {
    // Exponential damping is stable at any step, so slow devices still settle on time.
    const dt = Math.min(rawDt, 0.25);
    const aspect = size.width / size.height;
    const portrait = aspect < 0.85;
    const k = viewK();
    const cam = camera as THREE.PerspectiveCamera;

    // Hero: one piece, framed like the reel — piece right of centre on wide
    // screens, top of frame on phones (copy sits below).
    const sx = world.slide * SPACING;
    let hx: number, hy: number, hz: number;
    if (portrait) {
      hz = 16.5 * Math.max(1, 0.42 / Math.max(aspect, 0.3));
      hx = sx;
      hy = -0.95;
    } else {
      hz = THREE.MathUtils.clamp(10.2 * (1.55 / Math.min(aspect, 1.9)), 8.6, 11.5);
      hx = sx - 0.75 * Math.min(aspect / 1.6, 1.25);
      hy = 0.25;
    }
    // Lineup: pulled back, panning across all five.
    const lz = portrait ? 15 : 13.5;
    const lx = THREE.MathUtils.lerp(portrait ? 0 : LINE_SPACING * 1.0, portrait ? LINE_SPACING * 4 : LINE_SPACING * 3.0, world.lineup);
    const ly = -0.35;

    target.set(THREE.MathUtils.lerp(hx, lx, k), THREE.MathUtils.lerp(hy, ly, k), 0);
    const z = THREE.MathUtils.lerp(hz, lz, k);

    ptr.current.x = damp(ptr.current.x, world.pointer.x, 1.4, dt);
    ptr.current.y = damp(ptr.current.y, world.pointer.y, 1.4, dt);
    const par = world.reducedMotion ? 0 : 1;
    pos.set(target.x + ptr.current.x * 0.25 * par, target.y + 0.35 + ptr.current.y * 0.14 * par, z);

    if (first.current || world.reducedMotion) {
      cur.copy(pos);
      curLook.copy(target);
      first.current = false;
    } else {
      const a = 1 - Math.exp(-2.1 * dt);
      cur.lerp(pos, a);
      curLook.lerp(target, a);
    }
    cam.position.copy(cur);
    cam.lookAt(curLook);
  });
  return null;
}

/* ────────────────────────── Adaptive quality ──────────────────────── */

function FrameGovernor({ onSlow }: { onSlow: () => void }) {
  const acc = useRef({ t: 0, n: 0, strikes: 0, steps: 0, warm: 0 });
  useFrame((_, dt) => {
    const a = acc.current;
    a.warm += dt;
    if (a.steps >= 2 || dt > 0.5 || a.warm < 3) return; // skip start-up + tab switches
    a.t += dt;
    a.n++;
    if (a.t > 2) {
      a.strikes = a.n / a.t < 40 ? a.strikes + 1 : 0;
      if (a.strikes >= 2) {
        a.strikes = 0;
        a.steps++;
        onSlow();
      }
      a.t = 0;
      a.n = 0;
    }
  });
  return null;
}

/* ─────────────────────────────── Scene ────────────────────────────── */

export function Scene({ tier, onSlow }: { tier: Tier; onSlow: () => void }) {
  return (
    <>
      <Environment />
      <ambientLight intensity={0.25} />
      <KeyLight shadowSize={tier === "high" ? 2048 : 1024} />
      <Wall />
      <Pieces tier={tier} />
      <CameraRig />
      <FrameGovernor onSlow={onSlow} />
    </>
  );
}
