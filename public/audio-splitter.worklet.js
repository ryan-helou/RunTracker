// RunTracker audio auto-splitter (v2) — robust real-time sound detection on the
// audio thread. Pipeline per frame:
//   FFT -> log-band magnitudes -> adaptive noise-floor subtraction (kills steady
//   background music) -> L2-normalized spectral shape + spectral flux (onset).
// Matching: DTW (tempo/alignment tolerant) against multiple calibrated templates,
// take the best; only allowed to fire shortly after a spectral onset, must hold
// for 2 frames, and respects a cooldown. This is far more tolerant of music,
// timing jitter, and volume than a rigid matched filter.

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
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

class AudioSplitter extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.fftSize = o.fftSize || 2048;
    this.hop = o.hop || 1024;
    this.bands = o.bands || 40;
    this.T = o.templateLen || 21;
    this.radius = o.radius || 4;
    this.threshold = o.threshold != null ? o.threshold : 0.78;
    this.onsetFactor = o.onsetFactor || 1.9;
    this.overSub = o.overSub || 1.2;
    this.floorRise = 0.004;
    this.cooldownFrames = Math.round(((o.cooldownMs != null ? o.cooldownMs : 4000) / 1000) * sampleRate / this.hop);
    this.recordFrames = Math.round((4 * sampleRate) / this.hop);

    this.hist = new Float32Array(this.fftSize);
    this.histPos = 0;
    this.filled = 0;
    this.sinceFrame = 0;
    this.re = new Float32Array(this.fftSize);
    this.im = new Float32Array(this.fftSize);
    this.win = new Float32Array(this.fftSize);
    for (let i = 0; i < this.fftSize; i++) {
      this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (this.fftSize - 1));
    }

    this.bandEdges = new Int32Array(this.bands + 1);
    const lo = Math.max(1, Math.floor((80 * this.fftSize) / sampleRate));
    const hi = Math.min(this.fftSize >> 1, Math.floor((13000 * this.fftSize) / sampleRate));
    for (let b = 0; b <= this.bands; b++) {
      const f = lo * Math.pow(hi / lo, b / this.bands);
      this.bandEdges[b] = Math.min(this.fftSize >> 1, Math.max(lo, Math.round(f)));
    }

    this.floor = new Float32Array(this.bands);
    this.cleaned = new Float32Array(this.bands);
    this.prevCleaned = new Float32Array(this.bands);

    this.ring = new Float32Array(this.T * this.bands);
    this.ringFrames = 0;

    this.templates = []; // array of Float32Array(T*bands)
    this.detect = false;
    this.framesSinceTrigger = this.cooldownFrames;
    this.framesSinceOnset = 1e9;
    this.fluxEMA = 1e-4;
    this.aboveCount = 0;
    this.lastScore = 0;

    this.recording = false;
    this.recFeat = [];
    this.recFlux = [];
    this.recLeft = 0;

    this.meterCounter = 0;
    this.port.onmessage = (e) => this.onMsg(e.data);
  }

  onMsg(m) {
    if (m.type === "config") {
      if (m.threshold != null) this.threshold = m.threshold;
      if (m.cooldownMs != null) this.cooldownFrames = Math.round((m.cooldownMs / 1000) * sampleRate / this.hop);
    } else if (m.type === "detect") {
      this.detect = !!m.on;
      this.framesSinceTrigger = this.cooldownFrames;
      this.aboveCount = 0;
    } else if (m.type === "setTemplate") {
      this.templates = [];
      if (m.data && m.count) {
        const all = new Float32Array(m.data);
        const stride = this.T * this.bands;
        for (let c = 0; c < m.count; c++) {
          this.templates.push(all.subarray(c * stride, (c + 1) * stride));
        }
      }
    } else if (m.type === "record") {
      this.recording = true;
      this.recFeat = [];
      this.recFlux = [];
      this.recLeft = this.recordFrames;
    } else if (m.type === "reset") {
      this.ringFrames = 0;
      this.recording = false;
    }
  }

  // DTW similarity (Sakoe-Chiba band). Frames are L2-normalized, so per-pair
  // distance = 1 - dot. Returns 1 - (accumulated cost / T) in [0,1].
  dtwSim(tpl) {
    const T = this.T, bands = this.bands, r = this.radius, ring = this.ring;
    const INF = 1e9;
    if (!this.prevRow || this.prevRow.length !== T) {
      this.prevRow = new Float64Array(T);
      this.curRow = new Float64Array(T);
    }
    let prev = this.prevRow, cur = this.curRow;
    const dist = (i, j) => {
      let dot = 0;
      const a = i * bands, b = j * bands;
      for (let k = 0; k < bands; k++) dot += ring[a + k] * tpl[b + k];
      return 1 - dot;
    };
    for (let j = 0; j < T; j++) prev[j] = INF;
    prev[0] = dist(0, 0);
    for (let j = 1; j <= Math.min(r, T - 1); j++) prev[j] = prev[j - 1] + dist(0, j);
    for (let i = 1; i < T; i++) {
      for (let j = 0; j < T; j++) cur[j] = INF;
      const jlo = Math.max(0, i - r), jhi = Math.min(T - 1, i + r);
      for (let j = jlo; j <= jhi; j++) {
        let best = prev[j];
        if (j > 0) {
          if (prev[j - 1] < best) best = prev[j - 1];
          if (cur[j - 1] < best) best = cur[j - 1];
        }
        cur[j] = dist(i, j) + best;
      }
      const t = prev; prev = cur; cur = t;
    }
    this.prevRow = prev; this.curRow = cur;
    const cost = prev[T - 1];
    return cost >= INF ? 0 : 1 - Math.min(1, cost / T);
  }

  computeFrame() {
    const N = this.fftSize, re = this.re, im = this.im, win = this.win;
    for (let i = 0; i < N; i++) {
      const idx = (this.histPos + i) % N;
      re[i] = this.hist[idx] * win[i];
      im[i] = 0;
    }
    fft(re, im);
    const feat = new Float32Array(this.bands);
    let flux = 0;
    for (let b = 0; b < this.bands; b++) {
      let s = 0;
      const a = this.bandEdges[b], c = this.bandEdges[b + 1];
      for (let k = a; k < c; k++) s += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      // adaptive noise floor: drops instantly, rises slowly toward steady level
      if (s < this.floor[b]) this.floor[b] = s;
      else this.floor[b] += (s - this.floor[b]) * this.floorRise;
      let cl = s - this.floor[b] * this.overSub;
      if (cl < 0) cl = 0;
      const d = cl - this.prevCleaned[b];
      if (d > 0) flux += d;
      this.cleaned[b] = cl;
      feat[b] = Math.log1p(cl);
    }
    let norm = 0;
    for (let i = 0; i < this.bands; i++) norm += feat[i] * feat[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < this.bands; i++) feat[i] /= norm;
    this.prevCleaned.set(this.cleaned);
    return { feat, flux };
  }

  pushFrame(feat, flux) {
    this.ring.copyWithin(0, this.bands);
    this.ring.set(feat, (this.T - 1) * this.bands);
    if (this.ringFrames < this.T) this.ringFrames++;

    if (this.recording) {
      this.recFeat.push(feat);
      this.recFlux.push(flux);
      this.recLeft--;
      if (this.recLeft <= 0) {
        this.recording = false;
        this.finishRecording();
      }
    }

    // onset detection (spectral flux above a slow baseline)
    const onset = flux > this.fluxEMA * this.onsetFactor + 1e-5;
    this.fluxEMA = Math.max(1e-6, this.fluxEMA + (flux - this.fluxEMA) * 0.02);
    this.framesSinceOnset = onset ? 0 : this.framesSinceOnset + 1;

    // best-template DTW score
    let score = 0;
    if (this.ringFrames >= this.T && this.templates.length) {
      for (let t = 0; t < this.templates.length; t++) {
        const s = this.dtwSim(this.templates[t]);
        if (s > score) score = s;
      }
    }
    this.lastScore = score;

    this.framesSinceTrigger++;
    const recentOnset = this.framesSinceOnset <= 2 * this.T;
    if (this.detect && score >= this.threshold && recentOnset) this.aboveCount++;
    else this.aboveCount = 0;

    if (this.detect && this.aboveCount >= 2 && this.framesSinceTrigger >= this.cooldownFrames) {
      this.framesSinceTrigger = 0;
      this.aboveCount = 0;
      this.port.postMessage({ type: "trigger", score });
    }
  }

  finishRecording() {
    const frames = this.recFeat.length;
    if (frames < this.T) return;
    // anchor the template at the strongest spectral onset (jingle start)
    let onset = 0, mx = -1;
    for (let i = 0; i < frames; i++) {
      if (this.recFlux[i] > mx) { mx = this.recFlux[i]; onset = i; }
    }
    const start = Math.max(0, Math.min(frames - this.T, onset - 2));
    const out = new Float32Array(this.T * this.bands);
    for (let f = 0; f < this.T; f++) out.set(this.recFeat[start + f], f * this.bands);
    this.port.postMessage({ type: "sample", data: out }, [out.buffer]);
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input.length) {
      const ch0 = input[0];
      const ch1 = input.length > 1 ? input[1] : null;
      const len = ch0 ? ch0.length : 0;
      for (let i = 0; i < len; i++) {
        let s = ch0[i];
        if (ch1) s = (s + ch1[i]) * 0.5;
        this.hist[this.histPos] = s;
        this.histPos = (this.histPos + 1) % this.fftSize;
        if (this.filled < this.fftSize) this.filled++;
        this.sinceFrame++;
        if (this.sinceFrame >= this.hop && this.filled >= this.fftSize) {
          this.sinceFrame = 0;
          const { feat, flux } = this.computeFrame();
          this.pushFrame(feat, flux);
        }
      }
      this.meterCounter += len;
      if (this.meterCounter >= 4096) {
        this.meterCounter = 0;
        let rms = 0;
        for (let i = 0; i < len; i++) rms += ch0[i] * ch0[i];
        rms = Math.sqrt(rms / (len || 1));
        this.port.postMessage({ type: "meter", level: rms, score: this.lastScore });
      }
    }
    return true;
  }
}

registerProcessor("audio-splitter", AudioSplitter);
