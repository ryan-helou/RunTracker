// Builds default auto-split fingerprints from reference WAV clips, using the
// EXACT same feature pipeline as public/audio-splitter.worklet.js, so a baked
// template matches what the live worklet computes. Emits src/lib/autoTemplates.ts.
//
// Usage: node scripts/build-default-templates.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FFT = 2048, HOP = 1024, BANDS = 40, T = 21, OVERSUB = 1.2, FLOOR_RISE = 0.004;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len >> 1; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + (len >> 1)], bi = im[i + k + (len >> 1)];
        const tr = br * cr - bi * ci, ti = br * ci + bi * cr;
        re[i + k] = ar + tr; im[i + k] = ai + ti;
        re[i + k + (len >> 1)] = ar - tr; im[i + k + (len >> 1)] = ai - ti;
        const ncr = cr * wr - ci * wi, nci = cr * wi + ci * wr;
        cr = ncr; ci = nci;
      }
    }
  }
}

function decodeWavMono(path) {
  const b = readFileSync(path);
  let p = 12, sr = 48000, ch = 2, bits = 16, dataOff = -1, dataLen = 0;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(p + 10); sr = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
    if (id === "data") { dataOff = p + 8; dataLen = sz; break; }
    p += 8 + sz + (sz & 1);
  }
  if (dataOff < 0 || bits !== 16) throw new Error("unsupported wav: " + path);
  const frames = dataLen / (2 * ch);
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < ch; c++) s += b.readInt16LE(dataOff + (i * ch + c) * 2);
    mono[i] = s / ch / 32768;
  }
  return { mono, sr };
}

function bandEdges(sr) {
  const edges = new Int32Array(BANDS + 1);
  const lo = Math.max(1, Math.floor((80 * FFT) / sr));
  const hi = Math.min(FFT >> 1, Math.floor((13000 * FFT) / sr));
  for (let b = 0; b <= BANDS; b++) {
    const f = lo * Math.pow(hi / lo, b / BANDS);
    edges[b] = Math.min(FFT >> 1, Math.max(lo, Math.round(f)));
  }
  return edges;
}

function buildTemplate(path) {
  const { mono, sr } = decodeWavMono(path);
  const edges = bandEdges(sr);
  const win = new Float32Array(FFT);
  for (let i = 0; i < FFT; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT - 1));
  const floor = new Float32Array(BANDS);
  const prevCleaned = new Float32Array(BANDS);

  const feats = [];
  const fluxes = [];
  const re = new Float32Array(FFT), im = new Float32Array(FFT);
  for (let start = 0; start + HOP <= mono.length; start += HOP) {
    for (let i = 0; i < FFT; i++) { re[i] = (start + i < mono.length ? mono[start + i] : 0) * win[i]; im[i] = 0; }
    fft(re, im);
    const feat = new Float32Array(BANDS);
    let flux = 0;
    for (let bnd = 0; bnd < BANDS; bnd++) {
      let s = 0;
      for (let k = edges[bnd]; k < edges[bnd + 1]; k++) s += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      if (s < floor[bnd]) floor[bnd] = s; else floor[bnd] += (s - floor[bnd]) * FLOOR_RISE;
      let cl = s - floor[bnd] * OVERSUB;
      if (cl < 0) cl = 0;
      const d = cl - prevCleaned[bnd];
      if (d > 0) flux += d;
      prevCleaned[bnd] = cl;
      feat[bnd] = Math.log1p(cl);
    }
    let norm = 0;
    for (let i = 0; i < BANDS; i++) norm += feat[i] * feat[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < BANDS; i++) feat[i] /= norm;
    feats.push(feat);
    fluxes.push(flux);
  }

  if (feats.length < T) throw new Error("clip too short: " + path);
  let onset = 0, mx = -1;
  for (let i = 0; i < fluxes.length; i++) if (fluxes[i] > mx) { mx = fluxes[i]; onset = i; }
  const startF = Math.max(0, Math.min(feats.length - T, onset - 2));
  const out = [];
  for (let f = 0; f < T; f++) for (let b = 0; b < BANDS; b++) out.push(Number(feats[startF + f][b].toFixed(5)));
  return out;
}

// gameKey -> reference clips (each becomes one template; matched best-of)
const SOURCES = {
  nsmbw: ["/tmp/goal.wav", "/tmp/castle.wav"],
};

const result = {};
for (const [game, paths] of Object.entries(SOURCES)) {
  const data = [];
  let count = 0;
  for (const p of paths) {
    try {
      data.push(...buildTemplate(p));
      count++;
      console.log("  built template from", p);
    } catch (e) {
      console.log("  skipped", p, "-", e.message);
    }
  }
  if (count > 0) result[game] = { T, bands: BANDS, count, data };
}

const out = `// GENERATED by scripts/build-default-templates.mjs — do not edit by hand.
// Built-in auto-split fingerprints so detection works without calibration.
// Each is a normalized log-band spectral template (T frames x bands), produced
// by the same pipeline as public/audio-splitter.worklet.js.

export interface DefaultTemplate {
  T: number;
  bands: number;
  count: number;
  data: number[];
}

export const DEFAULT_TEMPLATES: Record<string, DefaultTemplate> = ${JSON.stringify(result)};
`;
writeFileSync(join(root, "src/lib/autoTemplates.ts"), out);
const games = Object.keys(result).join(", ");
console.log(`Wrote src/lib/autoTemplates.ts — games: ${games || "none"}`);
