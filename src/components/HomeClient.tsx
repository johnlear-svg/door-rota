"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  formatHours,
  formatMoney,
  formatWeekLabel,
  nextMonday,
} from "@/lib/hours";
import type { WeekSummary } from "@/lib/types";
import { MonthCalendar } from "./MonthCalendar";

async function downloadPdf(weekIds: string[], filenameHint?: string) {
  const res = await fetch("/api/weeks/export-pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ week_ids: weekIds }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "PDF export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filenameHint || `door-rota-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function HomeClient({ initialWeeks }: { initialWeeks: WeekSummary[] }) {
  const router = useRouter();
  const [weeks, setWeeks] = useState(initialWeeks);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [modalOpen, setModalOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<Set<string>>(new Set());
  const [weekStart, setWeekStart] = useState(nextMonday);
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (modalOpen) setWeekStart(nextMonday());
  }, [modalOpen]);

  useEffect(() => {
    if (exportOpen) {
      setSelectedExport(new Set(weeks.slice(0, Math.min(4, weeks.length)).map((w) => w.id)));
      setExportError(null);
    }
  }, [exportOpen, weeks]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return weeks;
    return weeks.filter((w) => {
      const hay = [
        w.label,
        w.notes,
        w.week_start,
        formatWeekLabel(w.week_start),
        ...w.event_names,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [weeks, deferredQuery]);

  async function refresh() {
    const res = await fetch("/api/weeks", { cache: "no-store" });
    if (res.ok) setWeeks(await res.json());
  }

  async function createWeek() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/weeks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ week_start: weekStart }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not create week");
          return;
        }
        setModalOpen(false);
        router.push(`/week/${data.id}`);
      } catch {
        setError("Could not create week");
      }
    });
  }

  function toggleExportId(id: string) {
    setSelectedExport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runExport() {
    setExportError(null);
    setExporting(true);
    try {
      const ids = Array.from(selectedExport);
      if (ids.length === 0) {
        setExportError("Select at least one week");
        return;
      }
      await downloadPdf(ids);
      setExportOpen(false);
      await refresh();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <section className="rise rise-delay-1 mb-10 max-w-2xl">
        <p className="muted text-base leading-relaxed md:text-lg">
          Luna Springs door crew, week by week — add roles as the night needs,
          set times, and watch hours and cost update as you go.
        </p>
      </section>

      <section className="rise rise-delay-2 mb-12 flex flex-col gap-4 border-t border-[var(--line)] pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            className="text-xl"
            style={{ fontFamily: "var(--font-display)", color: "var(--paper)" }}
          >
            Plan a week
          </h2>
          <p className="muted mt-1 text-sm">
            Pick a Monday to plan door security in advance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setExportOpen(true)}
            disabled={weeks.length === 0}
          >
            Export PDF
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
          >
            New week
          </button>
        </div>
      </section>

      <section className="rise rise-delay-3">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            className="text-xl"
            style={{ fontFamily: "var(--font-display)", color: "var(--paper)" }}
          >
            Previous weeks
          </h2>
          <input
            className="field max-w-sm"
            placeholder="Search events, labels, dates…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search previous weeks"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="muted py-10">
            No weeks yet. Create one to start planning.
          </p>
        ) : (
          <ul>
            {filtered.map((w, i) => (
              <li
                key={w.id}
                className="week-row rise"
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                <Link href={`/week/${w.id}`} className="min-w-0">
                  <p
                    className="text-lg leading-tight"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--paper)",
                    }}
                  >
                    {formatWeekLabel(w.week_start)}
                  </p>
                  <p className="muted mt-1 truncate text-sm">
                    {w.label ||
                      (w.event_names.length
                        ? w.event_names.join(" · ")
                        : "No events named yet")}
                  </p>
                </Link>
                <div className="text-right">
                  <p className="text-sm">
                    <span className="text-brass">{formatMoney(w.total_cost)}</span>
                    <span className="muted"> · {formatHours(w.total_hours)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modalOpen ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-week-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="modal modal-wide">
            <h3 id="new-week-title">New week</h3>
            <p>
              Pick a date on the calendar — we’ll snap to that week’s Monday so
              you can plan door security ahead.
            </p>
            <MonthCalendar value={weekStart} onChange={setWeekStart} />
            <p className="muted mt-3 text-xs">
              Selected week: <strong style={{ color: "var(--paper)" }}>{formatWeekLabel(weekStart)}</strong>
            </p>
            {error ? (
              <p className="mt-3 text-sm" style={{ color: "#f0a39a" }} role="alert">
                {error}
              </p>
            ) : null}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-small"
                disabled={pending}
                onClick={createWeek}
              >
                {pending ? "Creating…" : "Create week"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exportOpen ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-pdf-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportOpen(false);
          }}
        >
          <div className="modal modal-wide">
            <h3 id="export-pdf-title">Export PDF</h3>
            <p>Select one or more weeks to combine into a single PDF.</p>
            <ul className="export-list">
              {weeks.map((w) => (
                <li key={w.id}>
                  <label className="export-row">
                    <input
                      type="checkbox"
                      checked={selectedExport.has(w.id)}
                      onChange={() => toggleExportId(w.id)}
                    />
                    <span>
                      <strong>{formatWeekLabel(w.week_start)}</strong>
                      <span className="muted">
                        {" "}
                        · {w.label || w.event_names.join(" · ") || "Untitled"} ·{" "}
                        {formatMoney(w.total_cost)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setSelectedExport(new Set(weeks.map((w) => w.id)))}
              >
                Select all
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setSelectedExport(new Set())}
              >
                Clear
              </button>
            </div>
            {exportError ? (
              <p className="mt-3 text-sm" style={{ color: "#f0a39a" }} role="alert">
                {exportError}
              </p>
            ) : null}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setExportOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-small"
                disabled={exporting || selectedExport.size === 0}
                onClick={() => void runExport()}
              >
                {exporting
                  ? "Building…"
                  : `Download PDF (${selectedExport.size})`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
