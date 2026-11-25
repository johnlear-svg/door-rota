import { requireViewer } from "@/lib/auth";
import { mondayOf } from "@/lib/hours";
import { parseSection } from "@/lib/sections";
import { createWeek, ensureSampleWeek, listWeeks } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const url = new URL(request.url);
  const section = parseSection(url.searchParams.get("section"));
  await ensureSampleWeek(section);
  const q = url.searchParams.get("q") ?? undefined;
  return Response.json(await listWeeks(q, section), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const body = (await request.json().catch(() => ({}))) as {
    week_start?: string;
    label?: string;
    section?: string;
  };
  const section = parseSection(body.section);
  const raw = body.week_start || new Date().toISOString().slice(0, 10);
  const weekStart = mondayOf(raw);
  try {
    const week = await createWeek(weekStart, body.label ?? "", section);
    return Response.json(week, {
      status: 201,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create failed";
    if (
      message.includes("unique") ||
      message.includes("weeks_week_start")
    ) {
      return Response.json(
        {
          error: `A ${section} week already exists for that Monday.`,
        },
        { status: 409 },
      );
    }
    throw err;
  }
}
