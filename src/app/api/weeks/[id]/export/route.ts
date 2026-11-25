import ExcelJS from "exceljs";
import { requireViewer } from "@/lib/auth";
import { DAY_NAMES, calcHours, formatWeekLabel } from "@/lib/hours";
import { SECTION_META } from "@/lib/sections";
import { getWeek, totalsFor } from "@/lib/weeks";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const identity = await requireViewer(request);
  if (identity instanceof Response) return identity;
  const { id } = await ctx.params;
  const week = await getWeek(id);
  if (!week) return Response.json({ error: "not found" }, { status: 404 });

  const meta = SECTION_META[week.section];
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rota");
  ws.addRow([meta.pdfTitle, formatWeekLabel(week.week_start), week.label]);
  ws.addRow([]);
  const header = ["#", "Role", "Rate £"];
  for (const day of DAY_NAMES) header.push(`${day} start`, `${day} end`, `${day} hrs`);
  header.push("Total hrs", "Cost £");
  ws.addRow(header);

  week.slots.forEach((slot, idx) => {
    const row: (string | number)[] = [idx + 1, slot.role_name ?? "", slot.rate_gbp];
    let slotHours = 0;
    for (let d = 0; d < 7; d++) {
      const sh = slot.shifts.find((s) => s.day_index === d);
      const start = sh?.start_time ?? "";
      const end = sh?.end_time ?? "";
      const h = calcHours(start, end);
      slotHours += h;
      row.push(start, end, h || "");
    }
    row.push(slotHours, Math.round(slotHours * slot.rate_gbp * 100) / 100);
    ws.addRow(row);
  });

  ws.addRow([]);
  const totals = totalsFor(week.slots);
  const eventRow = ["Events", "", ""];
  for (let d = 0; d < 7; d++) {
    eventRow.push(week.days.find((x) => x.day_index === d)?.event_name ?? "", "", "");
  }
  ws.addRow(eventRow);
  ws.addRow([
    "Totals", "", "",
    ...totals.byDay.flatMap((d) => ["", "", d.hours]),
    totals.totalHours,
    totals.totalCost,
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${meta.filePrefix}-${week.week_start}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
}
