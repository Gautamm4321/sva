"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { world, emitChime } from "./store";
import { Strands } from "./strands";
import { COLS, makeBotanicalAtlas } from "./botanicals";
import { landscapeFragment, mistFragment, screenVertex, spriteFragment, spriteVertex } from "./shaders";

export type Tier = "high" | "mid" | "low";

const CAM_Z = 7;
const FOV = 40;
const PAPER = new THREE.Color("#EDE6DC");
const HAZE = new THREE.Color("#E9DCC8");
const THREAD = new THREE.Color("#5A4A3C");
const COUNT: Record<Tier, number> = { high: 78, mid: 54, low: 38 };

const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt));

/* ───────────────────────────── Backdrops ──────────────────────────── */

function ScreenQuad({ fragment, order, extra }: { fragment: string; order: number; extra?: Record<string, THREE.IUniform> }) {
  const { size } = useThree();
  const ptr = useRef({ x: 0, y: 0 });
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: screenVertex,
        fragmentShader: fragment,
        depthTest: false,
        depthWrite: false,
        transparent: order > 0,
        uniforms: {
          uRes: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uPointer: { value: new THREE.Vector2() },
          uScroll: { value: 0 },
          uPaper: { value: PAPER },
          ...extra,
        },
      }),
    [fragment, order, extra],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((_, dt) => {
    ptr.current.x = damp(ptr.current.x, world.pointer.x, 1.2, Math.min(dt, 0.25));
    ptr.current.y = damp(ptr.current.y, world.pointer.y, 1.2, Math.min(dt, 0.25));
    const u = mat.uniforms;
    u.uRes.value.set(size.width, size.height);
    u.uTime.value = world.time * (world.reducedMotion ? 0.05 : 1);
    u.uPointer.value.set(world.reducedMotion ? 0 : ptr.current.x, world.reducedMotion ? 0 : ptr.current.y);
    u.uScroll.value = world.scroll;
  });
  return (
    <mesh renderOrder={order} frustumCulled={false} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

const MIST_UNIFORMS = { uOpacity: { value: 0.55 } };

/* ────────────────────────────── Strands ───────────────────────────── */

function Botanicals({ tier }: { tier: Tier }) {
  const { camera, size } = useThree();
  const aspect = size.width / size.height;
  // Rebuild only when the frame shape changes meaningfully.
  const shapeKey = Math.round(aspect * 8) / 8;

  const strands = useMemo(() => {
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    return new Strands(
      COUNT[tier],
      {
        halfH: (z) => (CAM_Z - z) * tan,
        halfW: (z) => (CAM_Z - z) * tan * shapeKey,
        portrait: shapeKey < 0.9,
      },
      1337,
    );
  }, [tier, shapeKey]);

  // Threads: one line segment per link.
  const lines = useMemo(() => {
    const segs = strands.total - strands.strands;
    const g = new THREE.BufferGeometry();
    const a = new THREE.BufferAttribute(new Float32Array(segs * 6), 3);
    a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", a);
    return g;
  }, [strands]);
  const lineMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: THREAD, transparent: true, opacity: 0.55, fog: true }),
    [],
  );

  // Botanical sprites.
  const atlas = useMemo(() => makeBotanicalAtlas(), []);
  const sprites = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute("position", base.attributes.position);
    g.setAttribute("uv", base.attributes.uv);
    const n = strands.sprites.length;
    const pos = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const dir = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const info = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    pos.setUsage(THREE.DynamicDrawUsage);
    dir.setUsage(THREE.DynamicDrawUsage);
    // Draw far sprites first so near ones layer on top.
    const order = strands.sprites
      .map((s, i) => [i, strands.anchor[s.strand * 3 + 2]] as const)
      .sort((a, b) => a[1] - b[1])
      .map(([i]) => i);
    order.forEach((si, k) => {
      const s = strands.sprites[si];
      info.array.set([s.type, s.size, s.spin, 0], k * 4);
    });
    g.setAttribute("aPos", pos);
    g.setAttribute("aDir", dir);
    g.setAttribute("aInfo", info);
    g.instanceCount = n;
    return { geo: g, order };
  }, [strands]);
  const spriteMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: spriteVertex,
        fragmentShader: spriteFragment,
        transparent: true,
        depthWrite: false,
        uniforms: { uAtlas: { value: atlas }, uCols: { value: COLS }, uFocus: { value: CAM_Z }, uHaze: { value: HAZE } },
      }),
    [atlas],
  );
  useEffect(
    () => () => {
      lines.dispose();
      sprites.geo.dispose();
    },
    [lines, sprites],
  );
  useEffect(() => () => (atlas.dispose(), lineMat.dispose(), spriteMat.dispose()), [atlas, lineMat, spriteMat]);

  // Pointer as a ray; its velocity is measured on the z = 0 plane.
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const last = useMemo(() => new THREE.Vector3(), []);
  const vel = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const had = useRef(false);
  const acc = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    ndc.set(world.pointer.x, world.pointer.y);
    ray.setFromCamera(ndc, camera);
    const recent = world.time - world.pointer.lastMove < 0.25;
    let rayO: THREE.Vector3 | null = null;
    if (world.pointer.active && ray.ray.intersectPlane(plane, hit)) {
      if (had.current) vel.lerp(tmp.subVectors(hit, last).divideScalar(Math.max(rawDt, 1e-3)), 0.5);
      last.copy(hit);
      had.current = true;
      if (recent) rayO = ray.ray.origin;
    } else had.current = false;
    if (!recent) vel.multiplyScalar(0.85);

    acc.current += dt;
    const h = 1 / 60;
    let n = 0;
    while (acc.current >= h && n < 3) {
      acc.current -= h;
      n++;
      strands.step(
        { dt: h, time: world.time, rayO, rayD: ray.ray.direction, pVel: vel, radius: 0.55, gust: world.gust, motion: world.reducedMotion ? 0.12 : 1 },
        (i, x, s) => emitChime(i, (x + 6) / 12, s),
      );
      world.gust *= Math.exp(-h / 0.5);
    }
    if (n === 3) acc.current = 0;

    // Upload.
    const P = strands.pos;
    const L = lines.getAttribute("position").array as Float32Array;
    let o = 0;
    for (let i = 0; i < strands.strands; i++) {
      const s0 = strands.start[i], c = strands.count[i];
      for (let j = 1; j < c; j++) {
        const a = (s0 + j - 1) * 3, b = (s0 + j) * 3;
        L[o++] = P[a]; L[o++] = P[a + 1]; L[o++] = P[a + 2];
        L[o++] = P[b]; L[o++] = P[b + 1]; L[o++] = P[b + 2];
      }
    }
    lines.getAttribute("position").needsUpdate = true;

    const SP = sprites.geo.getAttribute("aPos").array as Float32Array;
    const SD = sprites.geo.getAttribute("aDir").array as Float32Array;
    sprites.order.forEach((si, k) => {
      const s = strands.sprites[si];
      const s0 = strands.start[s.strand], c = strands.count[s.strand];
      const a = (s0 + Math.max(s.node - 1, 0)) * 3;
      const b = (s0 + Math.min(s.node + 1, c - 1)) * 3;
      const m = (s0 + s.node) * 3;
      SP[k * 3] = P[m]; SP[k * 3 + 1] = P[m + 1]; SP[k * 3 + 2] = P[m + 2];
      SD[k * 3] = P[b] - P[a]; SD[k * 3 + 1] = P[b + 1] - P[a + 1]; SD[k * 3 + 2] = P[b + 2] - P[a + 2];
    });
    sprites.geo.getAttribute("aPos").needsUpdate = true;
    sprites.geo.getAttribute("aDir").needsUpdate = true;
  });

  return (
    <>
      <lineSegments geometry={lines} material={lineMat} frustumCulled={false} renderOrder={1} />
      <mesh geometry={sprites.geo} material={spriteMat} frustumCulled={false} renderOrder={2} />
    </>
  );
}

/* ───────────────────────────── Camera ─────────────────────────────── */

function CameraRig() {
  const { camera } = useThree();
  const p = useRef({ x: 0, y: 0 });
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.25);
    const m = world.reducedMotion ? 0 : 1;
    p.current.x = damp(p.current.x, world.pointer.x * m, 1.5, d);
    p.current.y = damp(p.current.y, world.pointer.y * m, 1.5, d);
    camera.position.set(p.current.x * 0.35, p.current.y * 0.18 + world.scroll * 1.2, CAM_Z);
    camera.lookAt(p.current.x * 0.1, world.scroll * 0.9, 0);
  });
  return null;
}

/* ────────────────────────── Adaptive quality ──────────────────────── */

function FrameGovernor({ onSlow }: { onSlow: () => void }) {
  const a = useRef({ t: 0, n: 0, strikes: 0, steps: 0, warm: 0 });
  useFrame((_, dt) => {
    const s = a.current;
    s.warm += dt;
    if (s.steps >= 2 || dt > 0.5 || s.warm < 3) return;
    s.t += dt;
    s.n++;
    if (s.t > 2) {
      s.strikes = s.n / s.t < 40 ? s.strikes + 1 : 0;
      if (s.strikes >= 2) {
        s.strikes = 0;
        s.steps++;
        onSlow();
      }
      s.t = 0;
      s.n = 0;
    }
  });
  return null;
}

export function Scene({ tier, onSlow }: { tier: Tier; onSlow: () => void }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.Fog(HAZE, CAM_Z + 0.5, CAM_Z + 9);
    return () => void (scene.fog = null);
  }, [scene]);
  return (
    <>
      <ScreenQuad fragment={landscapeFragment} order={-10} />
      <Botanicals tier={tier} />
      <ScreenQuad fragment={mistFragment} order={10} extra={MIST_UNIFORMS} />
      <CameraRig />
      <FrameGovernor onSlow={onSlow} />
    </>
  );
}

export { FOV, CAM_Z };
