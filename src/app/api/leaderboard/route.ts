import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCategory } from "@/lib/catalog";
import { unauthorized, badRequest, serverError } from "@/lib/api";

/**
 * Shared leaderboard: the best completed time for each player in a given
 * game + category, ranked ascending. Visible to any signed-in player.
 */
export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game");
  const category = searchParams.get("category");
  if (!game || !category || !getCategory(game, category)) {
    return badRequest("Unknown game or category.");
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT u.username AS username,
             MIN(r.total_ms) AS best_ms,
             COUNT(*)::int AS run_count,
             MAX(r.created_at) AS last_at
      FROM runs r
      JOIN users u ON u.id = r.user_id
      WHERE r.game_key = ${game}
        AND r.category_key = ${category}
        AND r.completed = TRUE
        AND r.total_ms IS NOT NULL
      GROUP BY u.id, u.username
      ORDER BY best_ms ASC
    `;

    const entries = rows.map((row, i) => {
      const last = row.last_at;
      return {
        rank: i + 1,
        username: String(row.username),
        bestMs: Number(row.best_ms),
        runCount: Number(row.run_count),
        lastAt: last instanceof Date ? last.toISOString() : String(last ?? ""),
      };
    });

    return NextResponse.json({ entries });
  } catch (e) {
    return serverError(e);
  }
}
