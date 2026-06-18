"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function AuthForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — is the database configured? See README.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Your name</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          placeholder="e.g. ryan"
          className="h-12 rounded-lg border border-line bg-surface-2 px-4 text-fg placeholder:text-faint ring-focus"
          required
        />
      </label>

      {error && (
        <p className="rounded-lg border border-[rgba(255,93,93,0.35)] bg-[rgba(255,93,93,0.08)] px-3.5 py-2.5 text-sm text-behind">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
        {loading ? "…" : "Start tracking →"}
      </Button>

      <p className="text-center text-xs text-faint">
        No password — your name is your account. First time? It&apos;s created
        automatically.
      </p>
    </form>
  );
}
