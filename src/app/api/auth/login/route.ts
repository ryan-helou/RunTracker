import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

const NAME_RE = /^[a-zA-Z0-9 _-]+$/;

/**
 * Name-only sign-in: enter a name and you're in. The account is created on
 * first use and matched (case-insensitively) on return. No password.
 */
export async function POST(req: Request) {
  let body: { username?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  if (username.length < 2 || username.length > 24 || !NAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Name must be 2–24 characters (letters, numbers, spaces, _ or -)." },
      { status: 400 },
    );
  }

  const sql = getSql();
  const rows = await sql`
    INSERT INTO users (username, username_lower)
    VALUES (${username}, ${username.toLowerCase()})
    ON CONFLICT (username_lower) DO UPDATE SET username = EXCLUDED.username
    RETURNING id, username
  `;
  const user = rows[0];

  const token = await createSessionToken({
    userId: Number(user.id),
    username: user.username,
  });
  const res = NextResponse.json({ user: { id: Number(user.id), username: user.username } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
