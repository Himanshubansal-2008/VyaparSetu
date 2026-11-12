import apiClient, { ApiError } from './apiClient.js';
import { API_CONFIG } from '../config/api.js';

/**
 * Sanitizes and normalizes query parameters for the product listing API.
 * - Trims search strings and omits whitespace-only values.
 * - Automatically handles 'all' category selection by omitting categoryId.
 * - Normalizes sort directions and numeric pagination values.
 *
 * @param {Object} [params] - Query parameters
 * @returns {Object} Cleaned parameter object
 */
export const sanitizeProductParams = (params = {}) => {
  if (!params || typeof params !== 'object') return {};

  const sanitized = {};

  // Search query: trim whitespace; omit empty
  if (params.search !== undefined && params.search !== null) {
    const trimmed = String(params.search).trim();
    if (trimmed) {
      sanitized.search = trimmed;
    }
  }

  // Category filter: omit if 'all' or empty
  const rawCategory = params.categoryId !== undefined ? params.categoryId : params.category;
  if (rawCategory !== undefined && rawCategory !== null) {
    const trimmedCategory = String(rawCategory).trim();
    if (trimmedCategory && trimmedCategory.toLowerCase() !== 'all') {
      sanitized.categoryId = trimmedCategory;
    }
  }

  // Sort by field (e.g., 'price')
  if (params.sortBy !== undefined && params.sortBy !== null) {
    const trimmedSortBy = String(params.sortBy).trim();
    if (trimmedSortBy) {
      sanitized.sortBy = trimmedSortBy;
    }
  }

  // Sort order ('asc' | 'desc')
  if (params.sortOrder !== undefined && params.sortOrder !== null) {
    const trimmedSortOrder = String(params.sortOrder).trim().toLowerCase();
    if (trimmedSortOrder) {
      sanitized.sortOrder = trimmedSortOrder;
    }
  }

  // Pagination page
  if (params.page !== undefined && params.page !== null && params.page !== '') {
    sanitized.page = params.page;
  }

  // Pagination limit
  if (params.limit !== undefined && params.limit !== null && params.limit !== '') {
    sanitized.limit = params.limit;
  }

  // Preserve isFeatured if explicitly provided
  if (params.isFeatured !== undefined && params.isFeatured !== null) {
    sanitized.isFeatured = params.isFeatured;
  }

  return sanitized;
};

/**
 * Fetch products from the backend with optional search, category, sorting, and pagination.
 * Endpoint: GET /api/products
 *
 * @param {Object} [params] - Optional query parameters
 * @param {string} [params.search] - Case-insensitive partial name search (max 100 chars)
 * @param {string} [params.categoryId] - Category UUID filter (or 'all' for all categories)
 * @param {string} [params.sortBy] - Field to sort by ('price')
 * @param {'asc'|'desc'} [params.sortOrder] - Sort direction ('asc' or 'desc')
 * @param {number} [params.page=1] - Current page
 * @param {number} [params.limit=10] - Number of items per page
 * @param {Object} [options] - Additional request options (headers, timeout, signal, baseUrl)
 * @returns {Promise<{ products: Array, pagination: Object, success: boolean, message: string, data: Object }>}
 */
export const getProducts = async (params = {}, options = {}) => {
  const queryParams = sanitizeProductParams(params);
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS, {
    params: queryParams,
    ...options,
  });

  const data = response?.data || {};
  return {
    products: Array.isArray(data.products) ? data.products : [],
    pagination: data.pagination || {
      total: 0,
      page: Number(queryParams.page) || 1,
      limit: Number(queryParams.limit) || 10,
      totalPages: 0,
    },
    success: response?.success ?? true,
    message: response?.message || 'Products fetched successfully',
    data,
  };
};

/**
 * Fetch active featured products from the backend with optional pagination.
 * Endpoint: GET /api/products/featured
 *
 * @param {Object} [params] - Pagination options
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=10] - Items per page (max 50)
 * @param {Object} [options] - Additional request options
 * @returns {Promise<{ products: Array, pagination: Object, success: boolean, message: string, data: Object }>}
 */
export const getFeaturedProducts = async (params = {}, options = {}) => {
  const queryParams = {};
  if (params?.page !== undefined && params?.page !== null && params?.page !== '') {
    queryParams.page = params.page;
  }
  if (params?.limit !== undefined && params?.limit !== null && params?.limit !== '') {
    queryParams.limit = params.limit;
  }

  const response = await apiClient.get(API_CONFIG.ENDPOINTS.FEATURED_PRODUCTS, {
    params: queryParams,
    ...options,
  });

  const data = response?.data || {};
  return {
    products: Array.isArray(data.products) ? data.products : [],
    pagination: data.pagination || {
      total: 0,
      totalProducts: 0,
      page: Number(queryParams.page) || 1,
      limit: Number(queryParams.limit) || 10,
      totalPages: 0,
    },
    success: response?.success ?? true,
    message: response?.message || 'Featured products fetched successfully',
    data,
  };
};

/**
 * Fetch a single product's detailed information by its UUID.
 * Endpoint: GET /api/products/:id
 *
 * @param {string} id - Product UUID
 * @param {Object} [options] - Additional request options
 * @returns {Promise<Object>} Detailed product data
 */
export const getProductById = async (id, options = {}) => {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new ApiError('Product ID is required', 400);
  }

  const cleanId = id.trim();
  const response = await apiClient.get(
    `${API_CONFIG.ENDPOINTS.PRODUCTS}/${encodeURIComponent(cleanId)}`,
    options
  );

  const productData = response?.data || {};
  return {
    ...productData,
    success: response?.success ?? true,
    message: response?.message || 'Product fetched successfully',
    data: productData,
  };
};

const productService = {
  getProducts,
  getFeaturedProducts,
  getProductById,
  sanitizeProductParams,
};

export default productService;

