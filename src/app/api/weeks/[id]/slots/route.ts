import { ownerKey, requireViewer } from "@/lib/auth";
import { addSlot, getWeek, removeSlot, updateSlot } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const owner = ownerKey(identity);
  const { id } = await ctx.params;
  const body = (await request.json()) as {
    role_id: string;
    person_name?: string;
    rate_gbp?: number;
  };
  if (!body.role_id) return Response.json({ error: "role_id required" }, { status: 400 });
  if (!(await getWeek(owner, id))) return Response.json({ error: "not found" }, { status: 404 });
  await addSlot(owner, id, body.role_id, body.person_name ?? "", body.rate_gbp);
  return Response.json(await getWeek(owner, id), {
    status: 201,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const owner = ownerKey(identity);
  const { id } = await ctx.params;
  const body = (await request.json()) as {
    slot_id: string;
    person_name?: string;
    rate_gbp?: number;
    role_id?: string;
  };
  if (!body.slot_id) return Response.json({ error: "slot_id required" }, { status: 400 });
  try {
    await updateSlot(owner, body.slot_id, body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "update failed";
    return Response.json({ error: message }, { status: 404 });
  }
  const week = await getWeek(owner, id);
  if (!week) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(week, {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const owner = ownerKey(identity);
  const { id } = await ctx.params;
  const slotId = new URL(request.url).searchParams.get("slot_id");
  if (!slotId) return Response.json({ error: "slot_id required" }, { status: 400 });
  try {
    await removeSlot(owner, slotId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "delete failed";
    return Response.json({ error: message }, { status: 404 });
  }
  const week = await getWeek(owner, id);
  if (!week) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(week, {
    headers: { "cache-control": "private, no-store" },
  });
}
