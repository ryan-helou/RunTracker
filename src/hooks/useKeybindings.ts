"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_BINDINGS,
  type BindableAction,
  type Keybindings,
} from "@/lib/keys";

const STORAGE_KEY = "rt_keybindings";

function load(): Keybindings {
  if (typeof window === "undefined") return { ...DEFAULT_BINDINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BINDINGS };
    const parsed = JSON.parse(raw) as Partial<Keybindings>;
    return { ...DEFAULT_BINDINGS, ...parsed };
  } catch {
    return { ...DEFAULT_BINDINGS };
  }
}

/** Persisted, user-customizable key bindings (per browser, via localStorage). */
export function useKeybindings() {
  const [bindings, setBindings] = useState<Keybindings>(DEFAULT_BINDINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBindings(load());
    setReady(true);
  }, []);

  const persist = useCallback((next: Keybindings) => {
    setBindings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota/availability errors */
    }
  }, []);

  const rebind = useCallback(
    (action: BindableAction, code: string) => {
      setBindings((prev) => {
        // Prevent the same physical key from being bound to two actions.
        const cleared: Keybindings = { ...prev };
        for (const k of Object.keys(cleared) as BindableAction[]) {
          if (cleared[k] === code) cleared[k] = "";
        }
        cleared[action] = code;
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleared));
        } catch {
          /* ignore */
        }
        return cleared;
      });
    },
    [],
  );

  const resetBindings = useCallback(() => persist({ ...DEFAULT_BINDINGS }), [persist]);

  return { bindings, rebind, resetBindings, ready };
}
