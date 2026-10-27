"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PIECES } from "@/lib/content";
import { setSlide, world, onExhale } from "./world/store";
import PieceIcon from "./PieceIcon";

const INTERACTIVE = "a, button, input, label, select, textarea, [data-no-breathe]";
const N = PIECES.length;

export default function Hero() {
  const [i, setI] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const [exhaled, setExhaled] = useState(false);
  const exhaleTimer = useRef<number | undefined>(undefined);

  const go = useCallback((n: number) => {
    const next = ((n % N) + N) % N;
    setI(next);
    setSlide(next);
  }, []);

  // Arrow keys while the hero is on screen.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const hero = document.getElementById("hero");
      if (!hero || hero.getBoundingClientRect().bottom < window.innerHeight * 0.4) return;
      if (e.key === "ArrowRight") go(world.slide + 1);
      if (e.key === "ArrowLeft") go(world.slide - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go]);

  // Hold anywhere (not on a control) to breathe in; release to breathe out.
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    let timer: number | undefined;
    let sx = 0;
    let sy = 0;
    let pending = false;
    const set = (v: boolean) => {
      if (world.holding === v) return;
      world.holding = v;
      setBreathing(v);
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest(INTERACTIVE)) return;
      pending = true;
      sx = e.clientX;
      sy = e.clientY;
      // A still press (not a sweep, not a scroll) becomes a breath.
      timer = window.setTimeout(() => pending && set(true), e.pointerType === "mouse" ? 180 : 320);
    };
    const move = (e: PointerEvent) => {
      if (pending && !world.holding && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) {
        pending = false;
        window.clearTimeout(timer);
      }
    };
    const up = () => {
      pending = false;
      window.clearTimeout(timer);
      set(false);
    };
    const noMenu = (e: Event) => world.holding && e.preventDefault();
    hero.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    hero.addEventListener("contextmenu", noMenu);
    const off = onExhale(() => {
      setExhaled(true);
      window.clearTimeout(exhaleTimer.current);
      exhaleTimer.current = window.setTimeout(() => setExhaled(false), 2400);
    });
    return () => {
      window.clearTimeout(timer);
      hero.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
      hero.removeEventListener("contextmenu", noMenu);
      off();
    };
  }, []);

  const p = PIECES[i];
  const prev = PIECES[(i - 1 + N) % N];
  const next = PIECES[(i + 1) % N];
  const hint = breathing ? "Breathing in…" : exhaled ? "…and out." : "Move through the strands · press and hold to breathe";

  return (
    <section id="hero" className={`hero${breathing ? " is-breathing" : ""}`} aria-labelledby="hero-title" aria-roledescription="carousel">
      <div className="hero__copy" key={p.key} aria-live="polite">
        <p className="mono hero__kicker">{p.kicker}</p>
        <h1 id="hero-title" className="hero__title">
          <span className="hero__lead">
            <span className="w">{p.lead}</span>
            <span className="hero__rule" aria-hidden />
          </span>{" "}
          {p.rest.split(" ").map((w, k) => (
            <span key={k}>
              <span className="w" style={{ ["--k" as string]: k + 1 }}>
                {w}
              </span>{" "}
            </span>
          ))}
        </h1>
        <a href="#join" className="btn btn--ink hero__cta">
          Join the waitlist
        </a>
      </div>

      <p className="mono hero__note" key={`n-${p.key}`}>
        {p.note}
      </p>

      <button type="button" className="thumb thumb--prev" onClick={() => go(i - 1)} aria-label={`Previous: ${prev.name}`}>
        <PieceIcon k={prev.key} />
        <span>{prev.name}</span>
      </button>
      <button type="button" className="thumb thumb--next" onClick={() => go(i + 1)} aria-label={`Next: ${next.name}`}>
        <PieceIcon k={next.key} />
        <span>{next.name}</span>
      </button>

      <div className="hero__foot">
        <ol className="dots" aria-label="Pieces">
          {PIECES.map((q, k) => (
            <li key={q.key}>
              <button
                type="button"
                aria-label={q.name}
                aria-current={k === i ? "true" : undefined}
                onClick={() => go(k)}
              />
            </li>
          ))}
        </ol>
        <p className="mono hero__hint" aria-hidden>
          {hint}
        </p>
      </div>

      <a href="#philosophy" className="hero__scroll mono" aria-label="Scroll to explore">
        Scroll
      </a>
    </section>
  );
}
