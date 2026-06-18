"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

export type RunStatus = "idle" | "running" | "paused" | "finished";

export interface LiveSplit {
  name: string;
  cumulativeMs: number | null;
  segmentMs: number | null;
  skipped: boolean;
}

interface Clock {
  t0: number; // performance.now() when the current running interval began
  base: number; // accumulated elapsed before the current interval
  running: boolean;
}

function freshSplits(names: string[]): LiveSplit[] {
  return names.map((name) => ({
    name,
    cumulativeMs: null,
    segmentMs: null,
    skipped: false,
  }));
}

function elapsedOf(c: Clock): number {
  return c.running ? c.base + (performance.now() - c.t0) : c.base;
}

export interface RunEngine {
  status: RunStatus;
  currentIndex: number;
  splits: LiveSplit[];
  elapsedMs: number;
  start: () => void;
  split: () => void;
  skip: () => void;
  undo: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  reset: () => void;
  finish: () => void;
}

/**
 * RTA timing engine: one continuous monotonic clock. A "split" records the
 * cumulative elapsed time at that moment; the per-segment time is derived as the
 * difference from the previous recorded split. Source of truth lives in refs so
 * keypress handlers never read stale state; a render counter drives the UI.
 */
export function useRunEngine(splitNames: string[]): RunEngine {
  const namesKey = splitNames.join("␟");

  const clock = useRef<Clock>({ t0: 0, base: 0, running: false });
  const splitsRef = useRef<LiveSplit[]>(freshSplits(splitNames));
  const indexRef = useRef(0);
  const statusRef = useRef<RunStatus>("idle");
  const raf = useRef<number | null>(null);

  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const stopRaf = useCallback(() => {
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, []);

  const loop = useCallback(() => {
    forceRender();
    raf.current = clock.current.running ? requestAnimationFrame(loop) : null;
  }, []);

  const startRaf = useCallback(() => {
    if (raf.current == null) raf.current = requestAnimationFrame(loop);
  }, [loop]);

  // Reset everything when the category (its split list) changes.
  useEffect(() => {
    stopRaf();
    clock.current = { t0: 0, base: 0, running: false };
    splitsRef.current = freshSplits(splitNames);
    indexRef.current = 0;
    statusRef.current = "idle";
    forceRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey]);

  useEffect(() => stopRaf, [stopRaf]);

  const prevCumulative = (splits: LiveSplit[], index: number): number => {
    for (let i = index - 1; i >= 0; i--) {
      if (splits[i].cumulativeMs != null) return splits[i].cumulativeMs as number;
    }
    return 0;
  };

  const finishInternal = useCallback(
    (finalMs: number) => {
      clock.current = { t0: 0, base: finalMs, running: false };
      statusRef.current = "finished";
      stopRaf();
      forceRender();
    },
    [stopRaf],
  );

  const start = useCallback(() => {
    clock.current = { t0: performance.now(), base: 0, running: true };
    splitsRef.current = freshSplits(splitNames);
    indexRef.current = 0;
    statusRef.current = "running";
    startRaf();
    forceRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey, startRaf]);

  const split = useCallback(() => {
    if (statusRef.current !== "running") return;
    const now = elapsedOf(clock.current);
    const i = indexRef.current;
    const splits = splitsRef.current.slice();
    if (i >= splits.length) return;
    const prev = prevCumulative(splits, i);
    splits[i] = { ...splits[i], cumulativeMs: now, segmentMs: now - prev, skipped: false };
    splitsRef.current = splits;
    if (i + 1 >= splits.length) finishInternal(now);
    else {
      indexRef.current = i + 1;
      forceRender();
    }
  }, [finishInternal]);

  const skip = useCallback(() => {
    if (statusRef.current !== "running") return;
    const i = indexRef.current;
    const splits = splitsRef.current.slice();
    if (i >= splits.length) return;
    splits[i] = { ...splits[i], cumulativeMs: null, segmentMs: null, skipped: true };
    splitsRef.current = splits;
    if (i + 1 >= splits.length) finishInternal(elapsedOf(clock.current));
    else {
      indexRef.current = i + 1;
      forceRender();
    }
  }, [finishInternal]);

  const undo = useCallback(() => {
    if (statusRef.current === "idle") return;
    let i = indexRef.current;
    if (statusRef.current === "finished") {
      // Re-open the run and continue timing from where it ended.
      clock.current = { t0: performance.now(), base: clock.current.base, running: true };
      statusRef.current = "running";
      startRaf();
      i = splitsRef.current.length;
    }
    const target = Math.max(0, i - 1);
    const splits = splitsRef.current.slice();
    splits[target] = {
      ...splits[target],
      cumulativeMs: null,
      segmentMs: null,
      skipped: false,
    };
    splitsRef.current = splits;
    indexRef.current = target;
    forceRender();
  }, [startRaf]);

  const pause = useCallback(() => {
    if (statusRef.current !== "running") return;
    clock.current = { t0: 0, base: elapsedOf(clock.current), running: false };
    statusRef.current = "paused";
    stopRaf();
    forceRender();
  }, [stopRaf]);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return;
    clock.current = { t0: performance.now(), base: clock.current.base, running: true };
    statusRef.current = "running";
    startRaf();
    forceRender();
  }, [startRaf]);

  const togglePause = useCallback(() => {
    if (statusRef.current === "running") pause();
    else if (statusRef.current === "paused") resume();
  }, [pause, resume]);

  const reset = useCallback(() => {
    stopRaf();
    clock.current = { t0: 0, base: 0, running: false };
    splitsRef.current = freshSplits(splitNames);
    indexRef.current = 0;
    statusRef.current = "idle";
    forceRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namesKey, stopRaf]);

  const finish = useCallback(() => {
    const s = statusRef.current;
    if (s === "running" || s === "paused") finishInternal(elapsedOf(clock.current));
  }, [finishInternal]);

  return {
    status: statusRef.current,
    currentIndex: indexRef.current,
    splits: splitsRef.current,
    elapsedMs: elapsedOf(clock.current),
    start,
    split,
    skip,
    undo,
    pause,
    resume,
    togglePause,
    reset,
    finish,
  };
}
