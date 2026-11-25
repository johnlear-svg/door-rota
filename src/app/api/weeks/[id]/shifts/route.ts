import { ownerKey, requireViewer } from "@/lib/auth";
import { getWeek, updateShift } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const owner = ownerKey(identity);
  const { id } = await ctx.params;
  const body = (await request.json()) as {
    shift_id: string;
    start_time?: string | null;
    end_time?: string | null;
  };
  if (!body.shift_id) return Response.json({ error: "shift_id required" }, { status: 400 });
  try {
    await updateShift(owner, body.shift_id, body.start_time ?? null, body.end_time ?? null);
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
