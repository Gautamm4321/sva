import * as THREE from "three";
import { Bot, BOT_SIZE } from "./botanicals";

/**
 * Hanging botanical strands: verlet chains anchored above the frame. Each
 * strand is a fine thread with botanicals tied along it. Simulated on the CPU
 * (a couple of thousand nodes), rendered as one line batch + one sprite batch.
 */

export const SEG = 0.12;
const GRAVITY = -9.8;
const DAMPING = 0.984;
const ITER = 4;

export type Sprite = { strand: number; node: number; type: Bot; size: number; spin: number };

export type StepInput = {
  dt: number;
  time: number;
  rayO: THREE.Vector3 | null;
  rayD: THREE.Vector3;
  pVel: THREE.Vector3;
  radius: number;
  gust: number;
  motion: number;
};

export type Layout = {
  /** Half-height and half-width of the view at a given z. */
  halfH: (z: number) => number;
  halfW: (z: number) => number;
  portrait: boolean;
};

export class Strands {
  strands = 0;
  total = 0;
  start: Int32Array;
  count: Int32Array;
  pos: Float32Array;
  prev: Float32Array;
  anchor: Float32Array;
  phase: Float32Array;
  sprites: Sprite[] = [];
  private chimeAt: Float32Array;

  constructor(n: number, layout: Layout, seed = 7) {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    const specs: { x: number; y: number; z: number; nodes: number; recipe: number }[] = [];

    for (let i = 0; i < n; i++) {
      // Depth from just in front of the focus plane to well behind it.
      const z = -3.4 + Math.pow(rnd(), 0.8) * 4.6;
      const hh = layout.halfH(z);
      const hw = layout.halfW(z) * 1.08;
      // Spread across the width, thinning over the copy (lower left on wide
      // screens): strands there are fewer and shorter.
      let fx = rnd();
      // Keep the copy's side light: most strands move right of it.
      if (!layout.portrait && fx < 0.42 && rnd() < 0.7) fx = 0.42 + rnd() * 0.58;
      const x = -hw + fx * hw * 2;
      const yTop = hh + 0.25 + rnd() * 0.3;
      // Where on screen (from top, 0..1) the strand should end.
      let end: number;
      if (layout.portrait) end = 0.08 + rnd() * 0.22;
      else end = fx < 0.42 ? 0.05 + rnd() * 0.13 : 0.14 + rnd() * 0.42;
      const len = yTop - (hh - end * 2 * hh);
      const nodes = Math.max(6, Math.round(len / SEG));
      specs.push({ x, y: yTop, z, nodes, recipe: Math.floor(rnd() * 5) });
    }

    this.strands = specs.length;
    this.start = new Int32Array(this.strands);
    this.count = new Int32Array(this.strands);
    let total = 0;
    specs.forEach((sp, i) => {
      this.start[i] = total;
      this.count[i] = sp.nodes;
      total += sp.nodes;
    });
    this.total = total;
    this.pos = new Float32Array(total * 3);
    this.prev = new Float32Array(total * 3);
    this.anchor = new Float32Array(this.strands * 3);
    this.phase = new Float32Array(this.strands);
    this.chimeAt = new Float32Array(this.strands);

    specs.forEach((sp, i) => {
      this.anchor.set([sp.x, sp.y, sp.z], i * 3);
      this.phase[i] = rnd() * Math.PI * 2;
      for (let j = 0; j < sp.nodes; j++) {
        const k = (this.start[i] + j) * 3;
        this.pos[k] = this.prev[k] = sp.x;
        this.pos[k + 1] = this.prev[k + 1] = sp.y - j * SEG;
        this.pos[k + 2] = this.prev[k + 2] = sp.z;
      }
      this.tie(i, sp.nodes, sp.recipe, rnd);
    });
  }

  /** Tie botanicals onto a strand according to one of a few recipes. */
  private tie(i: number, n: number, recipe: number, rnd: () => number) {
    const add = (node: number, type: Bot, scale = 1) =>
      this.sprites.push({ strand: i, node, type, size: BOT_SIZE[type] * scale * (0.85 + rnd() * 0.3), spin: (rnd() - 0.5) * 0.7 });
    const last = n - 1;
    switch (recipe) {
      case 0: // lavender: sprig at the end, loose buds above
        add(last, Bot.Lavender);
        for (let j = last - 4; j > 2; j -= 3 + Math.floor(rnd() * 3)) add(j, Bot.Bud);
        break;
      case 1: // chamomile: flowers spaced along, leaf pairs between
        for (let j = last; j > 2; j -= 4 + Math.floor(rnd() * 3)) add(j, rnd() < 0.7 ? Bot.Chamomile : Bot.LeafPair);
        break;
      case 2: // vetiver tuft with gold beads
        add(last, Bot.Vetiver);
        for (let j = last - 3; j > 2; j -= 4) add(j, Bot.Bead);
        break;
      case 3: // leaves and petals
        for (let j = last; j > 2; j -= 3 + Math.floor(rnd() * 2)) add(j, rnd() < 0.55 ? Bot.Leaf : Bot.Petal);
        break;
      default: // mixed: bead chain ending in a flower or sprig
        add(last, rnd() < 0.5 ? Bot.Chamomile : Bot.Lavender);
        for (let j = last - 2; j > 2; j -= 2) add(j, rnd() < 0.75 ? Bot.Bead : Bot.Bud);
    }
  }

  step(inp: StepInput, onSweep?: (strand: number, x: number, intensity: number) => void) {
    const { dt, time, rayO, rayD, pVel, radius, gust, motion } = inp;
    const dt2 = dt * dt;
    const P = this.pos, Q = this.prev;
    const r2 = radius * radius;
    const pv = pVel.length();

    for (let i = 0; i < this.strands; i++) {
      const s0 = this.start[i], n = this.count[i];
      const a = i * 3;
      P[s0 * 3] = Q[s0 * 3] = this.anchor[a];
      P[s0 * 3 + 1] = Q[s0 * 3 + 1] = this.anchor[a + 1];
      P[s0 * 3 + 2] = Q[s0 * 3 + 2] = this.anchor[a + 2];
      const ph = this.phase[i];
      const wx = motion * (Math.sin(time * 0.5 + ph) * 0.28 + Math.sin(time * 0.21 + ph * 1.9) * 0.22);
      const wz = motion * Math.sin(time * 0.37 + ph * 0.7) * 0.2;
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
        const d = j / n;
        let fx = wx * d;
        let fz = wz * d;
        if (gust > 0.001) {
          fx += Math.sin(time * 2.2 + ph + j * 0.25) * 3.2 * gust * d;
          fz += 1.6 * gust * d;
        }
        vx += fx * dt2;
        vy += GRAVITY * dt2;
        vz += fz * dt2;
        let nx = x + vx, ny = y + vy, nz = z + vz;

        if (rayO) {
          const ox = nx - rayO.x, oy = ny - rayO.y, oz = nz - rayO.z;
          const t = ox * rayD.x + oy * rayD.y + oz * rayD.z;
          const qx = ox - rayD.x * t, qy = oy - rayD.y * t, qz = oz - rayD.z * t;
          const dd = qx * qx + qy * qy + qz * qz;
          if (dd < r2) {
            const dist = Math.sqrt(dd) + 1e-5;
            const f = 1 - dist / radius;
            const push = f * f * radius * 0.3;
            nx += (qx / dist) * push;
            ny += (qy / dist) * push * 0.5;
            nz += (qz / dist) * push;
            const drag = f * 0.5 * dt;
            nx += pVel.x * drag;
            ny += pVel.y * drag * 0.6;
            nz += pVel.z * drag * 0.4;
            sweep = Math.max(sweep, f * pv);
          }
        }
        P[k] = nx;
        P[k + 1] = ny;
        P[k + 2] = nz;
      }
      if (sweep > 1 && onSweep && time - this.chimeAt[i] > 0.6) {
        this.chimeAt[i] = time;
        onSweep(i, this.anchor[a], Math.min(1, sweep / 6));
      }
    }

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
  }
}
