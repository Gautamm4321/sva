import { world, emitExhale } from "./store";

/**
 * Page-level tick (runs on the DOM rAF loop, independent of WebGL), so the
 * breath logic and pointer smoothing behave the same with or without a canvas.
 */
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));

let wasHolding = false;

export function stepWorld(rawDt: number) {
  const dt = Math.min(rawDt, 0.05);
  world.time += dt;

  if (world.holding) {
    world.breath = damp(world.breath, 1, 0.8, dt); // ~4 s to a full breath
  } else {
    if (wasHolding && world.breath > 0.15) {
      world.gust = Math.max(world.gust, 0.4 + world.breath * 0.9);
      emitExhale(world.breath);
    }
    world.breath = damp(world.breath, 0, 1.6, dt);
  }
  wasHolding = world.holding;

  const p = world.pointer;
  p.vx = damp(p.vx, 0, 6, dt);
  p.vy = damp(p.vy, 0, 6, dt);
}
