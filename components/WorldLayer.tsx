"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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

const FALLBACK_COLUMNS = "return to self · breathe · lavender · vetiver · chamomile · slow down · come home · ";

/**
 * Fixed background layer hosting the WebGL world (or a static fallback), and
 * the page-level loop that feeds pointer + scroll into the shared world state.
 */
export default function WorldLayer() {
  const [mode, setMode] = useState<"pending" | "webgl" | "fallback">("pending");
  const [ready, setReady] = useState(false);

  // Capability check, then a deferred load so the hero copy paints first.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fallback = !hasWebGL() || params.has("nowebgl");
    if (fallback) document.documentElement.dataset.world = "fallback";
    const start = () => setMode(fallback ? "fallback" : "webgl");
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    if (ric && !fallback) ric(start, { timeout: 500 });
    else window.setTimeout(start, fallback ? 0 : 100);
  }, []);

  // Reduced motion.
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

  // Pointer (mouse + touch). Touch positions keep flowing during a scroll
  // gesture, so a swipe on a phone sweeps through the strands too.
  useEffect(() => {
    const set = (x: number, y: number) => {
      world.pointer.x = (x / window.innerWidth) * 2 - 1;
      world.pointer.y = -(y / window.innerHeight) * 2 + 1;
      world.pointer.active = true;
      world.pointer.lastMove = world.time;
    };
    const move = (e: PointerEvent) => set(e.clientX, e.clientY);
    const touch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) set(t.clientX, t.clientY);
    };
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

  // Smooth scroll (off for reduced motion) + scroll → camera framing.
  useEffect(() => {
    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let cancelled = false;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      import("lenis").then(({ default: Lenis }) => {
        if (cancelled) return;
        lenis = new Lenis({ lerp: 0.09, anchors: true, smoothWheel: true });
      });
    }

    const hero = document.getElementById("hero");
    const inter = document.getElementById("lineup");
    let last = performance.now();
    const loop = (t: number) => {
      lenis?.raf(t);
      stepWorld((t - last) / 1000);
      last = t;
      const vh = window.innerHeight;
      if (hero && inter) {
        const h = hero.getBoundingClientRect();
        const r = inter.getBoundingClientRect();
        // Camera pulls back as the lineup section rises into view…
        world.view = Math.min(1, Math.max(0, 1 - r.top / vh));
        // …then pans across the pieces while it is pinned.
        world.lineup = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
        setVisible(h.bottom > 0 || (r.top < vh && r.bottom > 0));
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
    <div className="world" data-ready={ready || mode === "fallback" ? "true" : "false"} aria-hidden>
      {mode === "webgl" && <World onReady={() => window.setTimeout(() => setReady(true), 120)} />}
      {mode === "fallback" && (
        <div className="world-fallback">
          <div className="world-fallback__seal">
            <span>svā</span>
          </div>
          <div className="world-fallback__curtain">
            {Array.from({ length: 19 }, (_, i) => (
              <span key={i} style={{ ["--i" as string]: i }}>
                {FALLBACK_COLUMNS.slice((i * 7) % 40).slice(0, 26)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
