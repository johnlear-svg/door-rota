import { calcHours } from "./hours";
import type { StaffSlot } from "./types";

export function totalsFor(slots: StaffSlot[]): {
  totalHours: number;
  totalCost: number;
  byDay: { hours: number; cost: number }[];
} {
  const byDay = Array.from({ length: 7 }, () => ({ hours: 0, cost: 0 }));
  let totalHours = 0;
  let totalCost = 0;
  for (const slot of slots) {
    for (const sh of slot.shifts) {
      const h = calcHours(sh.start_time, sh.end_time);
      const c = h * slot.rate_gbp;
      byDay[sh.day_index].hours += h;
      byDay[sh.day_index].cost += c;
      totalHours += h;
      totalCost += c;
    }
  }
  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    byDay: byDay.map((d) => ({
      hours: Math.round(d.hours * 100) / 100,
      cost: Math.round(d.cost * 100) / 100,
    })),
  };
}
