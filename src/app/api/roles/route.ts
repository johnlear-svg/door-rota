import { requireViewer } from "@/lib/auth";
import { parseSection } from "@/lib/sections";
import { createRole, deleteRole, listRoles, updateRole } from "@/lib/weeks";

export const dynamic = "force-dynamic";

function sectionFrom(request: Request, bodySection?: string) {
  const url = new URL(request.url);
  return parseSection(bodySection ?? url.searchParams.get("section"));
}

export async function GET(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const section = sectionFrom(request);
  return Response.json(await listRoles(section), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const body = (await request.json()) as {
    name?: string;
    rate_gbp?: number;
    section?: string;
  };
  if (!body.name?.trim()) {
    return Response.json({ error: "name required" }, { status: 400 });
  }
  const rate = Number(body.rate_gbp);
  if (!Number.isFinite(rate) || rate < 0) {
    return Response.json({ error: "rate_gbp required" }, { status: 400 });
  }
  const section = sectionFrom(request, body.section);
  await createRole(body.name, rate, section);
  return Response.json(await listRoles(section), {
    status: 201,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function PATCH(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const body = (await request.json()) as {
    id: string;
    name?: string;
    rate_gbp?: number;
    section?: string;
  };
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
  const section = sectionFrom(request, body.section);
  await updateRole(body.id, { name: body.name, rate_gbp: body.rate_gbp });
  return Response.json(await listRoles(section), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function DELETE(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const section = parseSection(url.searchParams.get("section"));
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    await deleteRole(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "delete failed";
    const status = message.includes("used on staff") ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
  return Response.json(await listRoles(section), {
    headers: { "cache-control": "private, no-store" },
  });
}
