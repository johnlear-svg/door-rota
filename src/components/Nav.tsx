import Image from "next/image";
import Link from "next/link";
import {
  ROTA_SECTIONS,
  SECTION_META,
  sectionHref,
  type RotaSection,
} from "@/lib/sections";

export function Nav({
  compact = false,
  section = "security",
}: {
  compact?: boolean;
  section?: RotaSection;
}) {
  const meta = SECTION_META[section];
  return (
    <header className={`rise ${compact ? "mb-6" : "mb-10"}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Link href={sectionHref("/", section)} className="group block min-w-0">
          <Image
            src="/luna-springs-logo.png"
            alt="Luna Springs"
            width={842}
            height={595}
            priority
            className={compact ? "logo logo-compact" : "logo"}
          />
          <p className="eyebrow">{meta.eyebrow}</p>
          <h1 className={compact ? "brand brand-compact" : "brand"}>
            {meta.brand} <span>Rota</span>
          </h1>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 rise rise-delay-1">
          <div className="section-switch" role="tablist" aria-label="Rota section">
            {ROTA_SECTIONS.map((s) => (
              <Link
                key={s}
                href={sectionHref("/", s)}
                role="tab"
                aria-selected={s === section}
                className={`section-tab ${s === section ? "active" : ""}`}
              >
                {SECTION_META[s].shortLabel}
              </Link>
            ))}
          </div>
          <Link href={sectionHref("/", section)} className="btn btn-ghost btn-small">
            Weeks
          </Link>
          <Link
            href={sectionHref("/roles", section)}
            className="btn btn-ghost btn-small"
          >
            Roles & Rates
          </Link>
        </nav>
      </div>
    </header>
  );
}
