import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";
import { LeaderboardClient } from "@/components/LeaderboardClient";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  return (
    <>
      <TopBar username={session.username} />
      <LeaderboardClient currentUsername={session.username} />
    </>
  );
}
