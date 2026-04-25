import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { fetchCategories, searchServices } from "@/api/marketplace";
import { MOROCCAN_CITIES } from "@/api/mock";
import type { Category, SearchServicesParams, Service } from "@/api/types";
import { ServiceCard } from "@/components/service-card";

interface ServicesSearch {
  q?: string;
  city?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: SearchServicesParams["sort"];
}

export const Route = createFileRoute("/services")({
  validateSearch: (search: Record<string, unknown>): ServicesSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    city: typeof search.city === "string" ? search.city : undefined,
    categoryId: search.categoryId != null ? Number(search.categoryId) : undefined,
    minPrice: search.minPrice != null ? Number(search.minPrice) : undefined,
    maxPrice: search.maxPrice != null ? Number(search.maxPrice) : undefined,
    sort: (search.sort as ServicesSearch["sort"]) ?? "relevance",
  }),
  head: () => ({
    meta: [
      { title: "Trouver un service freelance local — ProxiSkills" },
      {
        name: "description",
        content:
          "Recherchez et filtrez des freelances locaux par ville, catégorie, prix et note. Trouvez le bon prestataire près de chez vous.",
      },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    void fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    void searchServices(search).then((s) => {
      setServices(s);
      setLoading(false);
    });
  }, [search]);

  const update = (patch: Partial<ServicesSearch>) =>
    navigate({ search: (prev: ServicesSearch) => ({ ...prev, ...patch }) });

  const activeFiltersCount = useMemo(
    () =>
      [search.city, search.categoryId, search.minPrice, search.maxPrice].filter((v) => v != null && v !== "")
        .length,
    [search],
  );

  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          ← Accueil
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
          Trouver un service freelance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Recherche…" : `${services.length} résultat${services.length > 1 ? "s" : ""}`}
          {search.city && ` à ${search.city}`}
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-sm)] sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-surface px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            defaultValue={search.q ?? ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
            placeholder="Mot-clé (logo, site, photo…)"
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          />
        </div>
        <select
          value={search.sort ?? "relevance"}
          onChange={(e) => update({ sort: e.target.value as ServicesSearch["sort"] })}
          className="rounded-xl bg-surface px-3 py-2.5 text-sm outline-none"
        >
          <option value="relevance">Tri : Pertinence</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
          <option value="rating">Mieux notés</option>
        </select>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground lg:hidden"
        >
          <Filter className="h-4 w-4" />
          Filtres {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside
          className={`${showFilters ? "block" : "hidden"} h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] lg:block`}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-base font-semibold text-foreground">Filtres</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={() =>
                  update({ city: undefined, categoryId: undefined, minPrice: undefined, maxPrice: undefined })
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Effacer
              </button>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ville
              </label>
              <select
                value={search.city ?? ""}
                onChange={(e) => update({ city: e.target.value || undefined })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-glow"
              >
                <option value="">Toutes les villes</option>
                {MOROCCAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Catégorie
              </label>
              <select
                value={search.categoryId ?? ""}
                onChange={(e) => update({ categoryId: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-glow"
              >
                <option value="">Toutes</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Prix (MAD)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  defaultValue={search.minPrice ?? ""}
                  onBlur={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-glow"
                />
                <input
                  type="number"
                  placeholder="Max"
                  defaultValue={search.maxPrice ?? ""}
                  onBlur={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary-glow"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          {services.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <p className="font-display text-lg font-semibold text-foreground">Aucun résultat</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Essayez d'élargir votre recherche ou de modifier les filtres.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
