import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { WeekEditor } from "@/components/WeekEditor";
import { getWeek } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function WeekPage({ params }: Props) {
  const { id } = await params;
  const week = await getWeek(id);
  if (!week) notFound();
  return (
    <main className="shell">
      <Nav compact section={week.section} />
      <WeekEditor initial={week} />
    </main>
  );
}
