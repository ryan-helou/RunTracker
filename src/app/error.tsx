"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="mono text-6xl font-bold text-behind timer-glow-behind">!</p>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">Something broke</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {error?.message || "An unexpected error occurred."}
      </p>
      <div className="mt-6 flex gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-ink hover:brightness-110"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-line px-5 py-2 text-sm text-fg hover:border-line-bright"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
