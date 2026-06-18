// RunTracker audio auto-splitter — runs on the audio thread (not throttled when
// the browser tab is backgrounded, so detection keeps working while you're in
// the game). Computes a normalized log-band spectral fingerprint per frame and
// matched-filters a live ring buffer against a calibrated template.

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
    this.bands = o.bands || 32;
    this.T = o.templateLen || 24;
    this.threshold = o.threshold != null ? o.threshold : 0.82;
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
    const hi = Math.min(this.fftSize >> 1, Math.floor((12000 * this.fftSize) / sampleRate));
    for (let b = 0; b <= this.bands; b++) {
      const f = lo * Math.pow(hi / lo, b / this.bands);
      this.bandEdges[b] = Math.min(this.fftSize >> 1, Math.max(lo, Math.round(f)));
    }

    this.ring = new Float32Array(this.T * this.bands);
    this.ringFrames = 0;
    this.template = null;
    this.detect = false;
    this.framesSinceTrigger = this.cooldownFrames;
    this.lastScore = 0;

    this.recording = false;
    this.recFeat = [];
    this.recEnergy = [];
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
    } else if (m.type === "setTemplate") {
      this.template = m.data ? new Float32Array(m.data) : null;
    } else if (m.type === "record") {
      this.recording = true;
      this.recFeat = [];
      this.recEnergy = [];
      this.recLeft = this.recordFrames;
    } else if (m.type === "reset") {
      this.ringFrames = 0;
      this.recording = false;
    }
  }

  cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    const n = a.length;
    for (let i = 0; i < n; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
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
    let energy = 0;
    for (let b = 0; b < this.bands; b++) {
      let s = 0;
      const a = this.bandEdges[b], c = this.bandEdges[b + 1];
      for (let k = a; k < c; k++) s += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      energy += s;
      feat[b] = Math.log1p(s);
    }
    let norm = 0;
    for (let i = 0; i < this.bands; i++) norm += feat[i] * feat[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < this.bands; i++) feat[i] /= norm;
    return { feat, energy };
  }

  pushFrame(feat, energy) {
    this.ring.copyWithin(0, this.bands);
    this.ring.set(feat, (this.T - 1) * this.bands);
    if (this.ringFrames < this.T) this.ringFrames++;

    if (this.recording) {
      this.recFeat.push(feat);
      this.recEnergy.push(energy);
      this.recLeft--;
      if (this.recLeft <= 0) {
        this.recording = false;
        this.finishRecording();
      }
    }

    this.framesSinceTrigger++;
    if (this.template && this.ringFrames >= this.T && this.template.length === this.ring.length) {
      const score = this.cosine(this.ring, this.template);
      this.lastScore = score;
      if (this.detect && score >= this.threshold && this.framesSinceTrigger >= this.cooldownFrames) {
        this.framesSinceTrigger = 0;
        this.port.postMessage({ type: "trigger", score });
      }
    }
  }

  finishRecording() {
    const frames = this.recFeat.length;
    if (frames < this.T) return; // not enough captured
    let peak = 0, pe = -1;
    for (let i = 0; i < frames; i++) {
      if (this.recEnergy[i] > pe) { pe = this.recEnergy[i]; peak = i; }
    }
    const start = Math.max(0, Math.min(frames - this.T, peak - (this.T >> 2)));
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
          const { feat, energy } = this.computeFrame();
          this.pushFrame(feat, energy);
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
