import { Nav } from "@/components/Nav";
import { RolesClient } from "@/components/RolesClient";
import { parseSection } from "@/lib/sections";
import { listRoles } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ section?: string }> };

export default async function RolesPage({ searchParams }: Props) {
  const section = parseSection((await searchParams).section);
  const roles = await listRoles(section);
  return (
    <main className="shell">
      <Nav compact section={section} />
      <RolesClient initial={roles} section={section} />
    </main>
  );
}
