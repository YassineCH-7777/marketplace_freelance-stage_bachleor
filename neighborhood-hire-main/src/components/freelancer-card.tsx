import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import type { FreelancerProfile } from "@/api/types";

const statusLabel: Record<FreelancerProfile["availabilityStatus"], { label: string; className: string }> = {
  AVAILABLE: { label: "Disponible", className: "bg-success/15 text-success" },
  BUSY: { label: "Occupé", className: "bg-warning/20 text-warning-foreground" },
  UNAVAILABLE: { label: "Indisponible", className: "bg-muted text-muted-foreground" },
};

export function FreelancerCard({ freelancer }: { freelancer: FreelancerProfile }) {
  const status = statusLabel[freelancer.availabilityStatus];
  return (
    <Link
      to="/freelancers/$freelancerId"
      params={{ freelancerId: String(freelancer.id) }}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-primary-glow/40 hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--gradient-accent)] font-display text-lg font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
          {freelancer.firstName.charAt(0)}
          {freelancer.lastName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-foreground">
            {freelancer.firstName} {freelancer.lastName}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {freelancer.city} · {freelancer.experienceYears} ans d'exp.
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{freelancer.bio}</p>

      <div className="flex flex-wrap gap-1.5">
        {freelancer.skills.slice(0, 3).map((skill) => (
          <span key={skill} className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-warning text-warning" />
          <span className="font-semibold text-foreground">{freelancer.averageRating.toFixed(1)}</span>
          <span className="text-muted-foreground">({freelancer.totalReviews})</span>
        </div>
        <div className="font-display text-sm font-semibold text-foreground">
          {freelancer.hourlyRate} <span className="text-xs font-medium text-muted-foreground">MAD/h</span>
        </div>
      </div>
    </Link>
  );
}
