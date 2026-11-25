import { Nav } from "@/components/Nav";
import { HomeClient } from "@/components/HomeClient";
import { parseSection } from "@/lib/sections";
import { ensureSampleWeek, listWeeks } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ section?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const section = parseSection((await searchParams).section);
  await ensureSampleWeek(section);
  const weeks = await listWeeks(undefined, section);
  return (
    <main className="shell">
      <Nav section={section} />
      <HomeClient initialWeeks={weeks} section={section} />
    </main>
  );
}
