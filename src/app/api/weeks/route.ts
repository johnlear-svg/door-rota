import { requireViewer } from "@/lib/auth";
import { mondayOf } from "@/lib/hours";
import { createWeek, ensureSampleWeek, listWeeks } from "@/lib/weeks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  await ensureSampleWeek();
  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  return Response.json(await listWeeks(q), {
    headers: { "cache-control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const body = (await request.json().catch(() => ({}))) as {
    week_start?: string;
    label?: string;
  };
  const raw = body.week_start || new Date().toISOString().slice(0, 10);
  const weekStart = mondayOf(raw);
  try {
    const week = await createWeek(weekStart, body.label ?? "");
    return Response.json(week, {
      status: 201,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create failed";
    if (message.includes("unique") || message.includes("weeks_week_start")) {
      return Response.json(
        { error: "A week already exists for that Monday." },
        { status: 409 },
      );
    }
    throw err;
  }
}
