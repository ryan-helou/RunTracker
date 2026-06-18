"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_TEMPLATES } from "@/lib/autoTemplates";

const BANDS = 40;
const FFT = 2048;
const HOP = 1024;
const T_FRAMES = 21; // fixed so built-in templates match regardless of sample rate
const RECORD_MS = 4000;
const RADIUS = 4;
const MAX_TEMPLATES = 4;
const DEFAULT_THRESHOLD = 0.78;

export type AutoStatus = "off" | "starting" | "listening" | "error";
export type CaptureMethod = "device" | "display";

interface StoredTemplate {
  T: number;
  bands: number;
  count: number;
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
  usingDefault: boolean;
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
  const samplesRef = useRef<Float32Array[]>([]);
  const recTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<AutoStatus>("off");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [detecting, setDetecting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [template, setTemplate] = useState<StoredTemplate | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const tplKey = `rt_autotemplate_v2:${gameKey}`;
  const defaultTpl = (DEFAULT_TEMPLATES[gameKey] as StoredTemplate | undefined) ?? null;
  const usingDefault = !template && !!defaultTpl;
  const hasTemplate = !!template || !!defaultTpl;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(tplKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredTemplate;
        if (parsed && Array.isArray(parsed.data) && parsed.count > 0) setTemplate(parsed);
        else setTemplate(null);
      } else {
        setTemplate(null);
      }
    } catch {
      setTemplate(null);
    }
  }, [tplKey]);

  const handleMsg = useCallback(
    (m: { type: string; level?: number; score?: number; data?: Float32Array }) => {
      if (m.type === "meter") {
        setLevel(m.level ?? 0);
        setScore(m.score ?? 0);
      } else if (m.type === "trigger") {
        onTriggerRef.current();
      } else if (m.type === "sample" && m.data) {
        samplesRef.current.push(new Float32Array(m.data));
        setSampleCount(samplesRef.current.length);
        setRecording(false);
        if (recTimer.current) clearTimeout(recTimer.current);
      }
    },
    [],
  );

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
    } catch {}
  }, []);

  const postTemplate = useCallback(
    (node: AudioWorkletNode, tpl: StoredTemplate | null) => {
      if (tpl && tpl.count > 0 && tpl.data.length === tpl.count * T_FRAMES * BANDS) {
        node.port.postMessage({ type: "setTemplate", count: tpl.count, data: Float32Array.from(tpl.data) });
      } else {
        node.port.postMessage({ type: "setTemplate", count: 0, data: null });
      }
    },
    [],
  );

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

        const node = new AudioWorkletNode(ctx, "audio-splitter", {
          processorOptions: {
            fftSize: FFT,
            hop: HOP,
            bands: BANDS,
            templateLen: T_FRAMES,
            radius: RADIUS,
            onsetFactor: 1.9,
            cooldownMs: 4000,
            threshold,
          },
        });
        node.port.onmessage = (e) => handleMsg(e.data);

        const src = ctx.createMediaStreamSource(stream);
        const sink = ctx.createGain();
        sink.gain.value = 0;
        src.connect(node);
        node.connect(sink);
        sink.connect(ctx.destination);
        nodeRef.current = node;

        postTemplate(node, template ?? defaultTpl);

        stream.getAudioTracks()[0].addEventListener("ended", () => stop());
        setStatus("listening");
        refreshDevices();
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Couldn't start audio capture.");
        streamRef.current?.getTracks().forEach((t) => t.stop());
      }
    },
    [handleMsg, template, defaultTpl, threshold, stop, refreshDevices, postTemplate],
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
    const kept = samplesRef.current.slice(-MAX_TEMPLATES);
    if (kept.length === 0) return;
    const stride = T_FRAMES * BANDS;
    const all = new Float32Array(kept.length * stride);
    kept.forEach((s, i) => all.set(s.subarray(0, stride), i * stride));
    const stored: StoredTemplate = { T: T_FRAMES, bands: BANDS, count: kept.length, data: Array.from(all) };
    setTemplate(stored);
    samplesRef.current = [];
    setSampleCount(0);
    try {
      localStorage.setItem(tplKey, JSON.stringify(stored));
    } catch {}
    nodeRef.current?.port.postMessage({ type: "setTemplate", count: kept.length, data: all });
  }, [tplKey]);

  const clearTemplate = useCallback(() => {
    setTemplate(null);
    samplesRef.current = [];
    setSampleCount(0);
    try {
      localStorage.removeItem(tplKey);
    } catch {}
    // fall back to the built-in default (if any); otherwise clear detection
    if (nodeRef.current) {
      if (defaultTpl) postTemplate(nodeRef.current, defaultTpl);
      else {
        setDetect(false);
        nodeRef.current.port.postMessage({ type: "setTemplate", count: 0, data: null });
      }
    }
  }, [tplKey, defaultTpl, postTemplate, setDetect]);

  useEffect(() => () => stop(), [stop]);

  return {
    status,
    error,
    level,
    score,
    threshold,
    detecting,
    hasTemplate,
    usingDefault,
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
