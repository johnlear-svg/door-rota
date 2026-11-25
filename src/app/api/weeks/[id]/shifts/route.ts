import { requireViewer } from "@/lib/auth";
import { getWeek, updateShift } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const { id } = await ctx.params;
  const body = (await request.json()) as {
    shift_id: string;
    start_time?: string | null;
    end_time?: string | null;
  };
  if (!body.shift_id) return Response.json({ error: "shift_id required" }, { status: 400 });
  await updateShift(body.shift_id, body.start_time ?? null, body.end_time ?? null);
  return Response.json(await getWeek(id), {
    headers: { "cache-control": "private, no-store" },
  });
}
