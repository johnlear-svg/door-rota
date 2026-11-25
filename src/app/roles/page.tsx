import { AccessGate } from "@/components/AccessGate";
import { Nav } from "@/components/Nav";
import { RolesClient } from "@/components/RolesClient";
import { getPageViewer, ownerKey } from "@/lib/auth";
import { listRoles } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const identity = await getPageViewer();
  if (!identity.verified) {
    return <AccessGate />;
  }
  const roles = await listRoles(ownerKey(identity));
  return (
    <main className="shell">
      <Nav compact />
      <RolesClient initial={roles} />
    </main>
  );
}
