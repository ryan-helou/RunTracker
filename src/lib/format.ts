/** Formats a duration in milliseconds as a clock string, e.g. 1:23.45 or 1:02:03.4 */
export function formatMs(
  ms: number | null | undefined,
  opts: { showCentis?: boolean; showHours?: boolean } = {},
): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const showCentis = opts.showCentis ?? true;
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const cs = Math.floor((abs % 1000) / 10);
  const pad = (n: number) => String(n).padStart(2, "0");

  let core: string;
  if (h > 0 || opts.showHours) core = `${h}:${pad(m)}:${pad(s)}`;
  else core = `${m}:${pad(s)}`;
  if (showCentis) core += `.${pad(cs)}`;
  return (ms < 0 ? "−" : "") + core;
}

export interface Delta {
  text: string;
  /** true = ahead of comparison (faster, shown green); false = behind (slower, red) */
  ahead: boolean;
}

/** Formats a +/- delta against a comparison time. Negative = ahead (green). */
export function formatDelta(ms: number | null | undefined): Delta | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  const ahead = ms < 0;
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const cs = Math.floor((abs % 1000) / 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  const core = m > 0 ? `${m}:${pad(s)}.${pad(cs)}` : `${s}.${pad(cs)}`;
  return { text: (ahead ? "−" : "+") + core, ahead };
}

/** Parses a clock string like "1:23.45", "0:31.2", or "1:02:03.4" into ms. */
export function parseTimeToMs(input: string): number | null {
  const t = input.trim();
  if (!t || !/^[0-9:.]+$/.test(t)) return null;
  const parts = t.split(":");
  if (parts.length > 3) return null;
  const secPart = parts.pop() as string;
  const [sStr, csRaw = ""] = secPart.split(".");
  const sec = Number(sStr || "0");
  const cs = Number((csRaw + "00").slice(0, 2));
  let h = 0;
  let m = 0;
  if (parts.length === 1) m = Number(parts[0]);
  else if (parts.length === 2) {
    h = Number(parts[0]);
    m = Number(parts[1]);
  }
  if (![h, m, sec, cs].every((n) => Number.isFinite(n))) return null;
  return ((h * 60 + m) * 60 + sec) * 1000 + cs * 10;
}

/** Short relative date for run history, e.g. "Jun 18" or "2:14 PM". */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
