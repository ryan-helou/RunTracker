"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { computeComparison } from "@/lib/comparison";
import { formatMs, formatDelta, formatDate } from "@/lib/format";
import type { RunRecord } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Props {
  gameKey: string;
  categoryKey: string;
  gameShort: string;
  accent: string;
  categoryName: string;
  splitNames: string[];
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="panel px-3 py-3 text-center">
      <div className={cn("mono text-base font-semibold", tone ?? "text-fg")}>{value}</div>
      <div className="mt-0.5 text-[0.6rem] uppercase tracking-wider text-faint">{label}</div>
    </div>
  );
}

/** Running-minimum (PB-over-time) line chart of completed runs. */
function PbChart({ runs, accent }: { runs: RunRecord[]; accent: string }) {
  const completed = useMemo(
    () =>
      runs
        .filter((r) => r.completed && r.totalMs != null)
        .slice()
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [runs],
  );

  if (completed.length < 2) {
    return (
      <div className="panel px-4 py-8 text-center text-sm text-muted">
        {completed.length === 0
          ? "No finished runs yet."
          : "Finish a couple more runs to see your PB progression."}
      </div>
    );
  }

  const W = 640;
  const H = 180;
  const pad = 26;
  const totals = completed.map((r) => r.totalMs as number);
  const runningMin: number[] = [];
  totals.reduce((min, t, i) => {
    const m = Math.min(min, t);
    runningMin[i] = m;
    return m;
  }, Infinity);

  const yMax = Math.max(...totals);
  const yMin = Math.min(...totals);
  const span = yMax - yMin || 1;
  const n = completed.length;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (n - 1);
  const y = (v: number) => H - pad - ((v - yMin) / span) * (H - 2 * pad);

  const minLine = runningMin.map((v, i) => `${x(i)},${y(v)}`).join(" ");

  return (
    <div className="panel p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="PB progression">
        {/* baseline */}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--color-line)" strokeWidth="1" />
        {/* PB progression line */}
        <polyline points={minLine} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
        {/* each attempt as a dot */}
        {totals.map((t, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(t)}
            r={t === runningMin[i] ? 4 : 2.5}
            fill={t === runningMin[i] ? "var(--color-gold)" : "var(--color-faint)"}
          >
            <title>{`${formatMs(t)} · ${formatDate(completed[i].createdAt)}`}</title>
          </circle>
        ))}
        {/* y labels */}
        <text x={pad} y={y(yMin) - 6} fill="var(--color-muted)" fontSize="11" className="mono">
          {formatMs(yMin)}
        </text>
        <text x={pad} y={y(yMax) + 14} fill="var(--color-faint)" fontSize="11" className="mono">
          {formatMs(yMax)}
        </text>
      </svg>
      <p className="mt-1 text-center text-[0.65rem] text-faint">
        PB over time · gold dots are new records
      </p>
    </div>
  );
}

export function StatsClient(props: Props) {
  const { gameKey, categoryKey, gameShort, accent, categoryName, splitNames } = props;
  const [runs, setRuns] = useState<RunRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/runs?game=${encodeURIComponent(gameKey)}&category=${encodeURIComponent(categoryKey)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) setError(d.error ?? "Failed to load runs.");
        else setRuns(d.runs ?? []);
      })
      .catch(() => !cancelled && setError("Network error."));
    return () => {
      cancelled = true;
    };
  }, [gameKey, categoryKey]);

  const cmp = useMemo(() => (runs ? computeComparison(runs) : null), [runs]);

  const derived = useMemo(() => {
    if (!runs) return null;
    const finishes = runs.filter((r) => r.completed && r.totalMs != null).length;
    const totalPlayed = runs.reduce((sum, r) => sum + (r.totalMs ?? 0), 0);
    const golds = (cmp?.goldSegments ?? []).filter((g) => g != null).length;
    return {
      logged: runs.length,
      finishes,
      finishRate: runs.length ? Math.round((finishes / runs.length) * 100) : 0,
      totalPlayed,
      golds,
    };
  }, [runs, cmp]);

  const pbTotal = cmp?.pb?.totalMs ?? null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link href="/dashboard" className="text-sm text-muted transition-colors hover:text-fg">
        ← Dashboard
      </Link>
      <div className="mt-3 flex items-baseline gap-2.5">
        <span className="text-xs font-bold tracking-widest" style={{ color: accent }}>
          {gameShort}
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{categoryName}</h1>
        <Link
          href={`/play/${gameKey}/${categoryKey}`}
          className="ml-auto rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-ink hover:brightness-110"
        >
          Run it →
        </Link>
      </div>
      <p className="mt-0.5 text-xs text-muted">Stats &amp; history</p>

      {error && (
        <div className="mt-6 panel px-4 py-4 text-sm text-behind">{error}</div>
      )}

      {!runs && !error && (
        <div className="mt-6 panel px-4 py-10 text-center text-sm text-muted">Loading…</div>
      )}

      {runs && derived && runs.length === 0 && (
        <div className="mt-6 panel px-4 py-10 text-center text-sm text-muted">
          No runs logged yet. Go set a time and it&apos;ll show up here.
        </div>
      )}

      {runs && derived && runs.length > 0 && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Personal Best" value={formatMs(pbTotal)} tone="text-accent" />
            <Stat label="Sum of Best" value={formatMs(cmp?.sumOfBest ?? null)} tone="text-gold" />
            <Stat label="Golds" value={`${derived.golds}/${splitNames.length}`} tone="text-gold" />
            <Stat label="Finishes" value={`${derived.finishes}/${derived.logged}`} />
            <Stat label="Finish rate" value={`${derived.finishRate}%`} />
            <Stat label="Total time" value={formatMs(derived.totalPlayed, { showCentis: false })} />
          </div>

          <h2 className="eyebrow mt-8 mb-3">PB progression</h2>
          <PbChart runs={runs} accent={accent} />

          {/* best segments */}
          <h2 className="eyebrow mt-8 mb-3">Your gold segments</h2>
          <ul className="flex flex-col gap-1">
            {splitNames.map((name, i) => {
              const g = cmp?.goldSegments[i] ?? null;
              return (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface/60 px-3.5 py-2"
                >
                  <span className="flex items-center gap-2 text-sm text-fg">
                    <span className="mono w-6 text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                    {name}
                  </span>
                  <span className={cn("mono text-sm", g != null ? "text-gold" : "text-faint")}>
                    {formatMs(g)}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* all attempts */}
          <h2 className="eyebrow mt-8 mb-3">All runs ({runs.length})</h2>
          <ul className="flex flex-col gap-1.5">
            {runs.map((r) => {
              const delta =
                r.completed && r.totalMs != null && pbTotal != null ? r.totalMs - pbTotal : null;
              const dfmt = formatDelta(delta);
              const isPB = r.completed && r.totalMs != null && r.totalMs === pbTotal;
              return (
                <li key={r.id}>
                  <Link
                    href={`/runs/${r.id}`}
                    className="panel flex items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:border-line-bright"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {isPB && (
                        <span className="rounded bg-[rgba(255,210,74,0.15)] px-1.5 py-0.5 text-[0.6rem] font-semibold text-gold">
                          PB
                        </span>
                      )}
                      {r.mode === "coop" && (
                        <span className="rounded bg-[rgba(109,184,255,0.15)] px-1.5 py-0.5 text-[0.6rem] font-semibold text-best">
                          CO-OP
                        </span>
                      )}
                      {!r.completed && <span className="text-[0.6rem] text-faint">incomplete</span>}
                      {r.name && <span className="truncate text-sm text-fg">{r.name}</span>}
                      <span className="shrink-0 text-xs text-muted">{formatDate(r.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-4">
                      {dfmt && !isPB && (
                        <span className={cn("mono text-xs", dfmt.ahead ? "text-ahead" : "text-behind")}>
                          {dfmt.text}
                        </span>
                      )}
                      <span className="mono w-24 text-right text-sm font-semibold text-fg">
                        {formatMs(r.totalMs)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
