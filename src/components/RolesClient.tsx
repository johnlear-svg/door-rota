"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/hours";
import {
  SECTION_META,
  sectionHref,
  type RotaSection,
} from "@/lib/sections";
import type { Role } from "@/lib/types";

export function RolesClient({
  initial,
  section,
}: {
  initial: Role[];
  section: RotaSection;
}) {
  const meta = SECTION_META[section];
  const [roles, setRoles] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState(section === "medical" ? "35" : "20");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRoles(initial);
    setNewRate(section === "medical" ? "35" : "20");
  }, [initial, section]);

  async function save(role: Role) {
    setSaving(role.id);
    setError(null);
    const res = await fetch(`/api/roles?section=${section}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: role.id,
        name: role.name,
        rate_gbp: role.rate_gbp,
        section,
      }),
    });
    if (res.ok) setRoles(await res.json());
    setSaving(null);
  }

  async function addRole() {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch(`/api/roles?section=${section}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newName,
          rate_gbp: Number(newRate),
          section,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create role");
        return;
      }
      setRoles(data);
      setNewName("");
      setNewRate(section === "medical" ? "35" : "20");
    } catch {
      setError("Could not create role");
    } finally {
      setCreating(false);
    }
  }

  async function removeRole(role: Role) {
    const ok = confirm(
      `Delete role “${role.name}”? This cannot be undone. Roles still used on week slots cannot be deleted.`,
    );
    if (!ok) return;
    setDeleting(role.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/roles?id=${encodeURIComponent(role.id)}&section=${section}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not delete role");
        return;
      }
      setRoles(data);
    } catch {
      setError("Could not delete role");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="rise mb-8">
        <Link href={sectionHref("/", section)} className="muted text-sm">
          ← Weeks
        </Link>
        <h2
          className="mt-2 text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display)", color: "var(--paper)" }}
        >
          {meta.shortLabel} roles & rates
        </h2>
        <p className="muted mt-3 max-w-xl">{meta.rolesHint}</p>
      </div>

      <section className="panel rise rise-delay-1 mb-8 max-w-xl">
        <h3
          className="mb-4 text-lg"
          style={{ fontFamily: "var(--font-display)", color: "var(--paper)" }}
        >
          Add a role
        </h3>
        <label className="muted mb-1 block text-xs uppercase tracking-[0.16em]">
          Role name
        </label>
        <input
          className="field"
          placeholder={
            section === "medical" ? "e.g. First aider" : "e.g. Fire marshal"
          }
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <label className="muted mb-1 mt-3 block text-xs uppercase tracking-[0.16em]">
          Default rate (£/hr)
        </label>
        <input
          className="field max-w-[10rem]"
          type="number"
          step="0.01"
          min="0"
          value={newRate}
          onChange={(e) => setNewRate(e.target.value)}
        />
        {error ? (
          <p className="mt-3 text-sm" style={{ color: "#f0a39a" }} role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-4">
          <button
            type="button"
            className="btn btn-primary"
            disabled={creating || !newName.trim()}
            onClick={() => void addRole()}
          >
            {creating ? "Adding…" : "Add role"}
          </button>
        </div>
      </section>

      <ul className="rise rise-delay-2 max-w-xl space-y-6">
        {roles.map((role) => (
          <li key={role.id} className="border-t border-[var(--line)] pt-4">
            <label className="muted mb-1 block text-xs uppercase tracking-[0.16em]">
              Role name
            </label>
            <input
              className="field"
              value={role.name}
              onChange={(e) =>
                setRoles((prev) =>
                  prev.map((r) =>
                    r.id === role.id ? { ...r, name: e.target.value } : r,
                  ),
                )
              }
            />
            <label className="muted mb-1 mt-3 block text-xs uppercase tracking-[0.16em]">
              Default rate ({formatMoney(role.rate_gbp)}/hr)
            </label>
            <input
              className="field max-w-[10rem]"
              type="number"
              step="0.01"
              min="0"
              value={role.rate_gbp}
              onChange={(e) =>
                setRoles((prev) =>
                  prev.map((r) =>
                    r.id === role.id
                      ? { ...r, rate_gbp: Number(e.target.value) }
                      : r,
                  ),
                )
              }
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary btn-small"
                disabled={saving === role.id}
                onClick={() => void save(role)}
              >
                {saving === role.id ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-small"
                disabled={deleting === role.id || roles.length <= 1}
                onClick={() => void removeRole(role)}
              >
                {deleting === role.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
