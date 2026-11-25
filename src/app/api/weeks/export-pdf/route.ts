import { requireViewer } from "@/lib/auth";
import { buildRotaPdf } from "@/lib/pdf-rota";
import { SECTION_META } from "@/lib/sections";
import { getWeek } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;

  const body = (await request.json().catch(() => ({}))) as {
    week_ids?: string[];
  };
  const ids = (body.week_ids ?? []).filter(Boolean);
  if (ids.length === 0) {
    return Response.json({ error: "week_ids required" }, { status: 400 });
  }
  if (ids.length > 52) {
    return Response.json({ error: "Too many weeks (max 52)" }, { status: 400 });
  }

  try {
    const first = await getWeek(ids[0]);
    const prefix = first
      ? SECTION_META[first.section].filePrefix
      : "staff-rota";
    const pdf = await buildRotaPdf(ids);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${prefix}-${stamp}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "export failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
