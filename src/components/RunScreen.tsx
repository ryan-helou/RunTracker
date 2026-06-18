"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRunEngine } from "@/hooks/useRunEngine";
import { useKeybindings } from "@/hooks/useKeybindings";
import { useHotkey } from "@/hooks/useHotkey";
import { KeybindingsModal } from "./KeybindingsModal";
import { formatMs, formatDelta } from "@/lib/format";
import { keyLabel } from "@/lib/keys";
import type { Comparison } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  gameKey: string;
  categoryKey: string;
  gameName: string;
  gameShort: string;
  accent: string;
  categoryName: string;
  splitNames: string[];
  timingMethod: string;
}

function Kbd({ code }: { code: string }) {
  return (
    <kbd className="mono rounded border border-line-bright bg-surface-3 px-1.5 py-0.5 text-[0.6rem] leading-none text-muted">
      {keyLabel(code)}
    </kbd>
  );
}

export function RunScreen(props: Props) {
  const { gameKey, categoryKey, gameName, gameShort, accent, categoryName, timingMethod } = props;

  const namesKey = props.splitNames.join("␟");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const splitNames = useMemo(() => props.splitNames, [namesKey]);

  const engine = useRunEngine(splitNames);
  const kb = useKeybindings();

  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedRunId, setSavedRunId] = useState<number | null>(null);
  const [isNewPB, setIsNewPB] = useState(false);

  const loadComparison = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/comparison?game=${encodeURIComponent(gameKey)}&category=${encodeURIComponent(categoryKey)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) setComparison(data.comparison as Comparison);
    } catch {
      /* offline / db not configured — run still works, no comparison */
    }
  }, [gameKey, categoryKey]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  // --- input ---
  const hotkeysOn = !settingsOpen && saveState !== "saving";
  useHotkey(
    kb.bindings.split,
    () => {
      if (engine.status === "idle") engine.start();
      else if (engine.status === "running") engine.split();
    },
    hotkeysOn,
  );
  useHotkey(kb.bindings.undo, () => engine.undo(), hotkeysOn);
  useHotkey(kb.bindings.skip, () => engine.skip(), hotkeysOn);
  useHotkey(kb.bindings.pause, () => engine.togglePause(), hotkeysOn);
  useHotkey(kb.bindings.reset, () => engine.reset(), hotkeysOn && engine.status !== "finished");

  // --- comparison-derived values ---
  const pbCum = comparison?.pbCumulative ?? [];
  const golds = comparison?.goldSegments ?? [];
  const hasPB = (comparison?.pb ?? null) != null;

  const overallDelta = useMemo(() => {
    if (!comparison) return null;
    let lastIdx = -1;
    for (let i = 0; i < engine.splits.length; i++) {
      if (engine.splits[i].cumulativeMs != null) lastIdx = i;
    }
    const base =
      lastIdx >= 0 && pbCum[lastIdx] != null
        ? (engine.splits[lastIdx].cumulativeMs as number) - (pbCum[lastIdx] as number)
        : null;
    if (engine.status === "running") {
      const pc = pbCum[engine.currentIndex];
      if (pc != null && engine.elapsedMs > pc) {
        const live = engine.elapsedMs - pc;
        return base != null ? Math.max(base, live) : live;
      }
    }
    return base;
  }, [comparison, engine.splits, engine.status, engine.currentIndex, engine.elapsedMs, pbCum]);

  const tone =
    engine.status === "idle"
      ? "idle"
      : overallDelta == null
        ? "neutral"
        : overallDelta < 0
          ? "ahead"
          : "behind";

  const timerColor =
    tone === "ahead" ? "text-ahead" : tone === "behind" ? "text-behind" : "text-accent";
  const timerGlow =
    tone === "ahead"
      ? "timer-glow-ahead"
      : tone === "behind"
        ? "timer-glow-behind"
        : "timer-glow";

  const [clockMain, clockCs] = formatMs(engine.elapsedMs).split(".");
  const overallDeltaFmt = formatDelta(overallDelta);

  // --- save ---
  const saveRun = useCallback(async () => {
    setSaveState("saving");
    let total: number | null = null;
    for (const sp of engine.splits) if (sp.cumulativeMs != null) total = sp.cumulativeMs;
    const completed =
      engine.splits.length > 0 &&
      engine.splits[engine.splits.length - 1].cumulativeMs != null;
    const prevPB = comparison?.pb?.totalMs ?? null;
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameKey, categoryKey, completed, splits: engine.splits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      setSavedRunId(data.run.id);
      setIsNewPB(completed && total != null && (prevPB == null || total < prevPB));
      setSaveState("saved");
      loadComparison();
    } catch {
      setSaveState("error");
    }
  }, [engine.splits, comparison, gameKey, categoryKey, loadComparison]);

  const newRun = useCallback(() => {
    setSaveState("idle");
    setSavedRunId(null);
    setIsNewPB(false);
    engine.reset();
  }, [engine]);

  // --- autoscroll current split ---
  const currentRowRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [engine.currentIndex]);

  const finished = engine.status === "finished";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-5">
      {/* header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm text-muted transition-colors hover:text-fg"
        >
          ← Dashboard
        </Link>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-bright hover:text-fg ring-focus"
        >
          ⌨ Keys
        </button>
      </div>

      <div className="mt-3 flex items-baseline gap-2.5">
        <span
          className="text-xs font-bold tracking-widest"
          style={{ color: accent }}
        >
          {gameShort}
        </span>
        <h1 className="text-lg font-semibold tracking-tight text-fg">
          {categoryName}
        </h1>
        <span className="ml-auto rounded border border-line px-2 py-0.5 text-[0.6rem] text-faint">
          {timingMethod}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted">{gameName}</p>

      {/* timer hero */}
      <div
        className={cn(
          "panel mt-4 flex flex-col items-center px-6 py-7",
          engine.status === "running" && "pulse-active",
        )}
      >
        <div className={cn("mono text-7xl font-bold tracking-tight sm:text-8xl", timerColor, timerGlow)}>
          {clockMain}
          <span className="text-4xl opacity-70 sm:text-5xl">.{clockCs}</span>
        </div>
        {overallDeltaFmt && engine.status !== "idle" ? (
          <div
            className={cn(
              "mono mt-1.5 text-lg font-semibold",
              overallDeltaFmt.ahead ? "text-ahead" : "text-behind",
            )}
          >
            {overallDeltaFmt.text}
          </div>
        ) : (
          <div className="mt-1.5 text-sm text-muted">
            {hasPB ? "Comparing to personal best" : "No PB yet — set the pace"}
          </div>
        )}
      </div>

      {/* stats */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          { label: "Personal Best", value: formatMs(comparison?.pb?.totalMs ?? null) },
          { label: "Sum of Best", value: formatMs(comparison?.sumOfBest ?? null) },
          { label: "Runs", value: String(comparison?.runCount ?? 0) },
        ].map((stat) => (
          <div key={stat.label} className="panel px-3 py-2.5 text-center">
            <div className="mono text-sm font-semibold text-fg">{stat.value}</div>
            <div className="text-[0.6rem] uppercase tracking-wider text-faint">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* splits */}
      <ul className="mt-3 flex max-h-[42vh] flex-col gap-0.5 overflow-y-auto pr-1">
        {engine.splits.map((sp, i) => {
          const isCurrent =
            (engine.status === "running" || engine.status === "paused") &&
            i === engine.currentIndex;
          const recorded = sp.cumulativeMs != null;
          const pc = pbCum[i] ?? null;
          const delta = recorded && pc != null ? (sp.cumulativeMs as number) - pc : null;
          const gseg = golds[i] ?? null;
          const isGold =
            recorded && sp.segmentMs != null && (gseg == null || sp.segmentMs < gseg);
          const deltaFmt = formatDelta(delta);

          let liveDelta: number | null = null;
          if (isCurrent && engine.status === "running" && pc != null && engine.elapsedMs > pc) {
            liveDelta = engine.elapsedMs - pc;
          }
          const liveFmt = formatDelta(liveDelta);

          const timeText = recorded
            ? formatMs(sp.cumulativeMs)
            : isCurrent && engine.status === "running"
              ? formatMs(engine.elapsedMs)
              : sp.skipped
                ? "—"
                : formatMs(pc);

          return (
            <li
              key={i}
              ref={isCurrent ? currentRowRef : null}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors",
                isCurrent
                  ? "border-accent/60 bg-[rgba(255,178,36,0.07)]"
                  : "border-transparent",
                isGold && "flash-gold",
              )}
            >
              <span className="mono w-6 shrink-0 text-xs text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {isGold && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)]" />
                )}
                <span
                  className={cn(
                    "truncate text-sm",
                    isCurrent ? "font-semibold text-fg" : "text-fg/90",
                    sp.skipped && "text-faint line-through",
                  )}
                >
                  {sp.name}
                </span>
              </span>

              <span className="mono w-20 shrink-0 text-right text-sm font-semibold">
                {deltaFmt ? (
                  <span className={deltaFmt.ahead ? "text-ahead" : "text-behind"}>
                    {deltaFmt.text}
                  </span>
                ) : liveFmt ? (
                  <span className="text-behind/80">{liveFmt.text}</span>
                ) : (
                  <span className="text-faint">·</span>
                )}
              </span>

              <span
                className={cn(
                  "mono w-24 shrink-0 text-right text-sm",
                  isGold ? "text-gold" : recorded ? "text-fg" : "text-faint",
                )}
              >
                {timeText}
              </span>
            </li>
          );
        })}
      </ul>

      {/* finish / save panel */}
      {finished && (
        <div className="panel fade-up mt-3 p-4">
          {saveState === "saved" ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="font-semibold text-fg">
                  {isNewPB ? "🏆 New personal best!" : "Run saved"}
                </p>
                <p className="mono text-sm text-muted">
                  {formatMs(comparison?.pb?.totalMs ?? null)}
                </p>
              </div>
              <div className="flex gap-2">
                {savedRunId != null && (
                  <Link
                    href={`/runs/${savedRunId}`}
                    className="rounded-lg border border-line px-4 py-2 text-sm text-fg hover:border-line-bright"
                  >
                    View / edit
                  </Link>
                )}
                <button
                  onClick={newRun}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink hover:brightness-110"
                >
                  Run again
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="font-semibold text-fg">Run complete</p>
                {saveState === "error" && (
                  <p className="text-sm text-behind">Couldn&apos;t save — check the DB.</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={newRun}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:border-line-bright hover:text-fg"
                >
                  Discard
                </button>
                <button
                  onClick={saveRun}
                  disabled={saveState === "saving"}
                  className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60"
                >
                  {saveState === "saving" ? "Saving…" : "Save run"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {engine.status === "idle" && (
          <button
            onClick={engine.start}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-accent text-base font-semibold text-ink hover:brightness-110 ring-focus"
          >
            Start run <Kbd code={kb.bindings.split} />
          </button>
        )}

        {engine.status === "running" && (
          <>
            <button
              onClick={engine.split}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-accent text-base font-semibold text-ink hover:brightness-110 ring-focus"
            >
              Split <Kbd code={kb.bindings.split} />
            </button>
            <button
              onClick={engine.skip}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-line text-sm text-fg hover:border-line-bright"
            >
              Skip <Kbd code={kb.bindings.skip} />
            </button>
            <button
              onClick={engine.undo}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-line text-sm text-fg hover:border-line-bright"
            >
              Undo <Kbd code={kb.bindings.undo} />
            </button>
            <button
              onClick={engine.togglePause}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-line text-sm text-fg hover:border-line-bright"
            >
              Pause <Kbd code={kb.bindings.pause} />
            </button>
          </>
        )}

        {engine.status === "paused" && (
          <>
            <button
              onClick={engine.resume}
              className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-accent text-base font-semibold text-ink hover:brightness-110 ring-focus"
            >
              Resume <Kbd code={kb.bindings.pause} />
            </button>
            <button
              onClick={engine.reset}
              className="flex h-12 flex-1 items-center justify-center rounded-lg border border-line text-sm text-muted hover:border-line-bright hover:text-fg"
            >
              Reset
            </button>
          </>
        )}

        {(engine.status === "running" || engine.status === "paused") && (
          <button
            onClick={engine.reset}
            title="Reset run"
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[rgba(255,93,93,0.4)] px-4 text-sm text-behind hover:bg-[rgba(255,93,93,0.1)]"
          >
            Reset <Kbd code={kb.bindings.reset} />
          </button>
        )}

        {finished && (
          <button
            onClick={engine.undo}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm text-muted hover:border-line-bright hover:text-fg"
          >
            Undo last split <Kbd code={kb.bindings.undo} />
          </button>
        )}
      </div>

      <p className="mt-3 text-center text-[0.7rem] text-faint">
        Keep this window focused for key input · press{" "}
        <span className="text-muted">{keyLabel(kb.bindings.split)}</span> to split
      </p>

      <KeybindingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} kb={kb} />
    </main>
  );
}
