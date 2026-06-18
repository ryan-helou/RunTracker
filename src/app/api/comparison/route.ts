import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { mapRun } from "@/lib/runs";
import { computeComparison } from "@/lib/comparison";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");
  const category = searchParams.get("category");
  if (!game || !category) {
    return NextResponse.json({ error: "game and category are required." }, { status: 400 });
  }

  const sql = getSql();
  const rows = await sql`
    SELECT * FROM runs
    WHERE user_id = ${session.userId} AND game_key = ${game} AND category_key = ${category}
    ORDER BY created_at DESC
  `;
  const comparison = computeComparison(rows.map(mapRun));
  return NextResponse.json({ comparison });
}
