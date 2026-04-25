import { Link } from "@tanstack/react-router";
import { Briefcase, Search } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--gradient-accent)] text-primary-foreground shadow-[var(--shadow-glow)]">
            <Briefcase className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span>
            Proxi<span className="text-gradient">Skills</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/services" className="transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Services
          </Link>
          <Link to="/services" search={{ q: "" }} className="transition-colors hover:text-foreground">
            Catégories
          </Link>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            Comment ça marche
          </a>
          <a href="#freelancers" className="transition-colors hover:text-foreground">
            Freelances
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/services"
            className="hidden items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] sm:inline-flex"
          >
            <Search className="h-4 w-4" />
            Trouver
          </Link>
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-md)] transition hover:-translate-y-0.5 hover:bg-primary/90"
          >
            Devenir freelance
          </button>
        </div>
      </div>
    </header>
  );
}
