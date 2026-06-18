import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { buttonClass } from "@/components/ui";

const SAMPLE = [
  { name: "World 1-1", time: "0:31.20", delta: "−1.04", ahead: true, gold: false },
  { name: "World 1-2", time: "1:18.88", delta: "+0.62", ahead: false, gold: false },
  { name: "World 1-3", time: "1:52.40", delta: "−2.31", ahead: true, gold: true },
  { name: "World 1-Tower", time: "2:44.07", delta: "−0.88", ahead: true, gold: false },
];

const GAMES = [
  "New Super Mario Bros. Wii",
  "Mario Kart Wii",
  "Mario Party 9",
];

export default async function Home() {
  let loggedIn = false;
  try {
    loggedIn = (await getSessionUser()) != null;
  } catch {
    loggedIn = false;
  }
  if (loggedIn) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6">
      <header className="flex items-center justify-between py-7">
        <Brand size="md" />
        <nav className="flex items-center gap-2">
          <Link href="/login" className={buttonClass("primary", "sm")}>
            Enter →
          </Link>
        </nav>
      </header>

      <section className="grid flex-1 items-center gap-14 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col">
          <span className="eyebrow fade-up" style={{ animationDelay: "40ms" }}>
            Live splitting · Personal-best pacing
          </span>
          <h1
            className="fade-up mt-5 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl"
            style={{ animationDelay: "100ms" }}
          >
            Race your{" "}
            <span className="text-accent timer-glow">personal best</span>,
            <br /> level by level.
          </h1>
          <p
            className="fade-up mt-6 max-w-md text-lg leading-relaxed text-muted"
            style={{ animationDelay: "180ms" }}
          >
            A precision split timer for Wii speedruns. Tap your key at the end of
            every level — watch each segment land{" "}
            <span className="text-ahead">green</span> when you&apos;re ahead and{" "}
            <span className="text-behind">red</span> when you&apos;re behind. Every
            run saved under your name — no password.
          </p>

          <div
            className="fade-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "260ms" }}
          >
            <Link href="/login" className={buttonClass("primary", "lg")}>
              Start tracking →
            </Link>
          </div>

          <ul
            className="fade-up mt-10 flex flex-wrap gap-2"
            style={{ animationDelay: "340ms" }}
          >
            {GAMES.map((g) => (
              <li
                key={g}
                className="rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-xs text-muted"
              >
                {g}
              </li>
            ))}
          </ul>
        </div>

        {/* Splits preview */}
        <div
          className="fade-up panel pulse-active relative overflow-hidden p-6"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">NSMBW · World 1</p>
              <p className="mt-1 text-sm text-muted">Comparing to PB</p>
            </div>
            <span className="rounded-md border border-[rgba(67,224,138,0.35)] bg-[rgba(67,224,138,0.08)] px-2.5 py-1 text-xs font-medium text-ahead">
              −2.31 ahead
            </span>
          </div>

          <div className="my-6 text-center">
            <div className="mono timer-glow-ahead text-6xl font-bold tracking-tight text-ahead sm:text-7xl">
              2:44<span className="text-3xl text-ahead/70">.07</span>
            </div>
          </div>

          <ul className="flex flex-col gap-1">
            {SAMPLE.map((s) => (
              <li
                key={s.name}
                className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2.5 hover:border-line"
              >
                <span className="flex items-center gap-2 text-sm text-fg">
                  {s.gold && (
                    <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)]" />
                  )}
                  {s.name}
                </span>
                <span className="flex items-center gap-4">
                  <span
                    className={`mono text-sm font-semibold ${
                      s.ahead ? "text-ahead" : "text-behind"
                    }`}
                  >
                    {s.delta}
                  </span>
                  <span className="mono w-20 text-right text-sm text-muted">
                    {s.time}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-line py-6 text-center text-xs text-faint">
        Built for New Super Mario Bros. Wii · Mario Kart Wii · Mario Party 9
      </footer>
    </main>
  );
}
