"use client";

import { world, onChime } from "./store";

/**
 * Ambient sound, synthesized in the browser — no audio files, no licensing.
 *  · a low, slowly breathing drone (two detuned tones through a lowpass)
 *  · "air": filtered noise that lifts with each breeze
 *  · soft bell tones when strands are swept — the curtain is a wind chime,
 *    pitched left (low) to right (high) on a D minor pentatonic scale
 * Starts only on an explicit user action; always fades in and out.
 */
class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private airFilter: BiquadFilterNode | null = null;
  private airGain: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private raf = 0;
  private unsubs: (() => void)[] = [];
  enabled = false;

  private build() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    // Generated impulse response: a soft, dark room.
    const len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);
    this.reverb = reverb;

    // Drone.
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 420;
    droneFilter.Q.value = 0.4;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.11;
    droneFilter.connect(droneGain);
    droneGain.connect(master);
    droneGain.connect(reverb);
    [73.42, 110.0, 146.83 * 1.003].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 1 ? "triangle" : "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.25 : 0.5;
      o.connect(g).connect(droneFilter);
      o.start();
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / 8; // one breath
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(droneFilter.frequency);
    lfo.start();

    // Air.
    const noiseLen = ctx.sampleRate * 4;
    const nb = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    let last = 0;
    for (let i = 0; i < noiseLen; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown-ish
      nd[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = nb;
    noise.loop = true;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 500;
    airFilter.Q.value = 0.6;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.05;
    noise.connect(airFilter).connect(airGain);
    airGain.connect(master);
    airGain.connect(reverb);
    noise.start();
    this.airFilter = airFilter;
    this.airGain = airGain;
  }

  private bell(freq: number, level: number) {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverb) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(level, now + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
    out.connect(this.master);
    const send = ctx.createGain();
    send.gain.value = 0.9;
    out.connect(send).connect(this.reverb);
    // Inharmonic partials of a small singing bowl.
    [
      [1, 1],
      [2.71, 0.32],
      [5.1, 0.12],
    ].forEach(([ratio, amp]) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * ratio;
      const g = ctx.createGain();
      g.gain.value = amp;
      o.connect(g).connect(out);
      o.start(now);
      o.stop(now + 4.6);
    });
  }

  private tick = () => {
    if (!this.ctx || !this.airFilter || !this.airGain) return;
    const now = this.ctx.currentTime;
    // Air rises a little with each breeze through the strands.
    const b = Math.min(1, world.gust);
    this.airFilter.frequency.setTargetAtTime(420 + b * 1200, now, 0.3);
    this.airGain.gain.setTargetAtTime(0.04 + b * 0.08, now, 0.3);
    this.raf = requestAnimationFrame(this.tick);
  };

  async enable() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    await ctx.resume();
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(0.7, ctx.currentTime, 0.9);
    this.enabled = true;

    const scale = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46, 783.99]; // D F G A C D F G
    let lastChime = 0;
    this.unsubs.push(
      onChime((strand, x, s) => {
        const now = performance.now();
        if (now - lastChime < 70) return; // never a clatter
        lastChime = now;
        const i = Math.min(scale.length - 1, Math.max(0, Math.floor(x * scale.length)));
        this.bell(scale[i] * (strand % 3 === 0 ? 0.5 : 1), 0.05 + s * 0.08);
      }),
    );
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick);
  }

  disable() {
    this.enabled = false;
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
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

let instance: AmbientAudio | null = null;
export function getAudio() {
  if (!instance) instance = new AmbientAudio();
  return instance;
}
