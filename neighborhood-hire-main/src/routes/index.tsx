import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, MapPin, Search, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import heroImage from "@/assets/hero-freelancer.jpg";
import { fetchCategories, fetchTopFreelancers, searchServices } from "@/api/marketplace";
import { MOROCCAN_CITIES } from "@/api/mock";
import type { Category, FreelancerProfile, Service } from "@/api/types";
import { ServiceCard } from "@/components/service-card";
import { FreelancerCard } from "@/components/freelancer-card";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    void Promise.all([fetchCategories(), searchServices(), fetchTopFreelancers()]).then(
      ([c, s, f]) => {
        setCategories(c);
        setServices(s.slice(0, 6));
        setFreelancers(f);
      },
    );
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void navigate({ to: "/services", search: { q, city } });
  }

  return (
    <div>
      {/* HERO — split-screen */}
      <section className="container-page grid items-center gap-12 py-14 md:grid-cols-2 md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs font-semibold text-foreground shadow-[var(--shadow-sm)]">
            <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
            Freelances vérifiés près de chez vous
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            Trouvez le bon <span className="text-gradient">freelance local</span> en quelques clics.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            ProxiSkills connecte clients et freelances de votre ville pour des missions de design, développement,
            photo, cours, réparation et bien plus.
          </p>

          <form
            onSubmit={onSearch}
            className="mt-8 flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-lg)] sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Que cherchez-vous ? (ex: logo, site web…)"
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 sm:w-48">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-transparent py-3 text-sm outline-none"
              >
                <option value="">Toutes villes</option>
                {MOROCCAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-md)] transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Rechercher
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              Profils vérifiés
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-warning text-warning" />
              Avis et notes transparents
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary-glow" />
              +500 freelances locaux
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-[var(--gradient-accent)] opacity-30 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-lg)]">
            <img
              src={heroImage}
              alt="Freelance marocain travaillant sur son ordinateur"
              width={1280}
              height={1280}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Floating cards */}
          <div className="absolute -left-4 bottom-8 hidden w-56 rounded-2xl border border-border bg-card/95 p-4 shadow-[var(--shadow-lg)] backdrop-blur md:block">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-success/15 text-success">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Mission acceptée</p>
                <p className="text-xs text-muted-foreground">Yassine · Fès · 1200 MAD</p>
              </div>
            </div>
          </div>

          <div className="absolute -right-4 top-10 hidden w-56 rounded-2xl border border-border bg-card/95 p-4 shadow-[var(--shadow-lg)] backdrop-blur md:block">
            <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
              <Star className="h-4 w-4 fill-warning text-warning" />
              4.9 / 5
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              "Travail rapide et professionnel, je recommande !"
            </p>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="container-page py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-glow">Catégories</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-foreground md:text-4xl">
              Explorez par domaine
            </h2>
          </div>
          <Link to="/services" className="hidden text-sm font-semibold text-foreground hover:text-primary-glow md:inline-flex">
            Voir tout →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to="/services"
              search={{ categoryId: cat.id }}
              className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary-glow/40 hover:shadow-[var(--shadow-md)]"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--gradient-accent)] font-display text-base font-bold text-primary-foreground">
                {cat.name.charAt(0)}
              </div>
              <p className="mt-4 font-display text-base font-semibold text-foreground">{cat.name}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="container-page py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-glow">Services en vedette</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-foreground md:text-4xl">
              Les meilleures offres locales
            </h2>
          </div>
          <Link to="/services" className="hidden text-sm font-semibold text-foreground hover:text-primary-glow md:inline-flex">
            Voir tout →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="container-page py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-glow">Comment ça marche</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-foreground md:text-4xl">
            Trois étapes simples
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { step: "01", title: "Recherchez", desc: "Trouvez le freelance idéal selon votre ville, votre budget et vos besoins." },
            { step: "02", title: "Discutez", desc: "Échangez via la messagerie intégrée pour préciser votre projet." },
            { step: "03", title: "Évaluez", desc: "Une fois la mission terminée, laissez votre avis pour aider la communauté." },
          ].map((s) => (
            <div key={s.step} className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-sm)]">
              <span className="font-display text-sm font-bold text-primary-glow">{s.step}</span>
              <h3 className="mt-3 font-display text-xl font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TOP FREELANCERS */}
      <section id="freelancers" className="container-page py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-glow">Freelances</p>
            <h2 className="mt-1 font-display text-3xl font-bold text-foreground md:text-4xl">
              Talents les mieux notés
            </h2>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {freelancers.map((f) => (
            <FreelancerCard key={f.id} freelancer={f} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-20">
        <div className="relative overflow-hidden rounded-3xl bg-[var(--gradient-hero)] p-10 text-primary-foreground shadow-[var(--shadow-lg)] md:p-16">
          <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_70%_20%,white,transparent_60%)]" />
          <div className="relative grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight md:text-4xl">
                Vous êtes freelance ? <br /> Faites grandir votre clientèle locale.
              </h2>
              <p className="mt-3 max-w-md text-sm opacity-90 md:text-base">
                Créez votre profil gratuitement, publiez vos services et recevez des demandes près de chez vous.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-background px-6 py-3 font-display text-base font-semibold text-foreground shadow-[var(--shadow-md)] transition hover:-translate-y-0.5">
                Devenir freelance
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs opacity-80">Inscription gratuite · sans commission cachée</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
