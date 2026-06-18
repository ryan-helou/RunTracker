import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-ink font-semibold hover:brightness-110 active:brightness-95 shadow-[0_8px_30px_-10px_rgba(255,178,36,0.65)]",
  ghost:
    "border border-line text-fg hover:border-line-bright hover:bg-surface-2",
  subtle: "bg-surface-2 text-fg hover:bg-surface-3 border border-line",
  danger:
    "border border-[rgba(255,93,93,0.45)] text-behind hover:bg-[rgba(255,93,93,0.12)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.8rem]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export const buttonClass = (
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 ring-focus select-none disabled:opacity-50 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
