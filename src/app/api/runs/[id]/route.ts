import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { mapRun, sanitizeSplits, totalFromSplits } from "@/lib/runs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { id } = await params;

  const sql = getSql();
  const rows = await sql`
    SELECT * FROM runs WHERE id = ${id} AND user_id = ${session.userId}
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ run: mapRun(rows[0]) });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sql = getSql();
  const owned = await sql`
    SELECT id FROM runs WHERE id = ${id} AND user_id = ${session.userId}
  `;
  if (owned.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Editable fields: splits (recomputes total), note, completed.
  const hasSplits = Array.isArray(body.splits);
  const splits = hasSplits ? sanitizeSplits(body.splits) : null;
  const totalMs = splits ? totalFromSplits(splits) : null;
  const note = body.note === undefined ? null : String(body.note).slice(0, 2000);
  const completed = body.completed === undefined ? null : Boolean(body.completed);

  const rows = await sql`
    UPDATE runs SET
      splits    = COALESCE(${splits ? JSON.stringify(splits) : null}::jsonb, splits),
      total_ms  = CASE WHEN ${hasSplits} THEN ${totalMs} ELSE total_ms END,
      note      = COALESCE(${note}, note),
      completed = COALESCE(${completed}, completed)
    WHERE id = ${id} AND user_id = ${session.userId}
    RETURNING *
  `;
  return NextResponse.json({ run: mapRun(rows[0]) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { id } = await params;

  const sql = getSql();
  const rows = await sql`
    DELETE FROM runs WHERE id = ${id} AND user_id = ${session.userId} RETURNING id
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
