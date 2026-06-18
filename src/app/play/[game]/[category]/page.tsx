import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCategory } from "@/lib/catalog";
import { RunScreen } from "@/components/RunScreen";

export const dynamic = "force-dynamic";

export default async function PlayPage({
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
    <RunScreen
      gameKey={g.key}
      categoryKey={c.key}
      gameName={g.name}
      gameShort={g.shortName}
      accent={g.accent}
      categoryName={c.name}
      splitNames={c.splits.map((sp) => sp.name)}
      timingMethod={c.timingMethod}
    />
  );
}
