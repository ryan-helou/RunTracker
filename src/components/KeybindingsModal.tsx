"use client";

import { useEffect, useState } from "react";
import { ACTION_LABELS, keyLabel, type BindableAction } from "@/lib/keys";
import { captureNextKey } from "@/hooks/useHotkey";
import type { useKeybindings } from "@/hooks/useKeybindings";

const ORDER: BindableAction[] = ["split", "undo", "skip", "pause", "reset"];

export function KeybindingsModal({
  open,
  onClose,
  kb,
}: {
  open: boolean;
  onClose: () => void;
  kb: ReturnType<typeof useKeybindings>;
}) {
  const [capturing, setCapturing] = useState<BindableAction | null>(null);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !capturing) onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose, capturing]);

  if (!open) return null;

  async function rebindAction(action: BindableAction) {
    setCapturing(action);
    const code = await captureNextKey();
    setCapturing(null);
    if (code) kb.rebind(action, code);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="panel fade-up w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Key bindings</h2>
            <p className="mt-0.5 text-sm text-muted">
              Bind any physical key. Click rebind, then press the key.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted transition-colors hover:text-fg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <ul className="mt-5 flex flex-col gap-2">
          {ORDER.map((action) => (
            <li
              key={action}
              className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3.5 py-2.5"
            >
              <span className="text-sm text-fg">{ACTION_LABELS[action]}</span>
              <button
                onClick={() => rebindAction(action)}
                className={`mono min-w-[7rem] rounded-md border px-3 py-1.5 text-center text-sm font-semibold transition-colors ring-focus ${
                  capturing === action
                    ? "border-accent bg-[rgba(255,178,36,0.12)] text-accent"
                    : "border-line-bright bg-surface-3 text-fg hover:border-accent"
                }`}
              >
                {capturing === action ? "Press a key…" : keyLabel(kb.bindings[action])}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={kb.resetBindings}
            className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Reset to defaults
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink hover:brightness-110"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
