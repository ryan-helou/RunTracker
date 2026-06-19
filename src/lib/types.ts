/** A single recorded split within a run. */
export interface RunSplit {
  /** Split label, copied from the category definition at run time. */
  name: string;
  /** Cumulative elapsed time (ms) when this split was hit. null = not reached / skipped. */
  cumulativeMs: number | null;
  /** Time spent on this segment (ms) = cumulative - previous cumulative. null if unknown. */
  segmentMs: number | null;
  /** True if the runner skipped this split (no time recorded). */
  skipped?: boolean;
}

/** A run as stored in the database / returned by the API. */
export interface RunRecord {
  id: number;
  userId: number;
  gameKey: string;
  categoryKey: string;
  totalMs: number | null;
  completed: boolean;
  splits: RunSplit[];
  note: string;
  name: string;
  mode: "solo" | "coop";
  createdAt: string;
}

/** Per-category comparison data computed from a user's run history. */
export interface Comparison {
  /** The personal-best run (lowest total time, completed) or null if none yet. */
  pb: RunRecord | null;
  /** Best-ever cumulative time at each split index (from the PB). null where unknown. */
  pbCumulative: (number | null)[];
  /** Best-ever segment time at each split index across all runs ("gold"). null where unknown. */
  goldSegments: (number | null)[];
  /** Sum of best segments (best possible time) in ms, or null if incomplete. */
  sumOfBest: number | null;
  /** How many runs exist for this category. */
  runCount: number;
}

export interface PublicUser {
  id: number;
  username: string;
}
