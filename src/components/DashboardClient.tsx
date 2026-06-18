"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GAMES } from "@/lib/catalog";
import type { RunRecord } from "@/lib/types";
import { formatMs, formatDate } from "@/lib/format";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/cn";

interface Summary {
  runCount: number;
  pbMs: number | null;
}

export function DashboardClient({
  username,
  initialRuns,
  dbError,
}: {
  username: string;
  initialRuns: RunRecord[];
  dbError: string | null;
}) {
  const [selected, setSelected] = useState(GAMES[0]?.key ?? "");

  const summaries = useMemo(() => {
    const map = new Map<string, Summary>();
    for (const r of initialRuns) {
      const key = `${r.gameKey}/${r.categoryKey}`;
      const cur = map.get(key) ?? { runCount: 0, pbMs: null };
      cur.runCount += 1;
      if (r.completed && r.totalMs != null && (cur.pbMs == null || r.totalMs < cur.pbMs)) {
        cur.pbMs = r.totalMs;
      }
      map.set(key, cur);
    }
    return map;
  }, [initialRuns]);

  const runsPerGame = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of initialRuns) map.set(r.gameKey, (map.get(r.gameKey) ?? 0) + 1);
    return map;
  }, [initialRuns]);

  const game = GAMES.find((g) => g.key === selected) ?? GAMES[0];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="fade-up">
        <p className="eyebrow">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Ready to run, <span className="text-accent">{username}</span>?
        </h1>
      </div>

      {dbError && (
        <div className="mt-6 rounded-xl border border-[rgba(255,93,93,0.35)] bg-[rgba(255,93,93,0.07)] px-4 py-3 text-sm text-behind">
          <strong className="font-semibold">Database not reachable.</strong>{" "}
          Add your Neon connection string to <span className="mono">.env.local</span>{" "}
          and run <span className="mono">npm run db:push</span>. ({dbError})
        </div>
      )}

      {/* Game selector */}
      <section className="mt-9">
        <p className="eyebrow mb-3">Choose a game</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {GAMES.map((g) => {
            const active = g.key === selected;
            return (
              <button
                key={g.key}
                onClick={() => setSelected(g.key)}
                style={active ? { borderColor: g.accent } : undefined}
                className={cn(
                  "panel group relative overflow-hidden p-5 text-left transition-all ring-focus",
                  active ? "ring-1" : "opacity-80 hover:opacity-100",
                )}
              >
                <div
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: g.accent, opacity: active ? 1 : 0.3 }}
                />
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: g.accent }}
                  >
                    {g.shortName}
                  </span>
                  <span className="text-xs text-faint">
                    {runsPerGame.get(g.key) ?? 0} runs
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-tight text-fg">
                  {g.name}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{g.blurb}</p>
                <p className="mt-3 text-xs text-faint">
                  {g.categories.length} categories
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Categories for selected game */}
      <section className="mt-9 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow mb-3">{game.name} · categories</p>
          <ul className="flex flex-col gap-2">
            {game.categories.map((c) => {
              const sum = summaries.get(`${game.key}/${c.key}`);
              return (
                <li
                  key={c.key}
                  className="panel flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-fg">{c.name}</span>
                      <span className="rounded border border-line px-1.5 py-0.5 text-[0.6rem] text-faint">
                        {c.splits.length} splits
                      </span>
                    </div>
                    {c.description && (
                      <p className="mt-0.5 truncate text-xs text-muted">{c.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <div className="mono text-sm font-semibold text-fg">
                        {sum?.pbMs != null ? formatMs(sum.pbMs) : "—"}
                      </div>
                      <div className="text-[0.6rem] uppercase tracking-wider text-faint">
                        {sum?.pbMs != null ? "PB" : "no PB yet"}
                      </div>
                    </div>
                    <Link
                      href={`/stats/${game.key}/${c.key}`}
                      className="text-xs text-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                    >
                      Stats
                    </Link>
                    <Link
                      href={`/play/${game.key}/${c.key}`}
                      className={buttonClass("primary", "sm")}
                    >
                      Start →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Recent runs */}
        <div>
          <p className="eyebrow mb-3">Recent runs</p>
          {initialRuns.length === 0 ? (
            <div className="panel px-4 py-8 text-center text-sm text-muted">
              No runs yet. Pick a category and hit Start.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {initialRuns.slice(0, 12).map((r) => {
                const g = GAMES.find((x) => x.key === r.gameKey);
                const cat = g?.categories.find((c) => c.key === r.categoryKey);
                const sum = summaries.get(`${r.gameKey}/${r.categoryKey}`);
                const isPB = r.completed && r.totalMs != null && r.totalMs === sum?.pbMs;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/runs/${r.id}`}
                      className="panel flex items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:border-line-bright"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[0.6rem] font-bold tracking-widest"
                            style={{ color: g?.accent ?? "var(--color-muted)" }}
                          >
                            {g?.shortName ?? r.gameKey}
                          </span>
                          {isPB && (
                            <span className="rounded bg-[rgba(255,210,74,0.15)] px-1.5 py-0.5 text-[0.6rem] font-semibold text-gold">
                              PB
                            </span>
                          )}
                          {!r.completed && (
                            <span className="text-[0.6rem] text-faint">incomplete</span>
                          )}
                        </div>
                        <div className="truncate text-sm text-fg">
                          {cat?.name ?? r.categoryKey}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="mono text-sm font-semibold text-fg">
                          {formatMs(r.totalMs)}
                        </div>
                        <div className="text-[0.6rem] text-faint">
                          {formatDate(r.createdAt)}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
