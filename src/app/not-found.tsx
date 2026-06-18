import Link from "next/link";
import { Brand } from "@/components/Brand";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Brand size="lg" />
      <p className="mono mt-8 text-6xl font-bold text-accent timer-glow">404</p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">
        That split doesn&apos;t exist
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        The page or run you&apos;re looking for couldn&apos;t be found.
      </p>
      <Link href="/dashboard" className={buttonClass("primary", "md", "mt-6")}>
        Back to dashboard
      </Link>
    </main>
  );
}
