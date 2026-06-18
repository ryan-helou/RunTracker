import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { mapRun } from "@/lib/runs";
import { TopBar } from "@/components/TopBar";
import { DashboardClient } from "@/components/DashboardClient";
import type { RunRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  let runs: RunRecord[] = [];
  let dbError: string | null = null;
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT * FROM runs
      WHERE user_id = ${session.userId}
      ORDER BY created_at DESC
      LIMIT 200
    `;
    runs = rows.map(mapRun);
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database error";
  }

  return (
    <>
      <TopBar username={session.username} />
      <DashboardClient username={session.username} initialRuns={runs} dbError={dbError} />
    </>
  );
}
