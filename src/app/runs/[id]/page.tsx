import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { mapRun } from "@/lib/runs";
import { computeComparison } from "@/lib/comparison";
import { getCategory } from "@/lib/catalog";
import { TopBar } from "@/components/TopBar";
import { RunEditor } from "@/components/RunEditor";
import type { Comparison, RunRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  const { id } = await params;

  let run: RunRecord | null = null;
  let comparison: Comparison | null = null;
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM runs WHERE id = ${id} AND user_id = ${session.userId}
    `;
    if (rows.length > 0) {
      run = mapRun(rows[0]);
      const siblings = await sql`
        SELECT * FROM runs
        WHERE user_id = ${session.userId}
          AND game_key = ${run.gameKey}
          AND category_key = ${run.categoryKey}
        ORDER BY created_at DESC
      `;
      comparison = computeComparison(siblings.map(mapRun));
    }
  } catch {
    // DB unreachable — fall through to notFound below.
  }

  if (!run) notFound();

  const cat = getCategory(run.gameKey, run.categoryKey);
  return (
    <>
      <TopBar username={session.username} />
      <RunEditor
        run={run}
        gameShort={cat?.game.shortName ?? run.gameKey}
        accent={cat?.game.accent ?? "#ffb224"}
        categoryName={cat?.category.name ?? run.categoryKey}
        comparison={comparison}
      />
    </>
  );
}
