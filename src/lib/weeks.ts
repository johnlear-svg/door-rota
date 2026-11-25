import { sql } from "./db";
import { calcHours, newId } from "./hours";
import type { Role, Shift, StaffSlot, WeekDay, WeekDetail, WeekSummary } from "./types";

type WeekRow = {
  id: string;
  week_start: string | Date;
  label: string;
  notes: string;
  archived: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

function asDate(v: string | Date): string {
  if (typeof v === "string") return v.slice(0, 10);
  return v.toISOString().slice(0, 10);
}

function asIso(v: string | Date): string {
  if (typeof v === "string") return v;
  return v.toISOString();
}

function num(v: unknown): number {
  return Number(v);
}

export async function listRoles(): Promise<Role[]> {
  const rows = await sql<{
    id: string;
    name: string;
    rate_gbp: string | number;
    sort_order: number;
  }>("select id, name, rate_gbp, sort_order from roles order by sort_order, name");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    rate_gbp: num(r.rate_gbp),
    sort_order: r.sort_order,
  }));
}

export async function listWeeks(q?: string): Promise<WeekSummary[]> {
  const weeks = await sql<WeekRow>(
    `select id, week_start, label, notes, archived, created_at, updated_at
     from weeks order by week_start desc`,
  );
  const summaries: WeekSummary[] = [];
  for (const w of weeks) {
    const detail = await getWeek(w.id);
    if (!detail) continue;
    const { totalHours, totalCost } = totalsFor(detail.slots);
    const eventNames = detail.days.map((d) => d.event_name.trim()).filter(Boolean);
    const hay = [detail.label, detail.notes, asDate(w.week_start), ...eventNames].join(" ").toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) continue;
    summaries.push({
      id: w.id,
      week_start: asDate(w.week_start),
      label: w.label,
      notes: w.notes,
      archived: w.archived,
      created_at: asIso(w.created_at),
      updated_at: asIso(w.updated_at),
      total_hours: totalHours,
      total_cost: totalCost,
      event_names: eventNames,
    });
  }
  return summaries;
}

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

export async function getWeek(id: string): Promise<WeekDetail | null> {
  const weeks = await sql<WeekRow>(
    `select id, week_start, label, notes, archived, created_at, updated_at from weeks where id = $1`,
    [id],
  );
  if (!weeks[0]) return null;
  const w = weeks[0];
  const roles = await listRoles();
  const days = await sql<{ id: string; week_id: string; day_index: number; event_name: string }>(
    `select id, week_id, day_index, event_name from week_days where week_id = $1 order by day_index`,
    [id],
  );
  const slotsRaw = await sql<{
    id: string; week_id: string; role_id: string; person_name: string;
    rate_gbp: string | number; sort_order: number; role_name: string;
  }>(
    `select s.id, s.week_id, s.role_id, s.person_name, s.rate_gbp, s.sort_order, r.name as role_name
     from staff_slots s join roles r on r.id = s.role_id
     where s.week_id = $1 order by s.sort_order, s.id`,
    [id],
  );
  const shifts = await sql<{
    id: string; slot_id: string; day_index: number; start_time: string | null; end_time: string | null;
  }>(
    `select sh.id, sh.slot_id, sh.day_index, sh.start_time, sh.end_time
     from shifts sh join staff_slots s on s.id = sh.slot_id where s.week_id = $1`,
    [id],
  );
  const bySlot = new Map<string, Shift[]>();
  for (const sh of shifts) {
    const list = bySlot.get(sh.slot_id) ?? [];
    list.push(sh);
    bySlot.set(sh.slot_id, list);
  }
  const slots: StaffSlot[] = slotsRaw.map((s) => ({
    id: s.id,
    week_id: s.week_id,
    role_id: s.role_id,
    person_name: s.person_name,
    rate_gbp: num(s.rate_gbp),
    sort_order: s.sort_order,
    role_name: s.role_name,
    shifts: (bySlot.get(s.id) ?? []).sort((a, b) => a.day_index - b.day_index),
  }));
  return {
    id: w.id,
    week_start: asDate(w.week_start),
    label: w.label,
    notes: w.notes,
    archived: w.archived,
    days: days as WeekDay[],
    slots,
    roles,
  };
}

export async function createWeek(weekStart: string, label = ""): Promise<WeekDetail> {
  const id = newId("week");
  await sql(`insert into weeks (id, week_start, label) values ($1, $2, $3)`, [id, weekStart, label]);
  for (let i = 0; i < 7; i++) {
    await sql(`insert into week_days (id, week_id, day_index, event_name) values ($1, $2, $3, $4)`, [
      newId("day"), id, i, "",
    ]);
  }
  const roles = await listRoles();
  const seed = [
    roles.find((r) => r.id === "role_manager"),
    roles.find((r) => r.id === "role_supervisor"),
    roles.find((r) => r.id === "role_door"),
    roles.find((r) => r.id === "role_door"),
  ].filter(Boolean) as Role[];
  let order = 0;
  for (const role of seed) {
    await addSlot(id, role.id, "", role.rate_gbp, order++);
  }
  const week = await getWeek(id);
  if (!week) throw new Error("failed to create week");
  return week;
}

export async function addSlot(
  weekId: string,
  roleId: string,
  personName = "",
  rateGbp?: number,
  sortOrder?: number,
): Promise<StaffSlot> {
  const roles = await listRoles();
  const role = roles.find((r) => r.id === roleId);
  if (!role) throw new Error("unknown role");
  const max = await sql<{ m: number | null }>(
    `select max(sort_order) as m from staff_slots where week_id = $1`,
    [weekId],
  );
  const order = sortOrder ?? (num(max[0]?.m ?? -1) + 1);
  const id = newId("slot");
  const rate = rateGbp ?? role.rate_gbp;
  await sql(
    `insert into staff_slots (id, week_id, role_id, person_name, rate_gbp, sort_order)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, weekId, roleId, personName, rate, order],
  );
  for (let i = 0; i < 7; i++) {
    await sql(
      `insert into shifts (id, slot_id, day_index, start_time, end_time) values ($1, $2, $3, null, null)`,
      [newId("shift"), id, i],
    );
  }
  await touchWeek(weekId);
  const week = await getWeek(weekId);
  const slot = week?.slots.find((s) => s.id === id);
  if (!slot) throw new Error("slot missing");
  return slot;
}

export async function removeSlot(slotId: string): Promise<string> {
  const rows = await sql<{ week_id: string }>(`select week_id from staff_slots where id = $1`, [slotId]);
  if (!rows[0]) throw new Error("slot not found");
  await sql(`delete from staff_slots where id = $1`, [slotId]);
  await touchWeek(rows[0].week_id);
  return rows[0].week_id;
}

export async function updateWeekMeta(
  id: string,
  patch: { label?: string; notes?: string; archived?: boolean },
): Promise<void> {
  if (patch.label !== undefined) {
    await sql(`update weeks set label = $2, updated_at = now() where id = $1`, [id, patch.label]);
  }
  if (patch.notes !== undefined) {
    await sql(`update weeks set notes = $2, updated_at = now() where id = $1`, [id, patch.notes]);
  }
  if (patch.archived !== undefined) {
    await sql(`update weeks set archived = $2, updated_at = now() where id = $1`, [id, patch.archived]);
  }
}

export async function updateDayEvent(weekId: string, dayIndex: number, eventName: string): Promise<void> {
  await sql(`update week_days set event_name = $3 where week_id = $1 and day_index = $2`, [
    weekId, dayIndex, eventName,
  ]);
  await touchWeek(weekId);
}

export async function updateSlot(
  slotId: string,
  patch: { person_name?: string; rate_gbp?: number; role_id?: string },
): Promise<string> {
  const rows = await sql<{ week_id: string }>(`select week_id from staff_slots where id = $1`, [slotId]);
  if (!rows[0]) throw new Error("slot not found");
  if (patch.person_name !== undefined) {
    await sql(`update staff_slots set person_name = $2 where id = $1`, [slotId, patch.person_name]);
  }
  if (patch.rate_gbp !== undefined) {
    await sql(`update staff_slots set rate_gbp = $2 where id = $1`, [slotId, patch.rate_gbp]);
  }
  if (patch.role_id !== undefined) {
    await sql(`update staff_slots set role_id = $2 where id = $1`, [slotId, patch.role_id]);
  }
  await touchWeek(rows[0].week_id);
  return rows[0].week_id;
}

export async function updateShift(
  shiftId: string,
  start: string | null,
  end: string | null,
): Promise<string> {
  const rows = await sql<{ week_id: string }>(
    `select s.week_id from shifts sh join staff_slots s on s.id = sh.slot_id where sh.id = $1`,
    [shiftId],
  );
  if (!rows[0]) throw new Error("shift not found");
  await sql(`update shifts set start_time = $2, end_time = $3 where id = $1`, [
    shiftId, start || null, end || null,
  ]);
  await touchWeek(rows[0].week_id);
  return rows[0].week_id;
}

export async function deleteWeek(id: string): Promise<void> {
  await sql(`delete from weeks where id = $1`, [id]);
}

export async function updateRole(id: string, patch: { name?: string; rate_gbp?: number }): Promise<void> {
  if (patch.name !== undefined) {
    await sql(`update roles set name = $2 where id = $1`, [id, patch.name]);
  }
  if (patch.rate_gbp !== undefined) {
    await sql(`update roles set rate_gbp = $2 where id = $1`, [id, patch.rate_gbp]);
  }
}

export async function createRole(name: string, rateGbp: number): Promise<Role> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("name required");
  if (!Number.isFinite(rateGbp) || rateGbp < 0) throw new Error("rate required");
  const max = await sql<{ m: number | null }>(
    `select max(sort_order) as m from roles`,
  );
  const order = num(max[0]?.m ?? 0) + 1;
  const id = newId("role");
  await sql(
    `insert into roles (id, name, rate_gbp, sort_order) values ($1, $2, $3, $4)`,
    [id, trimmed, rateGbp, order],
  );
  return { id, name: trimmed, rate_gbp: rateGbp, sort_order: order };
}

export async function deleteRole(id: string): Promise<void> {
  const used = await sql<{ c: string }>(
    `select count(*)::text as c from staff_slots where role_id = $1`,
    [id],
  );
  if (Number(used[0]?.c ?? 0) > 0) {
    throw new Error(
      "This role is used on staff slots — remove those slots from weeks first.",
    );
  }
  const rows = await sql<{ id: string }>(`select id from roles where id = $1`, [
    id,
  ]);
  if (!rows[0]) throw new Error("role not found");
  await sql(`delete from roles where id = $1`, [id]);
}

async function touchWeek(id: string): Promise<void> {
  await sql(`update weeks set updated_at = now() where id = $1`, [id]);
}

export async function ensureSampleWeek(): Promise<void> {
  const existing = await sql<{ c: string }>(`select count(*)::text as c from weeks`);
  if (Number(existing[0]?.c ?? 0) > 0) return;
  const week = await createWeek("2026-03-30", "Sample — Full Moon week");
  await updateDayEvent(week.id, 5, "Cook Out R&B / Hip Hop");
  await updateDayEvent(week.id, 6, "Full Moon");
  const refreshed = await getWeek(week.id);
  if (!refreshed) return;
  for (const slot of refreshed.slots) {
    const isDoor = slot.role_id === "role_door";
    const start = isDoor ? "21:00" : "20:00";
    const end = isDoor ? "03:00" : "02:00";
    for (const day of [5, 6]) {
      const sh = slot.shifts.find((s) => s.day_index === day);
      if (sh) await updateShift(sh.id, start, end);
    }
  }
}
