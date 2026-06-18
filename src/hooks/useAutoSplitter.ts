"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BANDS = 32;
const FFT = 2048;
const HOP = 1024;
const TEMPLATE_MS = 520;
const RECORD_MS = 4000;

export type AutoStatus = "off" | "starting" | "listening" | "error";
export type CaptureMethod = "device" | "display";

interface StoredTemplate {
  T: number;
  bands: number;
  data: number[];
}

export interface AutoSplitter {
  status: AutoStatus;
  error: string | null;
  level: number;
  score: number;
  threshold: number;
  detecting: boolean;
  hasTemplate: boolean;
  sampleCount: number;
  recording: boolean;
  devices: MediaDeviceInfo[];
  start: (method: CaptureMethod, deviceId?: string) => Promise<void>;
  stop: () => void;
  refreshDevices: () => Promise<void>;
  setDetect: (on: boolean) => void;
  setSensitivity: (threshold: number) => void;
  recordSample: () => void;
  saveTemplate: () => void;
  clearTemplate: () => void;
}

export function useAutoSplitter(gameKey: string, onTrigger: () => void): AutoSplitter {
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const ctxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tRef = useRef<number>(Math.round((TEMPLATE_MS / 1000) * 48000) / HOP);
  const samplesRef = useRef<Float32Array[]>([]);
  const recTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<AutoStatus>("off");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [threshold, setThreshold] = useState(0.82);
  const [detecting, setDetecting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [template, setTemplate] = useState<StoredTemplate | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const tplKey = `rt_autotemplate:${gameKey}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(tplKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredTemplate;
        if (parsed && Array.isArray(parsed.data)) setTemplate(parsed);
      } else {
        setTemplate(null);
      }
    } catch {
      setTemplate(null);
    }
  }, [tplKey]);

  const handleMsg = useCallback((m: { type: string; level?: number; score?: number; data?: ArrayBuffer | number[] }) => {
    if (m.type === "meter") {
      setLevel(m.level ?? 0);
      setScore(m.score ?? 0);
    } else if (m.type === "trigger") {
      onTriggerRef.current();
    } else if (m.type === "sample" && m.data) {
      samplesRef.current.push(new Float32Array(m.data as ArrayBuffer));
      setSampleCount(samplesRef.current.length);
      setRecording(false);
      if (recTimer.current) clearTimeout(recTimer.current);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      nodeRef.current?.port.postMessage({ type: "detect", on: false });
      nodeRef.current?.disconnect();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    nodeRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
    setStatus("off");
    setDetecting(false);
    setRecording(false);
    setLevel(0);
    setScore(0);
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "audioinput"));
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(
    async (method: CaptureMethod, deviceId?: string) => {
      setError(null);
      setStatus("starting");
      try {
        let stream: MediaStream;
        if (method === "display") {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          if (stream.getAudioTracks().length === 0) {
            stream.getTracks().forEach((t) => t.stop());
            throw new Error('No audio in that capture — pick a Tab and tick "Share tab audio".');
          }
          stream.getVideoTracks().forEach((t) => t.stop());
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: deviceId
              ? { deviceId: { exact: deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
              : { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
          });
        }
        streamRef.current = stream;

        const ctx = new AudioContext();
        ctxRef.current = ctx;
        await ctx.resume().catch(() => {});
        await ctx.audioWorklet.addModule("/audio-splitter.worklet.js");

        const T = Math.round((TEMPLATE_MS / 1000) * ctx.sampleRate / HOP);
        tRef.current = T;

        const node = new AudioWorkletNode(ctx, "audio-splitter", {
          processorOptions: {
            fftSize: FFT,
            hop: HOP,
            bands: BANDS,
            templateLen: T,
            cooldownMs: 4000,
            threshold,
          },
        });
        node.port.onmessage = (e) => handleMsg(e.data);

        const src = ctx.createMediaStreamSource(stream);
        const sink = ctx.createGain();
        sink.gain.value = 0; // process without playing the captured audio back
        src.connect(node);
        node.connect(sink);
        sink.connect(ctx.destination);
        nodeRef.current = node;

        // send a matching template if we have one for this sample rate
        if (template && template.T === T && template.data.length === T * BANDS) {
          node.port.postMessage({ type: "setTemplate", data: Float32Array.from(template.data) });
        }

        stream.getAudioTracks()[0].addEventListener("ended", () => stop());
        setStatus("listening");
        refreshDevices();
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Couldn't start audio capture.");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      }
    },
    [handleMsg, template, threshold, stop, refreshDevices],
  );

  const setDetect = useCallback((on: boolean) => {
    setDetecting(on);
    nodeRef.current?.port.postMessage({ type: "detect", on });
  }, []);

  const setSensitivity = useCallback((value: number) => {
    setThreshold(value);
    nodeRef.current?.port.postMessage({ type: "config", threshold: value });
  }, []);

  const recordSample = useCallback(() => {
    if (!nodeRef.current) return;
    setRecording(true);
    nodeRef.current.port.postMessage({ type: "record" });
    if (recTimer.current) clearTimeout(recTimer.current);
    recTimer.current = setTimeout(() => setRecording(false), RECORD_MS + 800);
  }, []);

  const saveTemplate = useCallback(() => {
    const samples = samplesRef.current;
    if (samples.length === 0) return;
    const T = tRef.current;
    const len = T * BANDS;
    const avg = new Float32Array(len);
    for (const s of samples) for (let i = 0; i < len && i < s.length; i++) avg[i] += s[i];
    for (let i = 0; i < len; i++) avg[i] /= samples.length;
    for (let f = 0; f < T; f++) {
      let n = 0;
      for (let b = 0; b < BANDS; b++) n += avg[f * BANDS + b] ** 2;
      n = Math.sqrt(n) || 1;
      for (let b = 0; b < BANDS; b++) avg[f * BANDS + b] /= n;
    }
    const data = Array.from(avg);
    const stored: StoredTemplate = { T, bands: BANDS, data };
    setTemplate(stored);
    samplesRef.current = [];
    setSampleCount(0);
    try {
      localStorage.setItem(tplKey, JSON.stringify(stored));
    } catch {}
    nodeRef.current?.port.postMessage({ type: "setTemplate", data: avg });
  }, [tplKey]);

  const clearTemplate = useCallback(() => {
    setTemplate(null);
    samplesRef.current = [];
    setSampleCount(0);
    setDetect(false);
    try {
      localStorage.removeItem(tplKey);
    } catch {}
    nodeRef.current?.port.postMessage({ type: "setTemplate", data: null });
  }, [tplKey, setDetect]);

  useEffect(() => () => stop(), [stop]);

  return {
    status,
    error,
    level,
    score,
    threshold,
    detecting,
    hasTemplate: !!template,
    sampleCount,
    recording,
    devices,
    start,
    stop,
    refreshDevices,
    setDetect,
    setSensitivity,
    recordSample,
    saveTemplate,
    clearTemplate,
  };
}
