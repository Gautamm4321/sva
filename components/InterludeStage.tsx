"use client";

import { useEffect, useRef } from "react";
import { world } from "./world/store";

const THRESHOLDS = [0.12, 0.4, 0.68];

/**
 * Pinned stage for the lineup. Registers the piece labels with the scene
 * (which positions them under each piece) and steps the copy in with scroll.
 */
export default function InterludeStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.parentElement;
    if (!el || !section) return;
    world.labels = Array.from(el.querySelectorAll<HTMLElement>(".lineup__label"));
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-step-min]"));
    let step = -1;
    let raf = 0;
    const update = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom > 0 && r.top < vh) {
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
        const s = THRESHOLDS.filter((t) => p >= t).length;
        if (s !== step) {
          step = s;
          el.dataset.step = String(s);
          for (const it of items) it.classList.toggle("is-on", s >= Number(it.dataset.stepMin));
        }
        el.dataset.labels = world.view > 0.6 ? "on" : "off";
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(raf);
      world.labels = [];
    };
  }, []);

  return (
    <div ref={ref} className="lineup__stage" data-step="0" data-labels="off">
      {children}
    </div>
  );
}
