import PDFDocument from "pdfkit";
import { DAY_NAMES, calcHours, formatWeekLabel } from "./hours";
import { getWeek, totalsFor } from "./weeks";
import type { WeekDetail } from "./types";

function bufferFromPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function drawWeek(doc: PDFKit.PDFDocument, week: WeekDetail, yStart: number): number {
  let y = yStart;
  const left = 48;
  const width = 516;

  doc
    .fillColor("#0c1017")
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(`Door Rota · ${formatWeekLabel(week.week_start)}`, left, y, {
      width,
    });
  y = doc.y + 4;
  if (week.label) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#555")
      .text(week.label, left, y, { width });
    y = doc.y + 6;
  }

  const events = week.days
    .filter((d) => d.event_name.trim())
    .map((d) => `${DAY_NAMES[d.day_index].slice(0, 3)}: ${d.event_name}`)
    .join("  ·  ");
  if (events) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666")
      .text(events, left, y, { width });
    y = doc.y + 8;
  }

  const totals = totalsFor(week.slots);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#0c1017")
    .text(
      `Total: ${totals.totalHours}h  ·  £${totals.totalCost.toFixed(2)}`,
      left,
      y,
      { width },
    );
  y = doc.y + 10;

  // Header
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#444");
  const cols = ["#", "Role", "Rate", ...DAY_NAMES.map((d) => d.slice(0, 3)), "Hrs", "£"];
  const colW = [22, 90, 36, 42, 42, 42, 42, 42, 42, 42, 36, 48];
  let x = left;
  cols.forEach((h, i) => {
    doc.text(h, x, y, { width: colW[i], align: i >= 3 ? "center" : "left" });
    x += colW[i];
  });
  y += 14;
  doc
    .strokeColor("#ccc")
    .moveTo(left, y)
    .lineTo(left + width, y)
    .stroke();
  y += 6;

  week.slots.forEach((slot, idx) => {
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    let slotHours = 0;
    const dayCells: string[] = [];
    for (let d = 0; d < 7; d++) {
      const sh = slot.shifts.find((s) => s.day_index === d);
      const h = calcHours(sh?.start_time, sh?.end_time);
      slotHours += h;
      if (sh?.start_time && sh?.end_time) {
        dayCells.push(`${sh.start_time}-${sh.end_time}`);
      } else {
        dayCells.push("—");
      }
    }
    const cost = Math.round(slotHours * slot.rate_gbp * 100) / 100;
    const row = [
      String(idx + 1),
      slot.role_name ?? "",
      `£${slot.rate_gbp}`,
      ...dayCells,
      String(slotHours || ""),
      cost ? `£${cost.toFixed(2)}` : "",
    ];
    doc.font("Helvetica").fontSize(7).fillColor("#222");
    x = left;
    const rowTop = y;
    let rowH = 12;
    row.forEach((cell, i) => {
      doc.text(cell, x, rowTop, {
        width: colW[i],
        align: i >= 3 ? "center" : "left",
      });
      rowH = Math.max(rowH, doc.y - rowTop);
      x += colW[i];
    });
    y = rowTop + rowH + 4;
  });

  // Day totals strip
  y += 4;
  doc.font("Helvetica").fontSize(8).fillColor("#555");
  const dayTot = totals.byDay
    .map((d, i) => `${DAY_NAMES[i].slice(0, 3)} ${d.hours}h/£${d.cost.toFixed(0)}`)
    .join("  ");
  doc.text(dayTot, left, y, { width });
  y = doc.y + 18;
  return y;
}

export async function buildRotaPdf(
  ownerSub: string,
  weekIds: string[],
): Promise<Buffer> {
  const weeks: WeekDetail[] = [];
  for (const id of weekIds) {
    const w = await getWeek(ownerSub, id);
    if (w) weeks.push(w);
  }
  if (weeks.length === 0) throw new Error("No weeks found");

  weeks.sort((a, b) => a.week_start.localeCompare(b.week_start));

  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    info: {
      Title: "Door Rota",
      Author: "Luna Springs",
    },
  });
  const done = bufferFromPdf(doc);

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#0c1017")
    .text("Luna Springs · Door Rota", 48, 40);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#666")
    .text(
      weeks.length === 1
        ? formatWeekLabel(weeks[0].week_start)
        : `${weeks.length} weeks · ${formatWeekLabel(weeks[0].week_start)} → ${formatWeekLabel(weeks[weeks.length - 1].week_start)}`,
      48,
      doc.y + 2,
    );

  let y = doc.y + 16;
  weeks.forEach((week, i) => {
    if (i > 0) {
      if (y > 640) {
        doc.addPage();
        y = 48;
      } else {
        doc
          .strokeColor("#ddd")
          .moveTo(48, y)
          .lineTo(564, y)
          .stroke();
        y += 14;
      }
    }
    y = drawWeek(doc, week, y);
  });

  doc.end();
  return done;
}
