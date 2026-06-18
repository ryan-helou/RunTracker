import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { mapRun, sanitizeSplits, totalFromSplits } from "@/lib/runs";
import { getCategory } from "@/lib/catalog";
import { unauthorized, badRequest, serverError } from "@/lib/api";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const game = searchParams.get("game");
    const category = searchParams.get("category");
    const sql = getSql();

    const rows =
      game && category
        ? await sql`
            SELECT * FROM runs
            WHERE user_id = ${session.userId}
              AND game_key = ${game}
              AND category_key = ${category}
            ORDER BY created_at DESC
          `
        : await sql`
            SELECT * FROM runs
            WHERE user_id = ${session.userId}
            ORDER BY created_at DESC
            LIMIT 200
          `;

    return NextResponse.json({ runs: rows.map(mapRun) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  const gameKey = String(body.gameKey ?? "");
  const categoryKey = String(body.categoryKey ?? "");
  if (!getCategory(gameKey, categoryKey)) {
    return badRequest("Unknown game or category.");
  }

  try {
    const splits = sanitizeSplits(body.splits);
    const completed = Boolean(body.completed);
    const note = String(body.note ?? "").slice(0, 2000);
    const totalMs = totalFromSplits(splits);

    const sql = getSql();
    const rows = await sql`
      INSERT INTO runs (user_id, game_key, category_key, total_ms, completed, splits, note)
      VALUES (
        ${session.userId}, ${gameKey}, ${categoryKey},
        ${totalMs}, ${completed}, ${JSON.stringify(splits)}::jsonb, ${note}
      )
      RETURNING *
    `;
    return NextResponse.json({ run: mapRun(rows[0]) });
  } catch (e) {
    return serverError(e);
  }
}
