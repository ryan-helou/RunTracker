/**
 * Keybindings use KeyboardEvent.code (physical key identity) so a binding works
 * regardless of keyboard layout, and supports keys that have no printable value
 * (numpad, function keys, etc.).
 */

export type BindableAction = "split" | "undo" | "skip" | "pause" | "reset";

export const ACTION_LABELS: Record<BindableAction, string> = {
  split: "Split / Lap",
  undo: "Undo split",
  skip: "Skip split",
  pause: "Pause / Resume",
  reset: "Reset run",
};

export const DEFAULT_BINDINGS: Record<BindableAction, string> = {
  split: "Space",
  undo: "KeyZ",
  skip: "KeyX",
  pause: "KeyP",
  reset: "KeyR",
};

export type Keybindings = Record<BindableAction, string>;

/** Turns a KeyboardEvent.code into a human-friendly label. */
export function keyLabel(code: string | null | undefined): string {
  if (!code) return "Unbound";
  if (code === "Space") return "Space";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "Num " + code.slice(6);
  if (code.startsWith("Arrow")) return code.slice(5) + " Arrow";
  const named: Record<string, string> = {
    Enter: "Enter",
    Tab: "Tab",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    ShiftLeft: "Left Shift",
    ShiftRight: "Right Shift",
    ControlLeft: "Left Ctrl",
    ControlRight: "Right Ctrl",
    AltLeft: "Left Alt",
    AltRight: "Right Alt",
    Backspace: "Backspace",
    CapsLock: "Caps Lock",
  };
  return named[code] ?? code;
}
