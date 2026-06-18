import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCategory } from "@/lib/catalog";
import { TopBar } from "@/components/TopBar";
import { StatsClient } from "@/components/StatsClient";

export const dynamic = "force-dynamic";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ game: string; category: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const { game, category } = await params;
  const found = getCategory(game, category);
  if (!found) notFound();

  const { game: g, category: c } = found;
  return (
    <>
      <TopBar username={session.username} />
      <StatsClient
        gameKey={g.key}
        categoryKey={c.key}
        gameShort={g.shortName}
        accent={g.accent}
        categoryName={c.name}
        splitNames={c.splits.map((sp) => sp.name)}
      />
    </>
  );
}
