import * as THREE from "three";
import { BEAD_CHAMOMILE, BEAD_LAVENDER, BEAD_VETIVER, GLYPH_SPACE, glyphIndex } from "./textures";

/**
 * A curtain of hanging strands — each a verlet chain whose nodes carry one
 * glyph of the piece's words. Simulated on the CPU (a few thousand nodes),
 * rendered as instanced glyph quads.
 */

export const SEG = 0.1; // node spacing = glyph pitch
const GRAVITY = -9.8;
const DAMPING = 0.986;
const ITER = 4;

export type StrandSpec = { anchor: THREE.Vector3; nodes: number };

export type SimInput = {
  dt: number;
  time: number;
  /** Pointer ray in world space (or null when the pointer is idle). */
  rayO: THREE.Vector3 | null;
  rayD: THREE.Vector3;
  /** Pointer velocity in world units/s, measured at the curtain's depth. */
  pVel: THREE.Vector3;
  radius: number;
  breath: number;
  gust: number;
  motion: number;
};

export class Curtain {
  readonly strands: number;
  readonly total: number;
  /** Node offset of each strand in the flat arrays. */
  readonly start: Int32Array;
  readonly count: Int32Array;
  readonly pos: Float32Array;
  readonly prev: Float32Array;
  readonly glyph: Float32Array;
  readonly anchorsLocal: Float32Array;
  readonly anchors: Float32Array;
  readonly center = new THREE.Vector3();
  /** Per-strand cooldown for chimes. */
  private chimeAt: Float32Array;
  private phase: Float32Array;
  awake = 0; // seconds of recent activity; 0 = sleeping (skip sim)

  constructor(specs: StrandSpec[], words: string[], seed: number) {
    this.strands = specs.length;
    this.start = new Int32Array(this.strands);
    this.count = new Int32Array(this.strands);
    let total = 0;
    specs.forEach((s, i) => {
      this.start[i] = total;
      this.count[i] = s.nodes;
      total += s.nodes;
    });
    this.total = total;
    this.pos = new Float32Array(total * 3);
    this.prev = new Float32Array(total * 3);
    this.glyph = new Float32Array(total);
    this.anchorsLocal = new Float32Array(this.strands * 3);
    this.anchors = new Float32Array(this.strands * 3);
    this.chimeAt = new Float32Array(this.strands);
    this.phase = new Float32Array(this.strands);

    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

    // A continuous ribbon of text, read top-to-bottom, strand after strand.
    const text = words.join(" · ") + " · ";
    let cursor = Math.floor(rnd() * text.length);
    const beads = [BEAD_LAVENDER, BEAD_CHAMOMILE, BEAD_VETIVER];

    specs.forEach((sp, i) => {
      sp.anchor.toArray(this.anchorsLocal, i * 3);
      this.phase[i] = rnd() * Math.PI * 2;
      const n = sp.nodes;
      for (let j = 0; j < n; j++) {
        const k = this.start[i] + j;
        let g: number;
        if (j === n - 1 && rnd() < 0.55) g = beads[Math.floor(rnd() * 3)];
        else {
          g = glyphIndex(text[cursor % text.length]);
          cursor++;
        }
        this.glyph[k] = g;
      }
      // Skip ahead a little so neighbouring strands don't read as one line.
      cursor += 3 + Math.floor(rnd() * 9);
    });
  }

  /** Lay strands straight down from their (world) anchors. */
  reset(matrix: THREE.Matrix4) {
    this.updateAnchors(matrix);
    for (let i = 0; i < this.strands; i++) {
      const ax = this.anchors[i * 3], ay = this.anchors[i * 3 + 1], az = this.anchors[i * 3 + 2];
      for (let j = 0; j < this.count[i]; j++) {
        const k = (this.start[i] + j) * 3;
        this.pos[k] = this.prev[k] = ax;
        this.pos[k + 1] = this.prev[k + 1] = ay - j * SEG;
        this.pos[k + 2] = this.prev[k + 2] = az;
      }
    }
    this.awake = 1;
  }

  private v = new THREE.Vector3();
  updateAnchors(matrix: THREE.Matrix4) {
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < this.strands; i++) {
      this.v.fromArray(this.anchorsLocal, i * 3).applyMatrix4(matrix);
      this.v.toArray(this.anchors, i * 3);
      cx += this.v.x;
      cy += this.v.y;
      cz += this.v.z;
    }
    this.center.set(cx / this.strands, cy / this.strands, cz / this.strands);
  }

  /** Returns the strongest per-strand sweep this step: [strand, intensity]. */
  step(inp: SimInput, onSweep?: (strand: number, intensity: number) => void) {
    const { dt, rayO, rayD, pVel, radius, breath, gust, motion, time } = inp;
    const dt2 = dt * dt;
    const P = this.pos, Q = this.prev;
    const r2 = radius * radius;
    const cx = this.center.x, cz = this.center.z;
    const pvLen = pVel.length();
    let touched = false;

    for (let i = 0; i < this.strands; i++) {
      const s0 = this.start[i], n = this.count[i];
      const ax = this.anchors[i * 3], ay = this.anchors[i * 3 + 1], az = this.anchors[i * 3 + 2];
      // Anchor follows its object exactly.
      P[s0 * 3] = Q[s0 * 3] = ax;
      P[s0 * 3 + 1] = Q[s0 * 3 + 1] = ay;
      P[s0 * 3 + 2] = Q[s0 * 3 + 2] = az;

      // Ambient air: a slow, per-strand sway.
      const ph = this.phase[i];
      const windX = motion * (Math.sin(time * 0.55 + ph) * 0.22 + Math.sin(time * 0.23 + ph * 1.7) * 0.18);
      const windZ = motion * Math.sin(time * 0.41 + ph * 0.6) * 0.16;
      let sweep = 0;

      for (let j = 1; j < n; j++) {
        const k = (s0 + j) * 3;
        const x = P[k], y = P[k + 1], z = P[k + 2];
        let vx = (x - Q[k]) * DAMPING;
        let vy = (y - Q[k + 1]) * DAMPING;
        let vz = (z - Q[k + 2]) * DAMPING;
        Q[k] = x;
        Q[k + 1] = y;
        Q[k + 2] = z;

        const depth = j / n;
        let fx = windX * depth;
        let fy = GRAVITY;
        let fz = windZ * depth;

        // Inhale: strands are drawn up and in, as if by a breath.
        if (breath > 0.001) {
          fx += (cx - x) * 3.2 * breath * depth;
          fz += (cz - z) * 3.2 * breath * depth;
          fy += 13.5 * breath * depth;
        }
        // Exhale / move: a gust outward and forward.
        if (gust > 0.001) {
          const dx = x - cx, dz = z - cz;
          fx += dx * 7 * gust * depth + Math.sin(time * 4 + ph + j * 0.3) * 1.2 * gust;
          fz += (dz * 6 + 2.4) * gust * depth;
        }

        vx += fx * dt2;
        vy += fy * dt2;
        vz += fz * dt2;
        let nx = x + vx, ny = y + vy, nz = z + vz;

        // Pointer: push nodes out of the ray, and drag them along with it.
        if (rayO) {
          const ox = nx - rayO.x, oy = ny - rayO.y, oz = nz - rayO.z;
          const t = ox * rayD.x + oy * rayD.y + oz * rayD.z;
          const qx = ox - rayD.x * t, qy = oy - rayD.y * t, qz = oz - rayD.z * t;
          const d2 = qx * qx + qy * qy + qz * qz;
          if (d2 < r2) {
            const d = Math.sqrt(d2) + 1e-5;
            const f = 1 - d / radius;
            const push = f * f * radius * 0.35;
            nx += (qx / d) * push;
            ny += (qy / d) * push * 0.6;
            nz += (qz / d) * push;
            const drag = f * 0.55 * dt;
            nx += pVel.x * drag;
            ny += pVel.y * drag * 0.7;
            nz += pVel.z * drag * 0.4;
            sweep = Math.max(sweep, f * pvLen);
            touched = true;
          }
        }
        P[k] = nx;
        P[k + 1] = ny;
        P[k + 2] = nz;
      }

      if (sweep > 0.9 && onSweep && time - this.chimeAt[i] > 0.5) {
        this.chimeAt[i] = time;
        onSweep(i, Math.min(1, sweep / 6));
      }
    }

    // Length constraints (anchor is immovable).
    for (let it = 0; it < ITER; it++) {
      for (let i = 0; i < this.strands; i++) {
        const s0 = this.start[i], n = this.count[i];
        for (let j = 1; j < n; j++) {
          const a = (s0 + j - 1) * 3, b = (s0 + j) * 3;
          const dx = P[b] - P[a], dy = P[b + 1] - P[a + 1], dz = P[b + 2] - P[a + 2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
          const diff = (d - SEG) / d;
          if (j === 1) {
            P[b] -= dx * diff;
            P[b + 1] -= dy * diff;
            P[b + 2] -= dz * diff;
          } else {
            const h = diff * 0.5;
            P[a] += dx * h;
            P[a + 1] += dy * h;
            P[a + 2] += dz * h;
            P[b] -= dx * h;
            P[b + 1] -= dy * h;
            P[b + 2] -= dz * h;
          }
        }
      }
    }

    if (touched || breath > 0.01 || gust > 0.01) this.awake = 3;
    return touched;
  }
}

export { GLYPH_SPACE };
