import { apiClient, isApiError } from "./client";
import { MOCK_CATEGORIES, MOCK_FREELANCERS, MOCK_SERVICES } from "./mock";
import type { Category, FreelancerProfile, Page, SearchServicesParams, Service } from "./types";

/**
 * Couche d'accès à l'API Spring Boot.
 * Si l'API n'est pas joignable (dev sans backend), on retombe sur les données mockées
 * pour que la démo et la soutenance fonctionnent toujours.
 */

async function withFallback<T>(call: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (isApiError(err)) {
      // Backend non démarré ou route absente → fallback démo
      console.warn("[API] fallback mock —", err.message);
      return fallback;
    }
    throw err;
  }
}

// Categories
export async function fetchCategories(): Promise<Category[]> {
  return withFallback(async () => {
    const { data } = await apiClient.get<Category[]>("/categories");
    return data;
  }, MOCK_CATEGORIES);
}

// Services
export async function searchServices(params: SearchServicesParams = {}): Promise<Service[]> {
  return withFallback(
    async () => {
      const { data } = await apiClient.get<Service[] | Page<Service>>("/services", { params });
      return Array.isArray(data) ? data : data.content;
    },
    filterMockServices(params),
  );
}

export async function fetchServiceById(id: number): Promise<Service | undefined> {
  return withFallback(
    async () => {
      const { data } = await apiClient.get<Service>(`/services/${id}`);
      return data;
    },
    MOCK_SERVICES.find((s) => s.id === id),
  );
}

// Freelancers
export async function fetchFreelancerById(id: number): Promise<FreelancerProfile | undefined> {
  return withFallback(
    async () => {
      const { data } = await apiClient.get<FreelancerProfile>(`/freelancers/${id}`);
      return data;
    },
    MOCK_FREELANCERS.find((f) => f.id === id),
  );
}

export async function fetchTopFreelancers(): Promise<FreelancerProfile[]> {
  return withFallback(
    async () => {
      const { data } = await apiClient.get<FreelancerProfile[]>("/freelancers", {
        params: { sort: "rating", size: 6 },
      });
      return data;
    },
    [...MOCK_FREELANCERS].sort((a, b) => b.averageRating - a.averageRating).slice(0, 6),
  );
}

// --- helpers pour le fallback de recherche ---
function filterMockServices(params: SearchServicesParams): Service[] {
  let list = [...MOCK_SERVICES];
  if (params.q) {
    const q = params.q.toLowerCase();
    list = list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category?.name.toLowerCase().includes(q),
    );
  }
  if (params.city) list = list.filter((s) => s.city.toLowerCase() === params.city!.toLowerCase());
  if (params.categoryId) list = list.filter((s) => s.categoryId === params.categoryId);
  if (params.minPrice != null) list = list.filter((s) => s.price >= params.minPrice!);
  if (params.maxPrice != null) list = list.filter((s) => s.price <= params.maxPrice!);
  if (params.minRating != null)
    list = list.filter((s) => (s.freelancer?.averageRating ?? 0) >= params.minRating!);

  switch (params.sort) {
    case "price_asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      list.sort((a, b) => (b.freelancer?.averageRating ?? 0) - (a.freelancer?.averageRating ?? 0));
      break;
  }
  return list;
}
