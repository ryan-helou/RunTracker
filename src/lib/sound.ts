"use client";

// Lightweight WebAudio cues — no audio files. All synthesized on the fly.

export type SfxName = "start" | "tick" | "gold" | "pb" | "reset";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function beep(freq: number, durMs: number, type: OscillatorType = "sine", gain = 0.06, delayMs = 0) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delayMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + durMs / 1000);
}

export const sfx: Record<SfxName, () => void> = {
  start: () => beep(440, 90, "triangle", 0.05),
  tick: () => beep(680, 55, "sine", 0.05),
  gold: () => {
    beep(880, 70, "triangle", 0.06);
    beep(1320, 110, "triangle", 0.06, 70);
  },
  pb: () => {
    [523, 659, 784, 1047].forEach((f, i) => beep(f, 150, "triangle", 0.07, i * 110));
  },
  reset: () => beep(170, 170, "sawtooth", 0.05),
};
