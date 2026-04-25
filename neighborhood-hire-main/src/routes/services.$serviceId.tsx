import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CheckCircle2, Clock, MapPin, MessageCircle, Star, Tag } from "lucide-react";
import { fetchServiceById } from "@/api/marketplace";

export const Route = createFileRoute("/services/$serviceId")({
  loader: async ({ params }) => {
    const service = await fetchServiceById(Number(params.serviceId));
    if (!service) throw notFound();
    return { service };
  },
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="font-display text-3xl font-bold text-foreground">Service introuvable</h1>
      <Link to="/services" className="mt-4 inline-block text-sm font-semibold text-primary-glow">
        ← Retour à la recherche
      </Link>
    </div>
  ),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.service.title ?? "Service"} — ProxiSkills` },
      { name: "description", content: loaderData?.service.description.slice(0, 160) ?? "" },
    ],
  }),
  component: ServiceDetailPage,
});

function ServiceDetailPage() {
  const { service } = Route.useLoaderData();

  return (
    <div className="container-page py-10">
      <Link to="/services" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
        ← Retour aux services
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="rounded-3xl bg-[var(--gradient-hero)] p-10 text-primary-foreground shadow-[var(--shadow-lg)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-background/20 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Tag className="h-3 w-3" />
              {service.category?.name ?? "Service"}
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">{service.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm opacity-90">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {service.city}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> Délai : {service.deliveryTime} jour
                {service.deliveryTime > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                {service.freelancer?.averageRating.toFixed(1)} ({service.freelancer?.totalReviews})
              </span>
            </div>
          </div>

          <section className="mt-8 rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-sm)]">
            <h2 className="font-display text-xl font-bold text-foreground">Description</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{service.description}</p>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-sm)]">
            <h2 className="font-display text-xl font-bold text-foreground">Ce qui est inclus</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "Échange et brief détaillé",
                "Livraison dans les délais convenus",
                "Révisions selon le pack choisi",
                "Support après livraison",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-md)] lg:sticky lg:top-24">
          <p className="text-xs text-muted-foreground">À partir de</p>
          <p className="mt-1 font-display text-4xl font-bold text-foreground">
            {service.price} <span className="text-base font-semibold text-muted-foreground">MAD</span>
          </p>

          <button className="mt-5 w-full rounded-xl bg-primary py-3 font-display text-sm font-semibold text-primary-foreground shadow-[var(--shadow-md)] transition hover:-translate-y-0.5 hover:bg-primary/90">
            Envoyer une demande
          </button>
          <button className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-elevated py-3 text-sm font-semibold text-foreground transition hover:border-primary-glow/40">
            <MessageCircle className="h-4 w-4" />
            Contacter
          </button>

          {service.freelancer && (
            <Link
              to="/freelancers/$freelancerId"
              params={{ freelancerId: String(service.freelancer.id) }}
              className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-primary-glow/40"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--gradient-accent)] font-display font-bold text-primary-foreground">
                {service.freelancer.firstName.charAt(0)}
                {service.freelancer.lastName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {service.freelancer.firstName} {service.freelancer.lastName}
                </p>
                <p className="text-xs text-muted-foreground">Voir le profil →</p>
              </div>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
