import apiClient, { ApiError } from './apiClient.js';
import { API_CONFIG } from '../config/api.js';

/**
 * Fetch all active categories from the backend.
 * Endpoint: GET /api/categories
 *
 * @param {Object} [options] - Additional request options
 * @returns {Promise<Array<Object>>} Array of category objects, enhanced with .data, .success, .message
 */
export const getCategories = async (options = {}) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.CATEGORIES, options);

  const rawList = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
    ? response
    : [];

  // Enhance the array with metadata so callers can access it directly as an Array
  // or destructure { data, success, message }
  const categories = [...rawList];
  categories.success = response?.success ?? true;
  categories.message = response?.message || 'Categories fetched successfully';
  categories.data = rawList;

  return categories;
};

/**
 * Fetch a single active category by its UUID.
 * Endpoint: GET /api/categories/:id
 *
 * @param {string} id - Category UUID
 * @param {Object} [options] - Additional request options
 * @returns {Promise<Object>} Category object with metadata
 */
export const getCategoryById = async (id, options = {}) => {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new ApiError('Category ID is required', 400);
  }

  const cleanId = id.trim();
  const response = await apiClient.get(
    `${API_CONFIG.ENDPOINTS.CATEGORIES}/${encodeURIComponent(cleanId)}`,
    options
  );

  const categoryData = response?.data || {};
  return {
    ...categoryData,
    success: response?.success ?? true,
    message: response?.message || 'Category fetched successfully',
    data: categoryData,
  };
};

export const SEED_CATEGORY_MAP = {
  'clothing': 'e3e5b3c7-b7d0-423d-b876-f9bc53cdcbaa',
  'clothing & textiles': 'e3e5b3c7-b7d0-423d-b876-f9bc53cdcbaa',
  'clothing and textiles': 'e3e5b3c7-b7d0-423d-b876-f9bc53cdcbaa',
  'textiles': 'e3e5b3c7-b7d0-423d-b876-f9bc53cdcbaa',
  'electronics': '815ef527-5348-4c5f-9b1e-5d1695eb6535',
  'food': '701769aa-8dfd-43f5-9f28-0d7ba507a6a0',
  'food & beverages': '701769aa-8dfd-43f5-9f28-0d7ba507a6a0',
  'food and beverages': '701769aa-8dfd-43f5-9f28-0d7ba507a6a0',
  'food products': '701769aa-8dfd-43f5-9f28-0d7ba507a6a0',
  'furniture': '369c30f6-096d-4ffc-81b8-04a1d5fd8cb6',
  'furniture and home decor': '369c30f6-096d-4ffc-81b8-04a1d5fd8cb6',
  'home & kitchen': '53a2d5f1-baaa-4928-ab5c-75639a452c50',
  'home and kitchen': '53a2d5f1-baaa-4928-ab5c-75639a452c50',
  'home decor': '53a2d5f1-baaa-4928-ab5c-75639a452c50',
  'home-decor': '53a2d5f1-baaa-4928-ab5c-75639a452c50',
  'handicrafts': '53a2d5f1-baaa-4928-ab5c-75639a452c50',
  'handicrafts and home decor': '53a2d5f1-baaa-4928-ab5c-75639a452c50',
  'beauty': 'bd2bf295-1dea-4313-9258-458ec8f6f695',
  'beauty & personal care': 'bd2bf295-1dea-4313-9258-458ec8f6f695',
  'beauty and personal care': 'bd2bf295-1dea-4313-9258-458ec8f6f695',
  'industrial': 'f1fa7760-4440-4762-a279-4d0617ff4fb8',
  'industrial supplies': 'f1fa7760-4440-4762-a279-4d0617ff4fb8',
  'manufacturing': 'f1fa7760-4440-4762-a279-4d0617ff4fb8',
  'agriculture': '95b0e5dd-1d31-43ae-9823-6edef7eeaf91',
  'agriculture and farm products': '95b0e5dd-1d31-43ae-9823-6edef7eeaf91',
  'farm products': '95b0e5dd-1d31-43ae-9823-6edef7eeaf91',
  'stationery': '546a91f2-44f1-4800-a5b7-c9bc2ce32794',
  'stationery & office supplies': '546a91f2-44f1-4800-a5b7-c9bc2ce32794',
  'stationery and office supplies': '546a91f2-44f1-4800-a5b7-c9bc2ce32794',
  'packaging': '88aa2939-dd83-4335-a0ff-d817aeb2007c',
  'packaging materials': '88aa2939-dd83-4335-a0ff-d817aeb2007c',
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolves a category name, slug, or ID to a valid PostgreSQL Category UUID.
 *
 * @param {string} input - Category name, slug, or ID
 * @param {Array} [fetchedCategories] - Array of categories from GET /api/categories
 * @returns {string} Category UUID
 */
export const resolveCategoryUUID = (input, fetchedCategories = []) => {
  if (!input) return SEED_CATEGORY_MAP['clothing'];
  const cleanInput = String(input).trim();

  // If already a UUID, return as-is
  if (UUID_REGEX.test(cleanInput)) {
    return cleanInput;
  }

  const norm = cleanInput.toLowerCase();

  // 1. Check fetched categories from API
  if (Array.isArray(fetchedCategories) && fetchedCategories.length > 0) {
    const exact = fetchedCategories.find(
      (c) => c && c.name && c.name.toLowerCase() === norm
    );
    if (exact && exact.id && UUID_REGEX.test(exact.id)) {
      return exact.id;
    }

    const partial = fetchedCategories.find((c) => {
      if (!c || !c.name) return false;
      const cNorm = c.name.toLowerCase();
      return cNorm.includes(norm) || norm.includes(cNorm);
    });
    if (partial && partial.id && UUID_REGEX.test(partial.id)) {
      return partial.id;
    }
  }

  // 2. Check Seed Map
  if (SEED_CATEGORY_MAP[norm]) {
    return SEED_CATEGORY_MAP[norm];
  }

  // Check substring in Seed Map keys
  for (const [key, uuid] of Object.entries(SEED_CATEGORY_MAP)) {
    if (norm.includes(key) || key.includes(norm)) {
      return uuid;
    }
  }

  // 3. Fallback to first available category from API, or default clothing
  if (
    Array.isArray(fetchedCategories) &&
    fetchedCategories.length > 0 &&
    fetchedCategories[0]?.id &&
    UUID_REGEX.test(fetchedCategories[0].id)
  ) {
    return fetchedCategories[0].id;
  }

  return SEED_CATEGORY_MAP['clothing'];
};

const categoryService = {
  getCategories,
  getCategoryById,
  resolveCategoryUUID,
  SEED_CATEGORY_MAP,
};

export default categoryService;

