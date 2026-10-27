"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { world, emitChime } from "./store";

/**
 * Over the hero photograph: low mist drifting through the valleys (like the
 * cloud layers on the Zhai Farms hero) and a few petals — chamomile and
 * lavender, the CALM notes — floating in real depth. Petals part around the
 * cursor and settle back. Transparent canvas: the photo shows through.
 */

export type Tier = "high" | "mid" | "low";
export const FOV = 40;
export const CAM_Z = 7;
const COUNT: Record<Tier, number> = { high: 150, mid: 90, low: 55 };

const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt));

/* ──────────────────────────────── Mist ────────────────────────────── */

const NOISE = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}`;

const mistFragment = /* glsl */ `
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uScroll;
varying vec2 vUv;
${NOISE}
void main() {
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y);
  float t = uTime;
  // Two banks of low cloud moving at different speeds (parallax with the pointer).
  float a = fbm(p * vec2(1.3, 3.2) + vec2(t * 0.018, 0.0) + uPointer * 0.03);
  float b = fbm(p * vec2(2.4, 5.5) + vec2(-t * 0.011, t * 0.002) + uPointer * 0.07 + 9.0);
  float low = smoothstep(0.62, 0.18, uv.y + uScroll * 0.2);     // valley band
  float high = smoothstep(0.75, 1.05, uv.y) * 0.35;             // a veil at the top
  float m = smoothstep(0.42, 0.8, a * 0.62 + b * 0.38) * (low + high);
  gl_FragColor = vec4(vec3(0.97, 0.95, 0.92), m * 0.62);
}`;

const screenVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function Mist() {
  const { size } = useThree();
  const ptr = useRef({ x: 0, y: 0 });
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: screenVertex,
        fragmentShader: mistFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uRes: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uPointer: { value: new THREE.Vector2() },
          uScroll: { value: 0 },
        },
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.25);
    ptr.current.x = damp(ptr.current.x, world.pointer.x, 1.2, d);
    ptr.current.y = damp(ptr.current.y, world.pointer.y, 1.2, d);
    const u = mat.uniforms;
    u.uRes.value.set(size.width, size.height);
    u.uTime.value = world.time * (world.reducedMotion ? 0.04 : 1);
    u.uPointer.value.set(ptr.current.x, ptr.current.y);
    u.uScroll.value = world.scroll;
  });
  return (
    <mesh renderOrder={10} frustumCulled={false} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/* ─────────────────────────────── Petals ───────────────────────────── */

const ATLAS_COLS = 2;
const CELL = 128;

/** Petal textures, drawn small and soft so they read as photographed. */
function makePetalAtlas() {
  const c = document.createElement("canvas");
  c.width = c.height = ATLAS_COLS * CELL;
  const g = c.getContext("2d")!;
  const at = (i: number) => [(i % ATLAS_COLS) * CELL + CELL / 2, Math.floor(i / ATLAS_COLS) * CELL + CELL / 2] as const;

  // 0, 1: chamomile petals — white, translucent tip, fine veins, slight curl.
  for (const i of [0, 1]) {
    const [x, y] = at(i);
    g.save();
    g.translate(x, y);
    g.rotate(i ? 0.25 : -0.1);
    const w = i ? 15 : 12;
    const grd = g.createLinearGradient(0, -52, 0, 52);
    grd.addColorStop(0, "rgba(255,255,252,0.92)");
    grd.addColorStop(0.75, "rgba(250,247,240,0.98)");
    grd.addColorStop(1, "rgba(236,226,200,1)");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, 54);
    g.bezierCurveTo(w * 1.2, 30, w * 1.4, -38, w * 0.35, -52);
    g.quadraticCurveTo(0, -56, -w * 0.35, -52);
    g.bezierCurveTo(-w * 1.4, -38, -w * 1.2, 30, 0, 54);
    g.fill();
    g.strokeStyle = "rgba(190,180,160,0.35)";
    g.lineWidth = 0.8;
    for (const k of [-0.45, 0, 0.45]) {
      g.beginPath();
      g.moveTo(k * w * 0.4, 48);
      g.quadraticCurveTo(k * w * 0.9, 0, k * w * 0.6, -46);
      g.stroke();
    }
    g.restore();
  }
  // 2: lavender bud — tiny, violet, darker at the base.
  {
    const [x, y] = at(2);
    const grd = g.createLinearGradient(x, y - 40, x, y + 40);
    grd.addColorStop(0, "#A493C6");
    grd.addColorStop(1, "#5E4B86");
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(x, y, 20, 40, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.beginPath();
    g.ellipse(x - 6, y - 12, 6, 14, -0.2, 0, Math.PI * 2);
    g.fill();
  }
  // 3: pollen / light mote — a soft warm point.
  {
    const [x, y] = at(3);
    const grd = g.createRadialGradient(x, y, 0, x, y, 50);
    grd.addColorStop(0, "rgba(255,240,205,1)");
    grd.addColorStop(0.4, "rgba(255,226,170,0.45)");
    grd.addColorStop(1, "rgba(255,226,170,0)");
    g.fillStyle = grd;
    g.fillRect(x - 64, y - 64, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return t;
}

const petalVertex = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aRot;  // angle, flip (-1..1), type, size
uniform float uCols;
uniform float uFocus;
varying vec2 vUv;
varying float vBlur;
varying float vShade;
void main() {
  vec4 vp = viewMatrix * vec4(aPos, 1.0);
  float c = cos(aRot.x), s = sin(aRot.x);
  vec2 q = position.xy * vec2(max(abs(aRot.y), 0.12), 1.0);   // flutter: the petal turns edge-on
  vp.xy += mat2(c, s, -s, c) * q * aRot.w;
  gl_Position = projectionMatrix * vp;
  vec2 cell = vec2(mod(aRot.z, uCols), floor(aRot.z / uCols));
  vUv = (cell + vec2(uv.x, 1.0 - uv.y)) / uCols;
  vUv.y = 1.0 - vUv.y;
  vBlur = clamp(abs(-vp.z - uFocus) * 0.38, 0.0, 1.0);
  vShade = 0.82 + 0.18 * abs(aRot.y);                            // facing the light = brighter
}`;

const petalFragment = /* glsl */ `
uniform sampler2D uAtlas;
varying vec2 vUv;
varying float vBlur;
varying float vShade;
void main() {
  vec4 t = texture2D(uAtlas, vUv, vBlur * 3.0);
  float a = t.a * (1.0 - vBlur * 0.55);
  if (a < 0.02) discard;
  gl_FragColor = vec4(t.rgb * vShade, a);
}`;

type P = { x: number; y: number; z: number; vx: number; vy: number; vz: number; ox: number; oy: number; ph: number; spin: number; type: number; size: number; fall: number };

function Petals({ tier }: { tier: Tier }) {
  const { camera, size } = useThree();
  const n = COUNT[tier];
  const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  const petals = useMemo<P[]>(() => {
    let s = 4242;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    return Array.from({ length: n }, () => {
      const z = -3 + r() * 5.2;
      const hh = (CAM_Z - z) * tan;
      const roll = r();
      const type = roll < 0.55 ? (roll < 0.3 ? 0 : 1) : roll < 0.8 ? 2 : 3;
      const base = type === 3 ? 0.06 : type === 2 ? 0.09 : 0.2;
      return {
        x: (r() * 2 - 1) * hh * 2,
        y: (r() * 2 - 1) * hh,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        ox: 0,
        oy: 0,
        ph: r() * Math.PI * 2,
        spin: (r() - 0.5) * 1.6,
        type,
        size: base * (0.7 + r() * 0.6),
        fall: 0.12 + r() * 0.16,
      };
    });
  }, [n, tan]);

  const atlas = useMemo(() => makePetalAtlas(), []);
  const geo = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute("position", base.attributes.position);
    g.setAttribute("uv", base.attributes.uv);
    const pos = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const rot = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    pos.setUsage(THREE.DynamicDrawUsage);
    rot.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aPos", pos);
    g.setAttribute("aRot", rot);
    g.instanceCount = n;
    return g;
  }, [n]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: petalVertex,
        fragmentShader: petalFragment,
        transparent: true,
        depthWrite: false,
        uniforms: { uAtlas: { value: atlas }, uCols: { value: ATLAS_COLS }, uFocus: { value: CAM_Z - 0.6 } },
      }),
    [atlas],
  );
  useEffect(() => () => (geo.dispose(), mat.dispose(), atlas.dispose()), [geo, mat, atlas]);

  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const lastNdc = useRef({ x: 0, y: 0, t: 0 });
  const order = useMemo(() => petals.map((_, i) => i).sort((a, b) => petals[a].z - petals[b].z), [petals]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = world.time;
    const motion = world.reducedMotion ? 0.08 : 1;
    const aspect = size.width / size.height;

    ndc.set(world.pointer.x, world.pointer.y);
    ray.setFromCamera(ndc, camera);
    const L = lastNdc.current;
    const speed = Math.hypot(world.pointer.x - L.x, world.pointer.y - L.y) / Math.max(dt, 1e-3);
    L.x = world.pointer.x;
    L.y = world.pointer.y;
    const live = world.pointer.active && t - world.pointer.lastMove < 0.3;
    const o = ray.ray.origin, d = ray.ray.direction;

    for (const p of petals) {
      const hh = (CAM_Z - p.z) * tan;
      const hw = hh * aspect;
      // Drift: a slow fall, a sideways breeze, a little lift and flutter.
      p.y -= p.fall * dt * motion;
      p.x += (Math.sin(t * 0.35 + p.ph) * 0.12 + 0.05) * dt * motion;
      if (p.y < -hh - 0.4) {
        p.y = hh + 0.4;
        p.x = (Math.random() * 2 - 1) * hw;
      }
      if (p.x > hw + 0.5) p.x = -hw - 0.5;
      if (p.x < -hw - 0.5) p.x = hw + 0.5;

      // Pointer: petals near the ray are pushed aside, then ease back.
      if (live) {
        const px = p.x + p.ox - o.x, py = p.y + p.oy - o.y, pz = p.z - o.z;
        const tt = px * d.x + py * d.y + pz * d.z;
        const qx = px - d.x * tt, qy = py - d.y * tt;
        const dist = Math.hypot(qx, qy);
        const R = 0.9;
        if (dist < R) {
          const f = (1 - dist / R) ** 2 * (1.5 + Math.min(speed, 6) * 0.6);
          p.vx += (qx / (dist + 1e-4)) * f * dt * 6;
          p.vy += (qy / (dist + 1e-4)) * f * dt * 6;
          p.vz += f * dt * 0.8;
          if (f > 1.2 && p.type < 3) emitChime(0, (world.pointer.x + 1) / 2, Math.min(1, f / 4));
        }
      }
      p.vx *= Math.exp(-dt * 2.2);
      p.vy *= Math.exp(-dt * 2.2);
      p.vz *= Math.exp(-dt * 2.2);
      p.ox = damp(p.ox + p.vx * dt, 0, 0.6, dt);
      p.oy = damp(p.oy + p.vy * dt, 0, 0.6, dt);
    }

    const pos = geo.getAttribute("aPos").array as Float32Array;
    const rot = geo.getAttribute("aRot").array as Float32Array;
    order.forEach((i, k) => {
      const p = petals[i];
      pos[k * 3] = p.x + p.ox;
      pos[k * 3 + 1] = p.y + p.oy;
      pos[k * 3 + 2] = p.z;
      rot[k * 4] = p.ph + t * p.spin * motion;
      rot[k * 4 + 1] = Math.cos(t * (0.9 + Math.abs(p.spin)) * motion + p.ph);
      rot[k * 4 + 2] = p.type;
      rot[k * 4 + 3] = p.size;
    });
    geo.getAttribute("aPos").needsUpdate = true;
    geo.getAttribute("aRot").needsUpdate = true;
  });

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

/* ───────────────────────────── Camera ─────────────────────────────── */

function CameraRig() {
  const { camera } = useThree();
  const p = useRef({ x: 0, y: 0 });
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.25);
    const m = world.reducedMotion ? 0 : 1;
    p.current.x = damp(p.current.x, world.pointer.x * m, 1.4, d);
    p.current.y = damp(p.current.y, world.pointer.y * m, 1.4, d);
    camera.position.set(p.current.x * 0.4, p.current.y * 0.22, CAM_Z);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

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
  return (
    <>
      <Petals tier={tier} />
      <Mist />
      <CameraRig />
      <FrameGovernor onSlow={onSlow} />
    </>
  );
}
