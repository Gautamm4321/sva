"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Scene, FOV, CAM_Z, type Tier } from "./Scene";
import { onVisibility, world } from "./store";

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

/** The hero's WebGL layer. Client-only, lazy-loaded, idle when off screen. */
export default function World({ onReady }: { onReady?: () => void }) {
  const [tier, setTier] = useState<Tier>(() => pickTier());
  const [dprCap, setDprCap] = useState(() => DPR_CAP[pickTier()]);
  const [active, setActive] = useState(true);

  useEffect(() => onVisibility(() => setActive(world.visible)), []);

  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);

  return (
    <Canvas
      className="hero-canvas"
      dpr={dpr}
      flat
      frameloop={active ? "always" : "never"}
      gl={{ antialias: tier !== "low", alpha: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: FOV, near: 0.1, far: 40, position: [0, 0, CAM_Z] }}
      onCreated={() => onReady?.()}
    >
      <Scene
        tier={tier}
        onSlow={() => {
          if (dprCap > 1) setDprCap(1);
          else if (tier !== "low") setTier(tier === "high" ? "mid" : "low");
        }}
      />
    </Canvas>
  );
}
