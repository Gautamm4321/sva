"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Scene, type Tier } from "./Scene";
import { onVisibility, world } from "./store";
import { fontsReady } from "./textures";

function pickTier(): Tier {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 760;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (cores <= 4 || mem <= 3) return "low";
  if (coarse || small) return "mid";
  return "high";
}

const DPR_CAP: Record<Tier, number> = { high: 1.75, mid: 1.5, low: 1.25 };

/**
 * The fixed full-viewport WebGL layer. Client-only and lazily loaded after the
 * hero copy paints; renders nothing while no world window is on screen.
 */
export default function World({ onReady }: { onReady?: () => void }) {
  const [tier, setTier] = useState<Tier>(() => pickTier());
  const [dprCap, setDprCap] = useState(() => DPR_CAP[pickTier()]);
  const [fonts, setFonts] = useState(false);
  const [active, setActive] = useState(true);

  // Glyph atlas + labels are drawn with the brand fonts: wait for them.
  useEffect(() => {
    let live = true;
    fontsReady().then(() => live && setFonts(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => onVisibility(() => setActive(world.visible)), []);

  if (!fonts) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);

  return (
    <Canvas
      className="world-canvas"
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      shadows={{ type: THREE.VSMShadowMap }}
      gl={{ antialias: tier !== "low", alpha: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: 30, near: 0.1, far: 80, position: [-1, 0.2, 10] }}
      // flat = no tone mapping: the deck's colours (cocoa, gold, paper) render as specified.
      flat
      onCreated={() => onReady?.()}
    >
      <Scene
        tier={tier}
        onSlow={() => {
          // Sustained low frame rate: drop resolution first, then detail.
          if (dprCap > 1) setDprCap(1);
          else if (tier !== "low") setTier(tier === "high" ? "mid" : "low");
        }}
      />
    </Canvas>
  );
}
