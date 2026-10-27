"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { world, setVisible } from "./world/store";
import { stepWorld } from "./world/sim";

const World = dynamic(() => import("./world/World"), { ssr: false });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The hero backdrop: hosts the WebGL scene (or a painted CSS fallback) and
 * feeds pointer + scroll into the shared state. Also runs smooth scrolling.
 */
export default function WorldLayer() {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "webgl" | "fallback">("pending");
  const [ready, setReady] = useState(false);

  // Capability check, then a deferred load so the hero copy paints first.
  useEffect(() => {
    const fallback = !hasWebGL() || new URLSearchParams(window.location.search).has("nowebgl");
    const start = () => setMode(fallback ? "fallback" : "webgl");
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric && !fallback) ric(start, { timeout: 500 });
    else window.setTimeout(start, fallback ? 0 : 100);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      world.reducedMotion = mq.matches;
      document.documentElement.dataset.motion = mq.matches ? "reduced" : "full";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Pointer relative to the hero. Touch positions keep flowing during a
  // scroll gesture, so a swipe on a phone brushes through the strands too.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      world.pointer.x = ((cx - r.left) / r.width) * 2 - 1;
      world.pointer.y = -((cy - r.top) / r.height) * 2 + 1;
      world.pointer.active = cy >= r.top && cy <= r.bottom;
      world.pointer.lastMove = world.time;
    };
    const move = (e: PointerEvent) => set(e.clientX, e.clientY);
    const touch = (e: TouchEvent) => e.touches[0] && set(e.touches[0].clientX, e.touches[0].clientY);
    const leave = () => (world.pointer.active = false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    window.addEventListener("touchstart", touch, { passive: true });
    window.addEventListener("touchmove", touch, { passive: true });
    window.addEventListener("touchend", leave, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      window.removeEventListener("touchstart", touch);
      window.removeEventListener("touchmove", touch);
      window.removeEventListener("touchend", leave);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, []);

  // Smooth scroll + the page clock + hero scroll progress.
  useEffect(() => {
    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let cancelled = false;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      import("lenis").then(({ default: Lenis }) => {
        if (!cancelled) lenis = new Lenis({ lerp: 0.09, anchors: true, smoothWheel: true });
      });
    }
    let last = performance.now();
    const loop = (t: number) => {
      lenis?.raf(t);
      stepWorld((t - last) / 1000);
      last = t;
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        world.scroll = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
        setVisible(r.bottom > 0 && r.top < window.innerHeight);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return (
    <div ref={ref} className="scene" data-ready={ready || mode === "fallback" ? "true" : "false"} aria-hidden>
      {/* Drifting cloud layers: shown until WebGL is ready, and as the fallback. */}
      <div className="scene-clouds">
        <i />
        <i />
        <i />
      </div>
      {mode === "webgl" && <World onReady={() => window.setTimeout(() => setReady(true), 150)} />}
    </div>
  );
}
