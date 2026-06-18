"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "./Brand";
import { LogoutButton } from "./LogoutButton";
import { KeybindingsModal } from "./KeybindingsModal";
import { useKeybindings } from "@/hooks/useKeybindings";

export function TopBar({ username }: { username: string }) {
  const kb = useKeybindings();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/dashboard" className="ring-focus rounded">
          <Brand size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-bright hover:text-fg ring-focus"
          >
            ⌨ Keys
          </button>
          <span className="hidden rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs text-fg sm:inline">
            {username}
          </span>
          <LogoutButton />
        </div>
      </div>
      <KeybindingsModal open={open} onClose={() => setOpen(false)} kb={kb} />
    </header>
  );
}
