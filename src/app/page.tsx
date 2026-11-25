import { Nav } from "@/components/Nav";
import { HomeClient } from "@/components/HomeClient";
import { ensureSampleWeek, listWeeks } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSampleWeek();
  const weeks = await listWeeks();
  return (
    <main className="shell">
      <Nav />
      <HomeClient initialWeeks={weeks} />
    </main>
  );
}
