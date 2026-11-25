import { ownerKey, requireViewer } from "@/lib/auth";
import {
  createRole,
  deleteRole,
  ensureOwnerRoles,
  listRoles,
  updateRole,
} from "@/lib/weeks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const owner = ownerKey(identity);
  await ensureOwnerRoles(owner);
  return Response.json(await listRoles(owner), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const owner = ownerKey(identity);
  const body = (await request.json()) as {
    name?: string;
    rate_gbp?: number;
  };
  if (!body.name?.trim()) {
    return Response.json({ error: "name required" }, { status: 400 });
  }
  const rate = Number(body.rate_gbp);
  if (!Number.isFinite(rate) || rate < 0) {
    return Response.json({ error: "rate_gbp required" }, { status: 400 });
  }
  await createRole(owner, body.name, rate);
  return Response.json(await listRoles(owner), {
    status: 201,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function PATCH(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const owner = ownerKey(identity);
  const body = (await request.json()) as {
    id: string;
    name?: string;
    rate_gbp?: number;
  };
  if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    await updateRole(owner, body.id, { name: body.name, rate_gbp: body.rate_gbp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "update failed";
    return Response.json({ error: message }, { status: 404 });
  }
  return Response.json(await listRoles(owner), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function DELETE(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const owner = ownerKey(identity);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    await deleteRole(owner, id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "delete failed";
    const status = message.includes("used on staff")
      ? 409
      : message.includes("not found")
        ? 404
        : 400;
    return Response.json({ error: message }, { status });
  }
  return Response.json(await listRoles(owner), {
    headers: { "cache-control": "private, no-store" },
  });
}
