"use client";

import { useEffect, useRef } from "react";

function isTypingTarget(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  return (
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT" ||
    t.isContentEditable
  );
}

/** Fires `handler` whenever the physical key `code` is pressed (when enabled). */
export function useHotkey(
  code: string | null,
  handler: () => void,
  enabled = true,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !code) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (isTypingTarget(e.target)) return;
      if (e.code === code) {
        e.preventDefault();
        handlerRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [code, enabled]);
}

/**
 * Captures the next physical key press (for rebinding UI).
 * Returns a function to begin capture; resolves the chosen KeyboardEvent.code.
 */
export function captureNextKey(): Promise<string | null> {
  return new Promise((resolve) => {
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      cleanup();
      resolve(e.code === "Escape" ? null : e.code);
    };
    const cleanup = () => window.removeEventListener("keydown", onKey, true);
    window.addEventListener("keydown", onKey, true);
  });
}
