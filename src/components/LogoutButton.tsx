"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      disabled={busy}
      className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-bright hover:text-fg ring-focus"
    >
      Log out
    </button>
  );
}
