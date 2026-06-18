import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { mapRun } from "@/lib/runs";
import { computeComparison } from "@/lib/comparison";
import { unauthorized, badRequest, serverError } from "@/lib/api";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");
  const category = searchParams.get("category");
  if (!game || !category) return badRequest("game and category are required.");

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM runs
      WHERE user_id = ${session.userId} AND game_key = ${game} AND category_key = ${category}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ comparison: computeComparison(rows.map(mapRun)) });
  } catch (e) {
    return serverError(e);
  }
}
