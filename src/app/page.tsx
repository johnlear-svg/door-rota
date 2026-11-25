import { AccessGate } from "@/components/AccessGate";
import { HomeClient } from "@/components/HomeClient";
import { Nav } from "@/components/Nav";
import { getPageViewer, ownerKey } from "@/lib/auth";
import { ensureSampleWeek, listWeeks } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const identity = await getPageViewer();
  if (!identity.verified) {
    return <AccessGate />;
  }
  const owner = ownerKey(identity);
  await ensureSampleWeek(owner);
  const weeks = await listWeeks(owner);
  return (
    <main className="shell">
      <Nav />
      <HomeClient initialWeeks={weeks} />
    </main>
  );
}
