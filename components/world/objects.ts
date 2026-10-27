import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { makeLabel, makeSealTexture, makeStackLabel, GOLD, INK } from "./textures";
import { SEG, type StrandSpec } from "./curtain";

/**
 * Procedural pieces — modelled from the products pictured in the brand deck
 * (amber glass, dark bronze caps, gold foil type), built from lathes and
 * primitives so there are no model files to license or load.
 */

export type Piece = {
  group: THREE.Group;
  strands: StrandSpec[];
  dispose: () => void;
};

type Quality = { transmission: boolean; segments: number };

const disposables: { dispose: () => void }[] = [];
const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

function materials(q: Quality) {
  const amber = keep(
    new THREE.MeshPhysicalMaterial({
      color: q.transmission ? "#9A5320" : "#5A260A",
      roughness: 0.14,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      ior: 1.5,
      transmission: q.transmission ? 0.92 : 0,
      thickness: q.transmission ? 0.55 : 0,
      attenuationColor: new THREE.Color("#3D1604"),
      attenuationDistance: 0.22,
      envMapIntensity: 1.1,
    }),
  );
  const bronze = keep(
    new THREE.MeshStandardMaterial({ color: "#3B2A22", metalness: 0.85, roughness: 0.34, envMapIntensity: 1.2 }),
  );
  const darkGlass = keep(
    new THREE.MeshPhysicalMaterial({ color: "#121010", roughness: 0.08, clearcoat: 1, metalness: 0.1, envMapIntensity: 1.3 }),
  );
  const cream = keep(new THREE.MeshStandardMaterial({ color: "#F4F0E9", roughness: 0.48, metalness: 0 }));
  const black = keep(new THREE.MeshStandardMaterial({ color: "#141212", roughness: 0.35, metalness: 0.1 }));
  const wax = keep(new THREE.MeshStandardMaterial({ color: "#EFE6D4", roughness: 0.75 }));
  return { amber, bronze, darkGlass, cream, black, wax };
}

/** Rows of anchors along a horizontal line, e.g. under a bottle on its side. */
function lineAnchors(len: number, rows: { y: number; z: number }[], nodes: number, rnd: () => number): StrandSpec[] {
  const out: StrandSpec[] = [];
  rows.forEach((r, ri) => {
    const step = SEG * 1.02;
    const n = Math.floor(len / step);
    const x0 = -((n - 1) * step) / 2 + (ri % 2) * step * 0.5;
    for (let i = 0; i < n; i++) {
      out.push({ anchor: new THREE.Vector3(x0 + i * step, r.y, r.z), nodes: nodes + Math.round((rnd() - 0.5) * 6) });
    }
  });
  return out;
}

/** Anchors filling a footprint row by row (upright pieces, seen from the front). */
function footprintAnchors(
  halfWidthAt: (z: number) => number,
  zs: number[],
  y: number,
  nodes: number,
  rnd: () => number,
): StrandSpec[] {
  const out: StrandSpec[] = [];
  zs.forEach((z, ri) => {
    const hw = halfWidthAt(z);
    const step = SEG * 1.02;
    const n = Math.max(1, Math.floor((hw * 2) / step));
    const x0 = -((n - 1) * step) / 2 + (ri % 2) * step * 0.4;
    for (let i = 0; i < n; i++) {
      out.push({ anchor: new THREE.Vector3(x0 + i * step, y, z), nodes: nodes + Math.round((rnd() - 0.5) * 6) });
    }
  });
  return out;
}

/* ─────────────────────────────── Pieces ────────────────────────────── */

function seal(m: ReturnType<typeof materials>, q: Quality, rnd: () => number): Omit<Piece, "dispose"> {
  const g = new THREE.Group();
  const R = 1.08;
  const map = makeSealTexture();
  keep(map);
  // The face is printed paper with foil, as on the deck's roundel: shown
  // unlit so cocoa and gold read exactly; the metal rim carries the sheen.
  const face = keep(new THREE.MeshBasicMaterial({ map, toneMapped: false }));
  const edge = keep(new THREE.MeshStandardMaterial({ color: "#2A160E", roughness: 0.55, metalness: 0.2 }));
  const ring = keep(new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28, envMapIntensity: 1.5 }));
  const disc = new THREE.Mesh(keep(new THREE.CylinderGeometry(R, R, 0.16, q.segments * 2, 1)), [edge, face, edge]);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  g.add(disc);
  const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(R, 0.022, 12, q.segments * 2)), ring);
  rim.position.z = 0.08;
  g.add(rim);
  g.rotation.x = -0.12;

  const strands: StrandSpec[] = [];
  [
    { k: 0.97, z: 0.06 },
    { k: 0.86, z: -0.1 },
  ].forEach((row, ri) => {
    const r = R * row.k;
    const step = SEG * 1.02;
    const n = Math.floor((r * 2 * 0.93) / step);
    const x0 = -((n - 1) * step) / 2 + (ri % 2) * step * 0.5;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * step;
      const y = -Math.sqrt(Math.max(r * r - x * x, 0));
      strands.push({ anchor: new THREE.Vector3(x, y, row.z), nodes: 22 + Math.round((rnd() - 0.5) * 6) + Math.round((1 + y / r) * 4) });
    }
  });
  return { group: g, strands };
}

function rollOn(m: ReturnType<typeof materials>, q: Quality, rnd: () => number): Omit<Piece, "dispose"> {
  const g = new THREE.Group();
  const axis = new THREE.Group(); // modelled upright, laid on its side
  // Body profile (radius, height) — a 10 ml roll-on bottle.
  const body: [number, number][] = [
    [0, -0.95], [0.27, -0.95], [0.3, -0.92], [0.3, 0.62], [0.27, 0.7], [0.21, 0.76], [0.21, 0.86],
  ];
  const bottle = new THREE.Mesh(keep(new THREE.LatheGeometry(body.map(([r, y]) => new THREE.Vector2(r, y)), q.segments)), m.amber);
  bottle.castShadow = true;
  axis.add(bottle);
  const ball = new THREE.Mesh(keep(new THREE.SphereGeometry(0.11, 24, 16)), m.bronze);
  ball.position.y = 0.9;
  axis.add(ball);
  // Cap with fine grooves near the top.
  const cap: [number, number][] = [[0, 0.78], [0.315, 0.78], [0.315, 1.55]];
  for (let k = 0; k < 4; k++) cap.push([0.322, 1.57 + k * 0.05], [0.315, 1.595 + k * 0.05]);
  cap.push([0.31, 1.8], [0.29, 1.83], [0, 1.83]);
  const capMesh = new THREE.Mesh(keep(new THREE.LatheGeometry(cap.map(([r, y]) => new THREE.Vector2(r, y)), q.segments)), m.bronze);
  capMesh.castShadow = true;
  axis.add(capMesh);
  // Gold foil label, wrapping the front of the body.
  const label = makeLabel(
    [
      { text: "svā", size: 128 },
      { text: "CALM", size: 46, font: "sans", spacing: 10, gap: 60 },
      { text: "Lavender · Vetiver · Chamomile", size: 40 },
      { text: "10ml", size: 38 },
    ],
    GOLD,
    1400,
    256,
  );
  keep(label);
  label.center.set(0.5, 0.5);
  label.rotation = -Math.PI / 2;
  const sleeve = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(0.304, 0.304, 1.36, q.segments, 1, true, -0.75, 1.5)),
    keep(new THREE.MeshStandardMaterial({ map: label, transparent: true, metalness: 1, roughness: 0.3, envMapIntensity: 1.5, depthWrite: false })),
  );
  sleeve.position.y = -0.17;
  axis.add(sleeve);

  axis.rotation.z = Math.PI / 2 - 0.06;
  axis.position.x = -0.42;
  g.add(axis);

  const strands = lineAnchors(2.5, [
    { y: -0.29, z: 0.08 },
    { y: -0.27, z: -0.12 },
  ], 24, rnd);
  return { group: g, strands };
}

function candle(m: ReturnType<typeof materials>, q: Quality, rnd: () => number): Omit<Piece, "dispose"> {
  const g = new THREE.Group();
  const R = 0.66;
  const jar: [number, number][] = [
    [0, -0.55], [R - 0.06, -0.55], [R, -0.5], [R, 0.5], [R - 0.03, 0.52], [R - 0.05, 0.5], [R - 0.05, -0.47], [0, -0.47],
  ];
  const jarMesh = new THREE.Mesh(keep(new THREE.LatheGeometry(jar.map(([r, y]) => new THREE.Vector2(r, y)), q.segments)), m.darkGlass);
  jarMesh.castShadow = true;
  g.add(jarMesh);
  const waxTop = new THREE.Mesh(keep(new THREE.CircleGeometry(R - 0.05, q.segments)), m.wax);
  waxTop.rotation.x = -Math.PI / 2;
  waxTop.position.y = 0.38;
  g.add(waxTop);
  const wick = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6)), m.black);
  wick.position.y = 0.44;
  g.add(wick);
  // Flame: a soft teardrop that flickers.
  const flameMat = keep(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; uniform float uTime;
        void main(){ vUv = uv; vec3 p = position; p.x += sin(uTime*7.0 + p.y*6.0) * 0.012 * (p.y + 0.5);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float uTime;
        void main(){ vec2 q = vUv*2.0-1.0; q.y += 0.35; float w = mix(0.55, 0.12, clamp(q.y*0.6+0.4,0.0,1.0));
        float d = length(vec2(q.x/w, q.y*0.75)); float a = smoothstep(1.0, 0.2, d);
        vec3 col = mix(vec3(1.0,0.62,0.18), vec3(1.0,0.97,0.86), smoothstep(0.9,0.1,d));
        a *= 0.92 + 0.08*sin(uTime*13.0); gl_FragColor = vec4(col, a); }`,
    }),
  );
  const flame = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.16, 0.32)), flameMat);
  flame.position.y = 0.6;
  flame.name = "flame";
  g.add(flame);
  const label = makeStackLabel(
    [
      { text: "svā", size: 150 },
      { text: "RETURN TO SELF", size: 30, font: "sans", spacing: 6 },
    ],
    INK,
    "#F3EEE6",
    512,
    420,
  );
  keep(label);
  const sticker = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.58, q.segments, 1, true, -0.55, 1.1)),
    keep(new THREE.MeshStandardMaterial({ map: label, roughness: 0.8 })),
  );
  sticker.position.y = -0.02;
  g.add(sticker);

  const strands = footprintAnchors((z) => Math.sqrt(Math.max(R * R - z * z, 0)) * 0.92, [0.3, -0.05, -0.38], -0.56, 24, rnd);
  return { group: g, strands };
}

function fragrance(m: ReturnType<typeof materials>, q: Quality, rnd: () => number): Omit<Piece, "dispose"> {
  const g = new THREE.Group();
  const body = new THREE.Mesh(keep(new RoundedBoxGeometry(1.02, 1.22, 0.46, 4, 0.09)), m.amber);
  body.castShadow = true;
  g.add(body);
  const collar = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.16, 0.16, 0.08, q.segments)), m.bronze);
  collar.position.y = 0.65;
  g.add(collar);
  const cap = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.2, 0.2, 0.46, q.segments)), m.black);
  cap.position.y = 0.92;
  cap.castShadow = true;
  g.add(cap);
  const label = makeStackLabel(
    [
      { text: "svā", size: 170 },
      { text: "FUNCTIONAL FRAGRANCE", size: 26, font: "sans", spacing: 6 },
    ],
    GOLD,
    null,
    512,
    420,
  );
  keep(label);
  const plate = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(0.74, 0.6)),
    keep(new THREE.MeshStandardMaterial({ map: label, transparent: true, metalness: 1, roughness: 0.3, envMapIntensity: 1.5, depthWrite: false })),
  );
  plate.position.z = 0.232;
  g.add(plate);
  g.rotation.y = -0.18;

  const strands = footprintAnchors(() => 0.44, [0.12, -0.12], -0.62, 26, rnd);
  return { group: g, strands };
}

function handCream(m: ReturnType<typeof materials>, q: Quality, rnd: () => number): Omit<Piece, "dispose"> {
  const g = new THREE.Group();
  const axis = new THREE.Group();
  const L = 1.95;
  const geo = keep(new THREE.CylinderGeometry(0.27, 0.27, L, q.segments, 28, true));
  // Squash toward the crimped end, like a filled tube.
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const t = (y + L / 2) / L; // 0 at crimp, 1 at shoulder
    const k = Math.pow(Math.max(0, 1 - t / 0.55), 1.4);
    p.setX(i, p.getX(i) * (1 + 0.42 * k));
    p.setZ(i, p.getZ(i) * (1 - 0.9 * k));
  }
  geo.computeVertexNormals();
  const tube = new THREE.Mesh(geo, keep(m.cream.clone()));
  (tube.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  tube.castShadow = true;
  axis.add(tube);
  const crimp = new THREE.Mesh(keep(new THREE.BoxGeometry(0.77, 0.12, 0.035)), m.cream);
  crimp.position.y = -L / 2 - 0.04;
  axis.add(crimp);
  const shoulder = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.16, 0.27, 0.12, q.segments)), m.cream);
  shoulder.position.y = L / 2 + 0.06;
  axis.add(shoulder);
  const cap = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.17, 0.17, 0.34, q.segments)), m.black);
  cap.position.y = L / 2 + 0.29;
  cap.castShadow = true;
  axis.add(cap);
  const label = makeLabel(
    [
      { text: "svā", size: 120 },
      { text: "HAND CREAM", size: 40, font: "sans", spacing: 10, gap: 50 },
      { text: "plant-powered", size: 40 },
    ],
    INK,
    1200,
    256,
  );
  keep(label);
  label.center.set(0.5, 0.5);
  label.rotation = -Math.PI / 2;
  const sleeve = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(0.274, 0.274, 1.0, q.segments, 1, true, -0.6, 1.2)),
    keep(new THREE.MeshStandardMaterial({ map: label, transparent: true, roughness: 0.6, depthWrite: false })),
  );
  sleeve.position.y = 0.4;
  axis.add(sleeve);
  axis.rotation.z = -Math.PI / 2 + 0.05;
  axis.position.x = 0.12;
  g.add(axis);

  const strands = lineAnchors(2.2, [
    { y: -0.25, z: 0.08 },
    { y: -0.24, z: -0.12 },
  ], 22, rnd);
  return { group: g, strands };
}

export const BUILDERS = [seal, rollOn, candle, fragrance, handCream];

export function buildPiece(index: number, q: Quality): Piece {
  let s = 977 + index * 131;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const before = disposables.length;
  const m = materials(q);
  const built = BUILDERS[index](m, q, rnd);
  const mine = disposables.splice(before);
  return { ...built, dispose: () => mine.forEach((d) => d.dispose()) };
}
