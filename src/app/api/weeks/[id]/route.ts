import { requireViewer } from "@/lib/auth";
import { deleteWeek, getWeek, updateDayEvent, updateWeekMeta } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const { id } = await ctx.params;
  const week = await getWeek(id);
  if (!week) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(week, { headers: { "cache-control": "private, no-store" } });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const { id } = await ctx.params;
  const body = (await request.json()) as {
    label?: string;
    notes?: string;
    archived?: boolean;
    day_index?: number;
    event_name?: string;
  };
  if (!(await getWeek(id))) return Response.json({ error: "not found" }, { status: 404 });
  if (
    body.day_index !== undefined &&
    body.event_name !== undefined &&
    body.day_index >= 0 &&
    body.day_index <= 6
  ) {
    await updateDayEvent(id, body.day_index, body.event_name);
  }
  await updateWeekMeta(id, {
    label: body.label,
    notes: body.notes,
    archived: body.archived,
  });
  return Response.json(await getWeek(id), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const { id } = await ctx.params;
  await deleteWeek(id);
  return new Response(null, { status: 204 });
}
