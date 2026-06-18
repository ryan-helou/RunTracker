import { cn } from "@/lib/cn";

export function Brand({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const mark = size === "lg" ? 26 : size === "sm" ? 18 : 22;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={mark}
        height={mark}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="text-accent"
      >
        <path
          d="M3 4.5 13.5 12 3 19.5V4.5Z"
          fill="currentColor"
          opacity="0.55"
        />
        <path d="M10.5 4.5 21 12l-10.5 7.5V4.5Z" fill="currentColor" />
      </svg>
      <span
        className={cn(
          "font-display font-bold tracking-tight leading-none text-fg",
          text,
        )}
      >
        Run<span className="text-accent">Tracker</span>
      </span>
    </span>
  );
}
