import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: session.userId, username: session.username },
  });
}
