"use client";

import { useState } from "react";
import { getAudio } from "./world/audio";

/** Muted by default. Sound only ever starts from this explicit control. */
export default function SoundToggle() {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const a = getAudio();
      if (on) {
        a.disable();
        setOn(false);
      } else {
        await a.enable();
        setOn(true);
      }
    } catch {
      setOn(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="sound"
      data-on={on}
      aria-pressed={on}
      aria-label={on ? "Turn ambient sound off" : "Turn ambient sound on"}
      onClick={toggle}
    >
      <span className="sound__bars" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sound__label">{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
