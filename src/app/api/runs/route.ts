import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { mapRun, sanitizeSplits, totalFromSplits } from "@/lib/runs";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

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
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const gameKey = String(body.gameKey ?? "");
  const categoryKey = String(body.categoryKey ?? "");
  if (!gameKey || !categoryKey) {
    return NextResponse.json({ error: "gameKey and categoryKey are required." }, { status: 400 });
  }

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
}
