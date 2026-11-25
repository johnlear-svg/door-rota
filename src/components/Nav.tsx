import Image from "next/image";
import Link from "next/link";

export function Nav({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`rise ${compact ? "mb-6" : "mb-10"}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Link href="/" className="group block min-w-0">
          <Image
            src="/luna-springs-logo.png"
            alt="Luna Springs"
            width={842}
            height={595}
            priority
            className={compact ? "logo logo-compact" : "logo"}
          />
          <p className="eyebrow">Security · hours · cost</p>
          <h1 className={compact ? "brand brand-compact" : "brand"}>
            Door <span>Rota</span>
          </h1>
        </Link>
        <nav className="flex flex-wrap gap-2 rise rise-delay-1">
          <Link href="/" className="btn btn-ghost btn-small">
            Weeks
          </Link>
          <Link href="/roles" className="btn btn-ghost btn-small">
            Roles & Rates
          </Link>
        </nav>
      </div>
    </header>
  );
}
