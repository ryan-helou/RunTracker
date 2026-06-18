import { NextResponse } from "next/server";

export function unauthorized() {
  return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound() {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}

/** Logs the real error; returns a safe JSON message (surfacing only config issues). */
export function serverError(e: unknown) {
  console.error("[api] error:", e);
  const msg = e instanceof Error ? e.message : "";
  if (/AUTH_SECRET/.test(msg)) {
    return NextResponse.json(
      { error: "Server not configured: AUTH_SECRET is missing." },
      { status: 500 },
    );
  }
  if (/DATABASE_URL/.test(msg)) {
    return NextResponse.json(
      { error: "Server not configured: DATABASE_URL is missing." },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { error: "Couldn't reach the database. Please try again." },
    { status: 500 },
  );
}
