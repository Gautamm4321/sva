"use client";

import { world } from "./store";

/**
 * Nature soundscape — three real field recordings layered in the browser:
 *  · water  — a running river / stream
 *  · wind   — wind moving through trees; swells with each breeze on the page
 *  · birds  — forest birdsong
 * Each file is a seamless loop of a different length, so the mix never
 * repeats the same way. Files live in /public/sounds.
 * Starts only on an explicit user action; always fades in and out.
 */
// Birds lead; the water is a light, trickling stream in the background
// (its low river rumble is filtered away) and the wind is a soft breath.
const LAYERS = {
  water: { url: "/sounds/water.mp3", gain: 0.16, highpass: 650, lowpass: 7000 },
  wind: { url: "/sounds/wind.mp3", gain: 0.16, highpass: 250, lowpass: 5000 },
  birds: { url: "/sounds/birds.mp3", gain: 0.85, highpass: 300, lowpass: 12000 },
} as const;
type LayerName = keyof typeof LAYERS;

const MASTER = 0.85;

class NatureAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private gains: Partial<Record<LayerName, GainNode>> = {};
  private loading: Promise<void> | null = null;
  private raf = 0;
  enabled = false;

  private async load() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // Each layer loads on its own: if one file is missing, the others still play.
    const results = await Promise.allSettled(
      (Object.keys(LAYERS) as LayerName[]).map(async (name, i) => {
        const res = await fetch(LAYERS[name].url);
        if (!res.ok) throw new Error(`${LAYERS[name].url} ${res.status}`);
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const g = ctx.createGain();
        g.gain.value = LAYERS[name].gain;
        // A touch of stereo placement so the layers sit apart.
        const p = ctx.createStereoPanner();
        p.pan.value = [-0.15, 0.2, 0][i];
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = LAYERS[name].highpass;
        hp.Q.value = 0.5;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = LAYERS[name].lowpass;
        lp.Q.value = 0.5;
        src.connect(hp).connect(lp).connect(g).connect(p).connect(master);
        // Start each loop at a random point so every visit sounds different.
        src.start(0, Math.random() * buf.duration);
        this.gains[name] = g;
      }),
    );
    results.forEach((r) => r.status === "rejected" && console.warn("[sound]", (r.reason as Error).message));
    if (results.every((r) => r.status === "rejected")) {
      this.loading = null; // allow a retry on the next click
      throw new Error("no sound files could be loaded");
    }
  }

  private tick = () => {
    const ctx = this.ctx;
    const wind = this.gains.wind;
    if (!ctx || !wind) return;
    // The wind rises a little with each breeze through the strands.
    const b = Math.min(1, world.gust);
    wind.gain.setTargetAtTime(LAYERS.wind.gain * (1 + b * 0.8), ctx.currentTime, 0.5);
    this.raf = requestAnimationFrame(this.tick);
  };

  async enable() {
    if (!this.loading) this.loading = this.load();
    this.enabled = true;
    await this.loading;
    const ctx = this.ctx!;
    await ctx.resume();
    if (!this.enabled) return;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(MASTER, ctx.currentTime, 0.9);
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick);
  }

  disable() {
    this.enabled = false;
    cancelAnimationFrame(this.raf);
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    window.setTimeout(() => {
      if (!this.enabled) void ctx.suspend();
    }, 1600);
  }
}

let instance: NatureAudio | null = null;
export function getAudio() {
  if (!instance) instance = new NatureAudio();
  return instance;
}
