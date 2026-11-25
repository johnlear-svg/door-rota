import { Nav } from "@/components/Nav";
import { RolesClient } from "@/components/RolesClient";
import { listRoles } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const roles = await listRoles();
  return (
    <main className="shell">
      <Nav compact />
      <RolesClient initial={roles} />
    </main>
  );
}
