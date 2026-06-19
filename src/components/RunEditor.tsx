"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMs, formatDelta, formatDate, parseTimeToMs } from "@/lib/format";
import type { RunRecord, RunSplit, Comparison } from "@/lib/types";
import { cn } from "@/lib/cn";

interface Row {
  name: string;
  cumulativeStr: string;
  skipped: boolean;
}

export function RunEditor({
  run,
  gameShort,
  accent,
  categoryName,
  comparison,
}: {
  run: RunRecord;
  gameShort: string;
  accent: string;
  categoryName: string;
  comparison: Comparison | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    run.splits.map((s) => ({
      name: s.name,
      cumulativeStr: s.cumulativeMs != null ? formatMs(s.cumulativeMs) : "",
      skipped: !!s.skipped,
    })),
  );
  const [note, setNote] = useState(run.note);
  const [completed, setCompleted] = useState(run.completed);
  const [name, setName] = useState(run.name);
  const [mode, setMode] = useState<"solo" | "coop">(run.mode === "coop" ? "coop" : "solo");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number>(0);

  // Build the splits payload + derived total, validating times.
  const { payload, total, invalid } = useMemo(() => {
    const out: RunSplit[] = [];
    let prev = 0;
    let bad = false;
    let last: number | null = null;
    for (const r of rows) {
      if (r.skipped || !r.cumulativeStr.trim()) {
        out.push({ name: r.name, cumulativeMs: null, segmentMs: null, skipped: r.skipped });
        continue;
      }
      const cum = parseTimeToMs(r.cumulativeStr);
      if (cum == null) {
        bad = true;
        out.push({ name: r.name, cumulativeMs: null, segmentMs: null, skipped: false });
        continue;
      }
      out.push({ name: r.name, cumulativeMs: cum, segmentMs: cum - prev, skipped: false });
      prev = cum;
      last = cum;
    }
    return { payload: out, total: last, invalid: bad };
  }, [rows]);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    if (invalid) {
      setError("Some times couldn't be parsed. Use m:ss.cs (e.g. 1:23.45).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ splits: payload, note, completed, name: name.trim(), mode }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Save failed.");
      } else {
        setSavedAt(Date.now());
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this run permanently?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/runs/${run.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Delete failed.");
        setDeleting(false);
      }
    } catch {
      setError("Network error.");
      setDeleting(false);
    }
  }

  const pbCum = comparison?.pbCumulative ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-6">
      <Link href="/dashboard" className="text-sm text-muted transition-colors hover:text-fg">
        ← Dashboard
      </Link>

      <div className="mt-3 flex items-baseline gap-2.5">
        <span className="text-xs font-bold tracking-widest" style={{ color: accent }}>
          {gameShort}
        </span>
        <h1 className="text-lg font-semibold tracking-tight">{categoryName}</h1>
        <span className="ml-auto text-xs text-faint">{formatDate(run.createdAt)}</span>
      </div>

      <div className="panel mt-4 px-5 py-4 text-center">
        <div className="mono text-4xl font-bold text-accent timer-glow">
          {formatMs(total)}
        </div>
        <div className="mt-1 text-[0.65rem] uppercase tracking-wider text-faint">
          Final time
        </div>
      </div>

      {/* editable splits */}
      <ul className="mt-4 flex flex-col gap-1">
        <li className="flex items-center gap-3 px-3 pb-1 text-[0.6rem] uppercase tracking-wider text-faint">
          <span className="w-6">#</span>
          <span className="flex-1">Split</span>
          <span className="w-16 text-right">Δ PB</span>
          <span className="w-28 text-right">Cumulative</span>
          <span className="w-10 text-center">Skip</span>
        </li>
        {rows.map((r, i) => {
          const cum = payload[i]?.cumulativeMs ?? null;
          const pc = pbCum[i] ?? null;
          const delta = cum != null && pc != null ? cum - pc : null;
          const dfmt = formatDelta(delta);
          return (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface/60 px-3 py-2"
            >
              <span className="mono w-6 text-xs text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate text-sm text-fg">{r.name}</span>
              <span className="mono w-16 text-right text-xs font-semibold">
                {dfmt ? (
                  <span className={dfmt.ahead ? "text-ahead" : "text-behind"}>
                    {dfmt.text}
                  </span>
                ) : (
                  <span className="text-faint">·</span>
                )}
              </span>
              <input
                value={r.cumulativeStr}
                disabled={r.skipped}
                onChange={(e) => setRow(i, { cumulativeStr: e.target.value })}
                placeholder="m:ss.cs"
                className="mono h-9 w-28 rounded-md border border-line bg-surface-2 px-2.5 text-right text-sm text-fg placeholder:text-faint ring-focus disabled:opacity-40"
              />
              <span className="flex w-10 justify-center">
                <input
                  type="checkbox"
                  checked={r.skipped}
                  onChange={(e) => setRow(i, { skipped: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
              </span>
            </li>
          );
        })}
      </ul>

      {/* details */}
      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Run name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Untitled run"
            className="h-11 rounded-lg border border-line bg-surface-2 px-3.5 text-sm text-fg placeholder:text-faint ring-focus"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Description</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything memorable about this run…"
            className="rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg placeholder:text-faint ring-focus"
          />
        </label>
        {run.gameKey === "nsmbw" && (
          <div className="flex items-center gap-2">
            <span className="eyebrow mr-1">Mode</span>
            {(["solo", "coop"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  mode === m
                    ? "border-accent bg-[rgba(255,178,36,0.12)] text-accent"
                    : "border-line text-muted hover:text-fg",
                )}
              >
                {m === "solo" ? "Solo" : "Co-op"}
              </button>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2.5 text-sm text-fg">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent)]"
          />
          Counts as a completed run (eligible for PB)
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-behind">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={remove}
          disabled={deleting}
          className="rounded-lg border border-[rgba(255,93,93,0.4)] px-4 py-2 text-sm text-behind hover:bg-[rgba(255,93,93,0.1)] disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete run"}
        </button>
        <div className="flex items-center gap-3">
          {savedAt > 0 && !saving && <span className="text-xs text-ahead">Saved</span>}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
