import { world } from "./store";

let lastScroll = 0;

/** Page-level tick: advances the clock and turns quick scrolls into a breeze. */
export function stepWorld(rawDt: number) {
  const dt = Math.min(rawDt, 0.05);
  world.time += dt;
  const y = window.scrollY;
  const v = Math.abs(y - lastScroll) / Math.max(dt, 1e-3);
  lastScroll = y;
  if (!world.reducedMotion && v > 400) world.gust = Math.min(0.9, Math.max(world.gust, v / 4000));
}
