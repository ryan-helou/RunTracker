"use client";

import { useEffect, useState } from "react";
import { GAMES } from "@/lib/catalog";
import { formatMs, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Entry {
  rank: number;
  username: string;
  bestMs: number;
  runCount: number;
  lastAt: string;
}

const medal = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `#${r}`);

export function LeaderboardClient({ currentUsername }: { currentUsername: string }) {
  const [gameKey, setGameKey] = useState(GAMES[0]?.key ?? "");
  const game = GAMES.find((g) => g.key === gameKey) ?? GAMES[0];
  const [categoryKey, setCategoryKey] = useState(game.categories[0]?.key ?? "");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function selectGame(key: string) {
    const g = GAMES.find((x) => x.key === key);
    setGameKey(key);
    setCategoryKey(g?.categories[0]?.key ?? "");
  }

  useEffect(() => {
    if (!gameKey || !categoryKey) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?game=${encodeURIComponent(gameKey)}&category=${encodeURIComponent(categoryKey)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) {
          setError(d.error ?? "Failed to load leaderboard.");
          setEntries([]);
        } else {
          setEntries(d.entries ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Network error.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameKey, categoryKey]);

  const me = currentUsername.toLowerCase();
  const myEntry = entries.find((e) => e.username.toLowerCase() === me);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="fade-up">
        <p className="eyebrow">Shared leaderboard</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Best times, all players</h1>
        <p className="mt-1 text-sm text-muted">
          Everyone&apos;s fastest completed run in each category, ranked.
        </p>
      </div>

      {/* game tabs */}
      <div className="mt-7 flex flex-wrap gap-2">
        {GAMES.map((g) => {
          const active = g.key === gameKey;
          return (
            <button
              key={g.key}
              onClick={() => selectGame(g.key)}
              style={active ? { borderColor: g.accent, color: g.accent } : undefined}
              className={cn(
                "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors ring-focus",
                active ? "bg-surface-2" : "border-line text-muted hover:text-fg",
              )}
            >
              {g.shortName}
            </button>
          );
        })}
      </div>

      {/* category select */}
      <div className="mt-4">
        <label className="eyebrow">Category</label>
        <select
          value={categoryKey}
          onChange={(e) => setCategoryKey(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-fg ring-focus"
        >
          {game.categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* rankings */}
      <div className="mt-6">
        {loading ? (
          <div className="panel px-4 py-10 text-center text-sm text-muted">Loading…</div>
        ) : error ? (
          <div className="panel px-4 py-6 text-center text-sm text-behind">{error}</div>
        ) : entries.length === 0 ? (
          <div className="panel px-4 py-10 text-center text-sm text-muted">
            No finished runs in this category yet. Be the first — go set a time!
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((e) => {
              const isMe = e.username.toLowerCase() === me;
              return (
                <li
                  key={e.username}
                  className={cn(
                    "panel flex items-center gap-4 px-4 py-3",
                    isMe && "border-accent/60 bg-[rgba(255,178,36,0.06)]",
                  )}
                >
                  <span
                    className={cn(
                      "mono w-10 shrink-0 text-center text-lg font-bold",
                      e.rank === 1 ? "text-gold" : "text-muted",
                    )}
                  >
                    {medal(e.rank)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-fg">{e.username}</span>
                      {isMe && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[0.6rem] font-semibold text-accent">
                          you
                        </span>
                      )}
                    </div>
                    <div className="text-[0.65rem] text-faint">
                      {e.runCount} run{e.runCount === 1 ? "" : "s"} · last {formatDate(e.lastAt)}
                    </div>
                  </div>
                  <span className="mono shrink-0 text-lg font-bold text-fg">
                    {formatMs(e.bestMs)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !error && entries.length > 0 && !myEntry && (
          <p className="mt-4 text-center text-xs text-faint">
            You&apos;re not on this board yet — finish a run in {game.categories.find((c) => c.key === categoryKey)?.name} to claim a spot.
          </p>
        )}
      </div>
    </main>
  );
}
