import { requireViewer } from "@/lib/auth";
import { addSlot, getWeek, removeSlot, updateSlot } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const { id } = await ctx.params;
  const body = (await request.json()) as {
    role_id: string;
    person_name?: string;
    rate_gbp?: number;
  };
  if (!body.role_id) return Response.json({ error: "role_id required" }, { status: 400 });
  if (!(await getWeek(id))) return Response.json({ error: "not found" }, { status: 404 });
  await addSlot(id, body.role_id, body.person_name ?? "", body.rate_gbp);
  return Response.json(await getWeek(id), {
    status: 201,
    headers: { "cache-control": "private, no-store" },
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const { id } = await ctx.params;
  const body = (await request.json()) as {
    slot_id: string;
    person_name?: string;
    rate_gbp?: number;
    role_id?: string;
  };
  if (!body.slot_id) return Response.json({ error: "slot_id required" }, { status: 400 });
  await updateSlot(body.slot_id, body);
  return Response.json(await getWeek(id), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const { id } = await ctx.params;
  const slotId = new URL(request.url).searchParams.get("slot_id");
  if (!slotId) return Response.json({ error: "slot_id required" }, { status: 400 });
  await removeSlot(slotId);
  return Response.json(await getWeek(id), {
    headers: { "cache-control": "private, no-store" },
  });
}
