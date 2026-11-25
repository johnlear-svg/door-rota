import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { Nav } from "@/components/Nav";
import { WeekEditor } from "@/components/WeekEditor";
import { getPageViewer, ownerKey } from "@/lib/auth";
import { getWeek } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function WeekPage({ params }: Props) {
  const identity = await getPageViewer();
  if (!identity.verified) {
    return <AccessGate />;
  }
  const { id } = await params;
  const week = await getWeek(ownerKey(identity), id);
  if (!week) notFound();
  return (
    <main className="shell">
      <Nav compact />
      <WeekEditor initial={week} />
    </main>
  );
}
