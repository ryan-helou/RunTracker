import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Brand } from "@/components/Brand";
import { AuthForm } from "@/components/AuthForm";

export default async function LoginPage() {
  let loggedIn = false;
  try {
    loggedIn = (await getSessionUser()) != null;
  } catch {
    loggedIn = false;
  }
  if (loggedIn) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="fade-up w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Brand size="lg" />
          </Link>
        </div>
        <div className="panel p-7">
          <h1 className="text-2xl font-bold tracking-tight">Enter your name</h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            Type your name to load your splits and personal bests — or to start
            fresh.
          </p>
          <AuthForm />
        </div>
      </div>
    </main>
  );
}
