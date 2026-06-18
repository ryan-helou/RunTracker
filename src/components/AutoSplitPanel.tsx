"use client";

import { useEffect, useState } from "react";
import type { AutoSplitter } from "@/hooks/useAutoSplitter";
import { cn } from "@/lib/cn";

export function AutoSplitPanel({
  open,
  onClose,
  as,
  gameName,
}: {
  open: boolean;
  onClose: () => void;
  as: AutoSplitter;
  gameName: string;
}) {
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    if (open) as.refreshDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const listening = as.status === "listening";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="panel fade-up max-h-[88vh] w-full max-w-md overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              Auto-split
              <span className="rounded bg-best/20 px-1.5 py-0.5 text-[0.6rem] font-semibold text-best">BETA</span>
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Splits automatically when it hears the level-clear sound. Works while you&apos;re in the game.
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-fg" aria-label="Close">✕</button>
        </div>

        {/* 1. Capture */}
        <p className="eyebrow mt-5">1 · Capture game audio</p>
        {!listening ? (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="h-10 flex-1 rounded-lg border border-line bg-surface-2 px-2.5 text-sm text-fg ring-focus"
              >
                <option value="">Default audio input</option>
                {as.devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Input ${i + 1}`}
                  </option>
                ))}
              </select>
              <button
                onClick={() => as.start("device", deviceId || undefined)}
                className="rounded-lg bg-accent px-3.5 text-sm font-semibold text-ink hover:brightness-110"
              >
                Use input
              </button>
            </div>
            <button
              onClick={() => as.start("display")}
              className="rounded-lg border border-line py-2 text-sm text-fg hover:border-line-bright"
            >
              …or capture a browser tab / window&apos;s audio
            </button>
            <p className="text-[0.7rem] leading-relaxed text-faint">
              Real Wii → use your capture card&apos;s audio input. Dolphin on this Mac → route its
              audio to a virtual input (e.g. BlackHole) and pick it here, or use tab audio if it runs in a tab.
            </p>
            {as.status === "error" && as.error && (
              <p className="text-sm text-behind">{as.error}</p>
            )}
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-ahead">
              <span className="h-2 w-2 rounded-full bg-ahead" /> Capturing
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full bg-ahead transition-all" style={{ width: `${Math.min(100, as.level * 320)}%` }} />
            </div>
            <button onClick={as.stop} className="text-xs text-muted hover:text-fg">Stop</button>
          </div>
        )}

        {/* 2. Calibrate */}
        {listening && (
          <>
            <p className="eyebrow mt-6">
              2 · {as.usingDefault ? "Calibration (optional)" : "Teach it the sound"}
            </p>
            {as.usingDefault ? (
              <p className="mt-1 text-sm text-ahead">
                ✓ Built-in detection ready — no calibration needed. Recalibrate below only to
                fine-tune for your exact audio.
              </p>
            ) : as.hasTemplate ? (
              <p className="mt-1 flex items-center gap-2 text-sm text-ahead">
                ✓ Calibrated to your setup
                <button
                  onClick={as.clearTemplate}
                  className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
                >
                  clear
                </button>
              </p>
            ) : null}
            <p className="mt-2 text-[0.78rem] leading-relaxed text-muted">
              Click <span className="text-fg">Record</span>, then make the {gameName} level-clear sound
              play within 4 seconds (clear a level, or play a clip). Do it 2–3× for accuracy.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={as.recordSample}
                disabled={as.recording}
                className="rounded-lg border border-best/50 px-3.5 py-2 text-sm text-best hover:bg-best/10 disabled:opacity-60"
              >
                {as.recording ? "Listening… (4s)" : "● Record the sound"}
              </button>
              <span className="text-xs text-faint">{as.sampleCount} captured (keeps best 4)</span>
              <button
                onClick={as.saveTemplate}
                disabled={as.sampleCount < 1}
                className="ml-auto rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </>
        )}

        {/* 3. Sensitivity + score */}
        {listening && (
          <>
            <p className="eyebrow mt-6">3 · Sensitivity</p>
            <div className="mt-2">
              <div className="relative h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn("h-full transition-all", as.score >= as.threshold ? "bg-ahead" : "bg-best")}
                  style={{ width: `${Math.min(100, as.score * 100)}%` }}
                />
                <div className="absolute top-0 h-full w-0.5 bg-accent" style={{ left: `${as.threshold * 100}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[0.6rem] text-faint">
                <span>match score {(as.score * 100).toFixed(0)}%</span>
                <span>trigger at {(as.threshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.6}
                max={0.92}
                step={0.01}
                value={as.threshold}
                onChange={(e) => as.setSensitivity(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--color-accent)]"
              />
              <div className="flex justify-between text-[0.6rem] text-faint">
                <span>more triggers</span>
                <span>fewer / stricter</span>
              </div>
            </div>
          </>
        )}

        {/* 4. Toggle */}
        <button
          onClick={() => as.setDetect(!as.detecting)}
          disabled={!listening || !as.hasTemplate}
          className={cn(
            "mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold transition-colors disabled:opacity-40",
            as.detecting ? "bg-ahead text-ink" : "border border-line text-fg hover:border-line-bright",
          )}
        >
          {as.detecting ? "● Auto-split ON — listening" : "Turn auto-split ON"}
        </button>
        {listening && !as.hasTemplate && (
          <p className="mt-2 text-center text-[0.7rem] text-faint">Teach it the sound first.</p>
        )}
        <p className="mt-3 text-center text-[0.7rem] text-faint">
          Your manual split key always still works as a backup.
        </p>
      </div>
    </div>
  );
}
