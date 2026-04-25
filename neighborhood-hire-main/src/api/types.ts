// API types — alignés sur le modèle Spring Boot du cahier de conception

export type Role = "CLIENT" | "FREELANCER" | "ADMIN";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  city?: string;
  phone?: string;
  profilePicture?: string;
  status?: "ACTIVE" | "SUSPENDED";
  createdAt?: string;
}

export interface FreelancerProfile {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  city: string;
  profilePicture?: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  experienceYears: number;
  portfolioUrl?: string;
  averageRating: number;
  totalReviews: number;
  availabilityStatus: "AVAILABLE" | "BUSY" | "UNAVAILABLE";
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

export interface ServiceImage {
  id: number;
  imageUrl: string;
}

export interface Service {
  id: number;
  freelancerId: number;
  freelancer?: Pick<
    FreelancerProfile,
    "id" | "firstName" | "lastName" | "city" | "profilePicture" | "averageRating" | "totalReviews"
  >;
  categoryId: number;
  category?: Category;
  title: string;
  description: string;
  price: number;
  deliveryTime: number; // jours
  city: string;
  isActive: boolean;
  images?: ServiceImage[];
  createdAt?: string;
}

export interface SearchServicesParams {
  q?: string;
  city?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "recent";
  page?: number;
  size?: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
