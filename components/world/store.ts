/**
 * Shared, mutable hero state. DOM listeners write pointer + scroll; the WebGL
 * scene reads it every frame. Outside React on purpose: it changes at 60 fps.
 */

type Fn<A extends unknown[] = []> = (...a: A) => void;

export const world = {
  time: 0,
  /** Pointer in NDC (-1..1) relative to the hero canvas. */
  pointer: { x: 0, y: 0, active: false, lastMove: 0 },
  /** 0..1 as the hero scrolls out of view. */
  scroll: 0,
  /** One-shot breeze strength (e.g. from a fast scroll), consumed by the strands. */
  gust: 0,
  visible: true,
  reducedMotion: false,
};

const chimeL = new Set<Fn<[number, number, number]>>();
const visL = new Set<Fn>();

const sub = <T,>(set: Set<T>, fn: T) => {
  set.add(fn);
  return () => void set.delete(fn);
};

/** A strand was swept: (strand index, x position 0..1, intensity 0..1). */
export const onChime = (fn: Fn<[number, number, number]>) => sub(chimeL, fn);
export const emitChime = (i: number, x: number, s: number) => chimeL.forEach((f) => f(i, x, s));

export const onVisibility = (fn: Fn) => sub(visL, fn);
export function setVisible(v: boolean) {
  if (world.visible === v) return;
  world.visible = v;
  visL.forEach((f) => f());
}
