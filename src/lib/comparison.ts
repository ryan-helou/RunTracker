import type { RunRecord, Comparison } from "./types";

/**
 * Derives all comparison data for a category from a user's run history:
 *  - Personal Best (lowest total time among completed runs)
 *  - PB cumulative splits (the pace line we compare against live)
 *  - Gold segments (best-ever time for each individual split)
 *  - Sum of Best (best possible time if every segment were a gold)
 */
export function computeComparison(runs: RunRecord[]): Comparison {
  const completed = runs.filter((r) => r.completed && r.totalMs != null);

  let pb: RunRecord | null = null;
  for (const r of completed) {
    if (!pb || (r.totalMs as number) < (pb.totalMs as number)) pb = r;
  }

  const pbCumulative = pb ? pb.splits.map((s) => s.cumulativeMs) : [];

  const maxLen = runs.reduce((m, r) => Math.max(m, r.splits.length), 0);
  const goldSegments: (number | null)[] = [];
  for (let i = 0; i < maxLen; i++) {
    let best: number | null = null;
    for (const r of runs) {
      const s = r.splits[i];
      if (s && !s.skipped && s.segmentMs != null && s.segmentMs > 0) {
        if (best == null || s.segmentMs < best) best = s.segmentMs;
      }
    }
    goldSegments.push(best);
  }

  const allGold = goldSegments.length > 0 && goldSegments.every((g) => g != null);
  const sumOfBest = allGold
    ? goldSegments.reduce((a, b) => a + (b as number), 0)
    : null;

  return { pb, pbCumulative, goldSegments, sumOfBest, runCount: runs.length };
}
