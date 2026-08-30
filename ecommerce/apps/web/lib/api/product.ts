import { apiClient } from "./client";
import type {
  CategoryItem,
  CategoryRequest,
  EnhancedProduct,
  ProductFormState,
  ProductStatus,
} from "@/types/product";

const BASE = "/api/v1/company";

export const productApi = {
  // Categories & Category Requests
  listCategories: (search?: string) =>
    apiClient<CategoryItem[]>(`${BASE}/categories${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  createCategory: (data: { name: string; slug?: string; description?: string; parent_id?: string }) =>
    apiClient<CategoryItem>(`${BASE}/categories`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createCategoryRequest: (data: { name: string; parent_id?: string; description?: string; reason?: string }) =>
    apiClient<CategoryRequest>(`${BASE}/category-requests`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listCategoryRequests: () =>
    apiClient<CategoryRequest[]>(`${BASE}/category-requests`),

  // Enhanced Product Operations
  createEnhancedProduct: (data: Partial<ProductFormState>) =>
    apiClient<EnhancedProduct>(`${BASE}/products/enhanced`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  saveProductDraft: (data: { name: string; category_id?: string; price?: number; description?: string }) =>
    apiClient<EnhancedProduct>(`${BASE}/products/draft`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getEnhancedProduct: (id: string) =>
    apiClient<EnhancedProduct>(`${BASE}/products/${id}/enhanced`),

  updateEnhancedProduct: (id: string, data: Partial<ProductFormState>) =>
    apiClient<EnhancedProduct>(`${BASE}/products/${id}/enhanced`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  publishProduct: (id: string) =>
    apiClient<EnhancedProduct>(`${BASE}/products/${id}/publish`, {
      method: "POST",
    }),

  generateSlug: (name: string) =>
    apiClient<{ slug: string }>(`${BASE}/products/generate-slug`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  generateSku: (name: string) =>
    apiClient<{ sku: string }>(`${BASE}/products/generate-sku`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  generateAIContent: (payload: {
    product_name: string;
    category_name?: string;
    attributes?: Record<string, string>;
    content_type: "description" | "seo_title" | "meta_description" | "tags" | "alt_text";
  }) =>
    apiClient<{ content_type: string; generated_text: string }>(`${BASE}/products/ai-assist`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
