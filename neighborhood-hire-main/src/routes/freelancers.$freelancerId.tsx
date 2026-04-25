import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Briefcase, MapPin, MessageCircle, Star } from "lucide-react";
import { fetchFreelancerById, searchServices } from "@/api/marketplace";
import { MOCK_SERVICES } from "@/api/mock";
import type { Service } from "@/api/types";
import { ServiceCard } from "@/components/service-card";

export const Route = createFileRoute("/freelancers/$freelancerId")({
  loader: async ({ params }) => {
    const freelancer = await fetchFreelancerById(Number(params.freelancerId));
    if (!freelancer) throw notFound();
    return { freelancer };
  },
  notFoundComponent: () => (
    <div className="container-page py-20 text-center">
      <h1 className="font-display text-3xl font-bold text-foreground">Freelance introuvable</h1>
      <Link to="/services" className="mt-4 inline-block text-sm font-semibold text-primary-glow">
        ← Retour
      </Link>
    </div>
  ),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.freelancer.firstName} ${loaderData.freelancer.lastName} — Freelance ${loaderData.freelancer.city}`
          : "Profil freelance",
      },
      { name: "description", content: loaderData?.freelancer.bio.slice(0, 160) ?? "" },
    ],
  }),
  component: FreelancerDetailPage,
});

function FreelancerDetailPage() {
  const { freelancer } = Route.useLoaderData();
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    void searchServices().then((all) => {
      // Le backend exposera /api/freelancers/{id}/services
      const f = all.filter((s) => s.freelancerId === freelancer.id);
      setServices(f.length ? f : MOCK_SERVICES.filter((s) => s.freelancerId === freelancer.id));
    });
  }, [freelancer.id]);

  return (
    <div className="container-page py-10">
      <Link to="/services" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
        ← Retour
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-md)]">
        <div className="h-32 bg-[var(--gradient-hero)]" />
        <div className="px-7 pb-7">
          <div className="-mt-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="grid h-24 w-24 place-items-center rounded-3xl border-4 border-card bg-[var(--gradient-accent)] font-display text-3xl font-bold text-primary-foreground shadow-[var(--shadow-lg)]">
                {freelancer.firstName.charAt(0)}
                {freelancer.lastName.charAt(0)}
              </div>
              <div className="pb-1">
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  {freelancer.firstName} {freelancer.lastName}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {freelancer.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" /> {freelancer.experienceYears} ans d'expérience
                  </span>
                </div>
              </div>
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-md)] transition hover:-translate-y-0.5">
              <MessageCircle className="h-4 w-4" />
              Contacter
            </button>
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-3">
            <Stat icon={<Star className="h-4 w-4 fill-warning text-warning" />} label="Note moyenne" value={freelancer.averageRating.toFixed(1)} />
            <Stat icon={<MessageCircle className="h-4 w-4 text-primary-glow" />} label="Avis reçus" value={freelancer.totalReviews.toString()} />
            <Stat icon={<Briefcase className="h-4 w-4 text-primary-glow" />} label="Tarif horaire" value={`${freelancer.hourlyRate} MAD`} />
          </div>

          <div className="mt-6">
            <h2 className="font-display text-lg font-semibold text-foreground">À propos</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{freelancer.bio}</p>
          </div>

          <div className="mt-6">
            <h2 className="font-display text-lg font-semibold text-foreground">Compétences</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {freelancer.skills.map((s: string) => (
                <span key={s} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-foreground">Services proposés</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun service publié pour le moment.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-card">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
