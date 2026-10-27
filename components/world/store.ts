/**
 * Shared, mutable world state. DOM components write intent (pointer, slide,
 * scroll, hold); the WebGL scene reads it every frame. Deliberately outside
 * React state: these values change at 60 fps and must not re-render React.
 */

type Fn<A extends unknown[] = []> = (...a: A) => void;

export const world = {
  time: 0,

  /** Pointer in NDC (-1..1) plus a smoothed screen-space velocity. */
  pointer: { x: 0, y: 0, vx: 0, vy: 0, active: false, lastMove: 0 },

  /** Hero carousel: which piece is in focus. */
  slide: 0,

  /** 0 = hero framing, 1 = lineup (interlude) framing. */
  view: 0,
  /** 0..1 pan across the lineup while the interlude scrolls. */
  lineup: 0,

  /** Breath: hold to inhale (strands gather), release to exhale (a gust). */
  holding: false,
  breath: 0,
  /** One-shot gust strength, consumed by the curtains. */
  gust: 0,

  visible: true,
  reducedMotion: false,

  /** Lineup label elements, positioned by the scene. */
  labels: [] as (HTMLElement | null)[],
};

const exhaleL = new Set<Fn<[number]>>();
const chimeL = new Set<Fn<[number, number, number]>>();
const visL = new Set<Fn>();
const slideL = new Set<Fn<[number]>>();

const sub = <T,>(set: Set<T>, fn: T) => {
  set.add(fn);
  return () => void set.delete(fn);
};

export const onExhale = (fn: Fn<[number]>) => sub(exhaleL, fn);
export const emitExhale = (s: number) => exhaleL.forEach((f) => f(s));

/** A strand was swept: (piece index, strand index 0..1, intensity 0..1). */
export const onChime = (fn: Fn<[number, number, number]>) => sub(chimeL, fn);
export const emitChime = (piece: number, strand: number, s: number) => chimeL.forEach((f) => f(piece, strand, s));

export const onVisibility = (fn: Fn) => sub(visL, fn);
export function setVisible(v: boolean) {
  if (world.visible === v) return;
  world.visible = v;
  visL.forEach((f) => f());
}

export const onSlide = (fn: Fn<[number]>) => sub(slideL, fn);
export function setSlide(i: number) {
  if (world.slide === i) return;
  world.slide = i;
  world.gust = Math.max(world.gust, 0.35); // the move stirs the air
  slideL.forEach((f) => f(i));
}
