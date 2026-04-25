import { Link } from "@tanstack/react-router";
import { MapPin, Star, Clock } from "lucide-react";
import type { Service } from "@/api/types";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      to="/services/$serviceId"
      params={{ serviceId: String(service.id) }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-primary-glow/40 hover:shadow-[var(--shadow-lg)]"
    >
      <div className="relative h-44 overflow-hidden bg-[var(--gradient-hero)]">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
          {service.category?.name ?? "Service"}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="line-clamp-2 font-display text-lg font-semibold leading-snug text-primary-foreground">
            {service.title}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary font-display font-semibold text-secondary-foreground">
            {service.freelancer?.firstName.charAt(0)}
            {service.freelancer?.lastName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {service.freelancer?.firstName} {service.freelancer?.lastName}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {service.city}
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-warning/15 px-2 py-1 text-xs font-semibold text-foreground">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            {service.freelancer?.averageRating.toFixed(1)}
          </div>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{service.description}</p>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {service.deliveryTime} {service.deliveryTime > 1 ? "jours" : "jour"}
          </div>
          <div>
            <span className="text-xs text-muted-foreground">À partir de </span>
            <span className="font-display text-lg font-bold text-foreground">
              {service.price} <span className="text-sm font-medium">MAD</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
