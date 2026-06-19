import type { RunRecord, RunSplit } from "./types";

type Row = Record<string, unknown>;

export function mapRun(row: Row): RunRecord {
  const created = row.created_at;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    gameKey: String(row.game_key),
    categoryKey: String(row.category_key),
    totalMs: row.total_ms == null ? null : Number(row.total_ms),
    completed: Boolean(row.completed),
    splits: Array.isArray(row.splits) ? (row.splits as RunSplit[]) : [],
    note: String(row.note ?? ""),
    name: String(row.name ?? ""),
    mode: row.mode === "coop" ? "coop" : "solo",
    createdAt:
      created instanceof Date ? created.toISOString() : String(created ?? ""),
  };
}

/** Coerces arbitrary input into a valid run mode. */
export function sanitizeMode(v: unknown): "solo" | "coop" {
  return v === "coop" ? "coop" : "solo";
}

/** Coerces arbitrary client input into a safe, bounded RunSplit[]. */
export function sanitizeSplits(input: unknown): RunSplit[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 500).map((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>;
    const cumulativeMs =
      typeof s.cumulativeMs === "number" && Number.isFinite(s.cumulativeMs)
        ? Math.round(s.cumulativeMs)
        : null;
    const segmentMs =
      typeof s.segmentMs === "number" && Number.isFinite(s.segmentMs)
        ? Math.round(s.segmentMs)
        : null;
    return {
      name: String(s.name ?? "").slice(0, 200),
      cumulativeMs,
      segmentMs,
      skipped: Boolean(s.skipped),
    };
  });
}

/** Final cumulative time of a run = the last split that has a recorded time. */
export function totalFromSplits(splits: RunSplit[]): number | null {
  let total: number | null = null;
  for (const s of splits) {
    if (s.cumulativeMs != null) total = s.cumulativeMs;
  }
  return total;
}
