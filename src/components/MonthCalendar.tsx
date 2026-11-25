"use client";

import { useMemo, useState } from "react";
import { mondayOf } from "@/lib/hours";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

type Props = {
  value: string; // YYYY-MM-DD (selected Monday or any date that snaps)
  onChange: (isoDate: string) => void;
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1, 12));
}

export function MonthCalendar({ value, onChange }: Props) {
  const selected = value || ymd(new Date());
  const initial = new Date(`${selected}T12:00:00`);
  const [cursor, setCursor] = useState(
    () => new Date(Date.UTC(initial.getFullYear(), initial.getMonth(), 1, 12)),
  );

  const cells = useMemo(() => {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const first = startOfMonth(year, month);
    // Monday-first: getUTCDay 0=Sun → convert
    const firstDow = first.getUTCDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const gridStart = new Date(first);
    gridStart.setUTCDate(1 - offset);

    const days: { iso: string; inMonth: boolean; isMonday: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setUTCDate(gridStart.getUTCDate() + i);
      const iso = ymd(d);
      days.push({
        iso,
        inMonth: d.getUTCMonth() === month,
        isMonday: d.getUTCDay() === 1,
      });
    }
    return days;
  }, [cursor]);

  const label = cursor.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const selectedMonday = mondayOf(selected);

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          aria-label="Previous month"
          onClick={() =>
            setCursor(
              new Date(
                Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1, 12),
              ),
            )
          }
        >
          ‹
        </button>
        <p className="calendar-label">{label}</p>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          aria-label="Next month"
          onClick={() =>
            setCursor(
              new Date(
                Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1, 12),
              ),
            )
          }
        >
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="calendar-dow">
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          const mon = mondayOf(cell.iso);
          const selectedWeek = mon === selectedMonday;
          return (
            <button
              key={cell.iso}
              type="button"
              className={[
                "calendar-day",
                cell.inMonth ? "" : "is-outside",
                cell.isMonday ? "is-monday" : "",
                selectedWeek ? "is-selected" : "",
                cell.iso === selectedMonday ? "is-anchor" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onChange(mondayOf(cell.iso))}
              title={
                cell.isMonday
                  ? `Week of ${cell.iso}`
                  : `Select week starting ${mon}`
              }
            >
              {Number(cell.iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
      <p className="muted calendar-hint">
        Tap any day — the week snaps to that Monday ({selectedMonday}).
      </p>
    </div>
  );
}
