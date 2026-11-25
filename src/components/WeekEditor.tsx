"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  DAY_NAMES,
  addDays,
  calcHours,
  formatHours,
  formatMoney,
  formatWeekLabel,
} from "@/lib/hours";
import { SECTION_META, sectionHref } from "@/lib/sections";
import type { Role, WeekDetail } from "@/lib/types";
import { totalsFor } from "@/lib/client-totals";

/** Accept 18:00 / 1800 / 18 → normalize to HH:mm or null if empty/invalid. */
function normalizeHm(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = /^(\d{1,2}):?(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function WeekEditor({ initial }: { initial: WeekDetail }) {
  const router = useRouter();
  const [week, setWeek] = useState(initial);
  const [day, setDay] = useState(0);
  const [pending, startTransition] = useTransition();
  const sectionMeta = SECTION_META[initial.section];
  const [addRoleId, setAddRoleId] = useState(
    initial.roles.find((r) => r.id === sectionMeta.defaultRoleId)?.id ??
      initial.roles[0]?.id ??
      "",
  );

  const totals = useMemo(() => totalsFor(week.slots), [week.slots]);

  function applyWeek(next: WeekDetail) {
    setWeek(next);
  }

  async function patchMeta(body: Record<string, unknown>) {
    const res = await fetch(`/api/weeks/${week.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    applyWeek(await res.json());
  }

  async function addSlot() {
    if (!addRoleId) return;
    startTransition(async () => {
      const res = await fetch(`/api/weeks/${week.id}/slots`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role_id: addRoleId }),
      });
      if (res.ok) applyWeek(await res.json());
    });
  }

  async function removeSlot(slotId: string) {
    startTransition(async () => {
      const res = await fetch(
        `/api/weeks/${week.id}/slots?slot_id=${encodeURIComponent(slotId)}`,
        { method: "DELETE" },
      );
      if (res.ok) applyWeek(await res.json());
    });
  }

  async function patchSlot(slotId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/weeks/${week.id}/slots`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slot_id: slotId, ...body }),
    });
    if (res.ok) applyWeek(await res.json());
  }

  async function patchShift(
    shiftId: string,
    start_time: string | null,
    end_time: string | null,
  ) {
    const res = await fetch(`/api/weeks/${week.id}/shifts`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shift_id: shiftId, start_time, end_time }),
    });
    if (res.ok) applyWeek(await res.json());
  }

  async function removeWeek() {
    if (!confirm("Delete this week permanently?")) return;
    await fetch(`/api/weeks/${week.id}`, { method: "DELETE" });
    router.push(sectionHref("/", week.section));
  }

  async function exportPdf() {
    const res = await fetch("/api/weeks/export-pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ week_ids: [week.id] }),
    });
    if (!res.ok) {
      alert("Could not export PDF");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${SECTION_META[week.section].filePrefix}-${week.week_start}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const dayEvent =
    week.days.find((d) => d.day_index === day)?.event_name ?? "";

  return (
    <div>
      <div className="rise mb-8 flex flex-col gap-4 border-b border-[var(--line)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href={sectionHref("/", week.section)} className="muted text-sm">
            ← Previous weeks
          </Link>
          <p className="muted mt-2 text-xs uppercase tracking-[0.16em]">
            {SECTION_META[week.section].pdfTitle}
          </p>
          <h2
            className="mt-1 text-3xl leading-none md:text-4xl"
            style={{ fontFamily: "var(--font-display)", color: "var(--paper)" }}
          >
            {formatWeekLabel(week.week_start)}
          </h2>
          <input
            className="field mt-3 max-w-md"
            placeholder="Week label (optional)"
            defaultValue={week.label}
            onBlur={(e) => {
              if (e.target.value !== week.label) {
                void patchMeta({ label: e.target.value });
              }
            }}
          />
        </div>
        <div className="totals-glow panel">
          <p className="muted text-xs uppercase tracking-[0.18em]">Week total</p>
          <p
            className="mt-1 text-3xl text-brass"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatMoney(totals.totalCost)}
          </p>
          <p className="muted text-sm">{formatHours(totals.totalHours)}</p>
        </div>
      </div>

      <div className="rise rise-delay-1 mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => void exportPdf()}
        >
          Export PDF
        </button>
        <button type="button" className="btn btn-danger btn-small" onClick={removeWeek}>
          Delete
        </button>
      </div>

      <section className="rise rise-delay-2 mb-8">
        <div className="day-rail">
          {DAY_NAMES.map((name, i) => {
            const date = addDays(week.week_start, i);
            const event =
              week.days.find((d) => d.day_index === i)?.event_name ?? "";
            const dayTot = totals.byDay[i];
            return (
              <button
                key={name}
                type="button"
                className={`day-chip ${day === i ? "active" : ""}`}
                onClick={() => setDay(i)}
              >
                <p className="text-xs uppercase tracking-[0.14em] muted">
                  {name.slice(0, 3)}
                </p>
                <p className="mt-1 text-sm">{date.slice(5)}</p>
                <p className="mt-2 truncate text-xs muted">{event || "—"}</p>
                <p className="mt-2 text-xs text-brass">
                  {formatMoney(dayTot.cost)}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <label
            className="muted mb-2 block text-xs uppercase tracking-[0.18em]"
            htmlFor="event-name"
          >
            Event · {DAY_NAMES[day]}
          </label>
          <input
            id="event-name"
            className="field max-w-xl"
            key={`${week.id}-${day}-${dayEvent}`}
            defaultValue={dayEvent}
            placeholder="Event name / capacity note"
            onBlur={(e) => {
              if (e.target.value !== dayEvent) {
                void patchMeta({
                  day_index: day,
                  event_name: e.target.value,
                });
              }
            }}
          />
        </div>
      </section>

      <section className="rise rise-delay-3">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3
            className="text-xl"
            style={{ fontFamily: "var(--font-display)", color: "var(--paper)" }}
          >
            Staff · {DAY_NAMES[day]}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="field max-w-[12rem]"
              value={addRoleId}
              onChange={(e) => setAddRoleId(e.target.value)}
              aria-label="Role to add"
            >
              {week.roles.map((r: Role) => (
                <option key={r.id} value={r.id}>
                  {r.name} (£{r.rate_gbp})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary btn-small"
              disabled={pending}
              onClick={addSlot}
            >
              Add role
            </button>
          </div>
        </div>

        {week.slots.length === 0 ? (
          <p className="muted py-8">No roles yet — add one above.</p>
        ) : (
          <ul className="space-y-4">
            {week.slots.map((slot, idx) => {
              const shift = slot.shifts.find((s) => s.day_index === day);
              const hours = calcHours(shift?.start_time, shift?.end_time);
              const cost = hours * slot.rate_gbp;
              return (
                <li
                  key={slot.id}
                  className="slot-grid border-t border-[var(--line)] pt-4"
                >
                  <div>
                    <p className="muted text-xs">#{idx + 1}</p>
                    <p className="role-title mt-1">
                      {slot.role_name ?? "Role"}
                    </p>
                    <label className="muted mt-2 flex items-center gap-2 text-xs">
                      £/hr
                      <input
                        className="field w-20"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={slot.rate_gbp}
                        key={`rate-${slot.id}-${slot.rate_gbp}`}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isNaN(v) && v !== slot.rate_gbp) {
                            void patchSlot(slot.id, { rate_gbp: v });
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <p className="muted mb-2 text-xs uppercase tracking-[0.14em]">
                      Shift (24h · HH:mm)
                    </p>
                    <div className="time-pair max-w-xs">
                      <input
                        className="field"
                        type="text"
                        inputMode="numeric"
                        placeholder="18:00"
                        pattern="([01]\d|2[0-3]):[0-5]\d"
                        aria-label="Start HH:mm"
                        title="Start 24h HH:mm"
                        defaultValue={shift?.start_time ?? ""}
                        key={`start-${shift?.id}-${shift?.start_time ?? ""}`}
                        onBlur={(e) => {
                          if (!shift) return;
                          const v = normalizeHm(e.target.value);
                          if (v === (shift.start_time ?? "")) return;
                          e.target.value = v ?? "";
                          void patchShift(shift.id, v, shift.end_time);
                        }}
                      />
                      <input
                        className="field"
                        type="text"
                        inputMode="numeric"
                        placeholder="02:00"
                        pattern="([01]\d|2[0-3]):[0-5]\d"
                        aria-label="End HH:mm"
                        title="End 24h HH:mm"
                        defaultValue={shift?.end_time ?? ""}
                        key={`end-${shift?.id}-${shift?.end_time ?? ""}`}
                        onBlur={(e) => {
                          if (!shift) return;
                          const v = normalizeHm(e.target.value);
                          if (v === (shift.end_time ?? "")) return;
                          e.target.value = v ?? "";
                          void patchShift(shift.id, shift.start_time, v);
                        }}
                      />
                    </div>
                    <p className="muted mt-2 text-xs">
                      Type 24-hour times — overnight ok (e.g. 18:00 → 02:00).
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <p className="text-sm">
                      {formatHours(hours)} ·{" "}
                      <span className="text-brass">{formatMoney(cost)}</span>
                    </p>
                    <button
                      type="button"
                      className="btn btn-danger btn-small"
                      onClick={() => void removeSlot(slot.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10 border-t border-[var(--line)] pt-6">
        <label
          className="muted mb-2 block text-xs uppercase tracking-[0.18em]"
          htmlFor="notes"
        >
          Notes
        </label>
        <textarea
          id="notes"
          className="field min-h-[5rem]"
          defaultValue={week.notes}
          key={`notes-${week.id}-${week.notes}`}
          onBlur={(e) => {
            if (e.target.value !== week.notes) {
              void patchMeta({ notes: e.target.value });
            }
          }}
        />
      </section>
    </div>
  );
}
