
const API_BASE_URL = "http://localhost:5050/api";

export const getCategories = async () => {
  const response = await fetch("http://localhost:5050/api/categories");
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch categories");
  }

  return result.data;
};

export const getBusinesses = async () => {
  const response = await fetch("http://localhost:5050/api/businesses");
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch businesses");
  }

  return result.data;
};

export const updateProductStock = async (productId, stock) => {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stock }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to update stock");
  }

  return result.data;
};

import apiClient, { ApiError } from './apiClient.js';
import { API_CONFIG } from '../config/api.js';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUUID = (str) => {
  return typeof str === 'string' && UUID_REGEX.test(str.trim());
};

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
const isValidHttpUrl = (str) => {
  if (typeof str !== 'string') return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

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
const getProductsFromApi = async (params = {}, options = {}) => {
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

export const getProducts = async (params, options = {}) => {
  const response = await getProductsFromApi(params || {}, options);

  // Inventory screens expect an array when no parameters are supplied.
  if (params === undefined) {
    return response.products;
  }

  // Existing screens expect products + pagination.
  return response;
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

  // If the ID is not a valid UUID (e.g. legacy seed prod-001 or prod-custom-...),
  // do not make invalid network calls that cause HTTP 400 errors
  if (!isUUID(cleanId)) {
    throw new ApiError('Invalid product ID format (legacy ID)', 400, { isLegacyId: true, id: cleanId });
  }

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

/**
 * Creates a new product on the backend in PostgreSQL.
 * Endpoint: POST /api/products
 *
 * @param {Object} productData
 * @param {Object} [options]
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData, options = {}) => {
  if (!productData || typeof productData !== 'object') {
    throw new ApiError('Product data is required', 400);
  }

  const rawImage =
    productData.imageUrl ||
    (Array.isArray(productData.images) && productData.images[0]) ||
    productData.image ||
    null;

  const validImageUrl = typeof rawImage === 'string' && isValidHttpUrl(rawImage) ? rawImage : null;

  // Format and validate bulk pricing tiers if provided
  let formattedBulkTiers = undefined;
  if (Array.isArray(productData.bulkPricing) && productData.bulkPricing.length > 0) {
    formattedBulkTiers = productData.bulkPricing
      .map((tier) => ({
        minQuantity: parseInt(tier.minQuantity, 10),
        maxQuantity:
          tier.maxQuantity !== null && tier.maxQuantity !== undefined && tier.maxQuantity !== ''
            ? parseInt(tier.maxQuantity, 10)
            : null,
        pricePerUnit: parseFloat(tier.pricePerUnit),
      }))
      .filter((t) => !isNaN(t.minQuantity) && !isNaN(t.pricePerUnit) && t.minQuantity > 0 && t.pricePerUnit > 0);
  }

  const payload = {
    name: String(productData.name || productData.productName || '').trim(),
    description: productData.description ? String(productData.description).trim() : null,
    price: parseFloat(productData.price),
    stock: parseInt(productData.stock ?? productData.availableQuantity ?? 0, 10),
    minOrderQuantity: parseInt(productData.minOrderQuantity ?? productData.moq ?? 1, 10),
    unit: String(productData.unit || 'piece').trim().toLowerCase(),
    imageUrl: validImageUrl,
    isActive: productData.isActive !== undefined ? Boolean(productData.isActive) : true,
    isFeatured: Boolean(productData.isFeatured),
    isSurplus: Boolean(productData.isSurplus),
    categoryId: String(productData.categoryId || '').trim(),
    businessId: String(productData.businessId || '').trim(),
  };

  if (formattedBulkTiers && formattedBulkTiers.length > 0) {
    payload.bulkPricing = formattedBulkTiers;
  }

  if (productData.isSurplus && productData.surplusQuantity) {
    payload.surplusQuantity = parseInt(productData.surplusQuantity, 10);
  }
  if (productData.isSurplus && productData.surplusPrice) {
    payload.surplusPrice = parseFloat(productData.surplusPrice);
  }
  if (productData.isSurplus && productData.surplusDeadline) {
    payload.surplusDeadline = new Date(productData.surplusDeadline).toISOString();
  }

  const response = await apiClient.post(API_CONFIG.ENDPOINTS.PRODUCTS, payload, options);
  const data = response?.data || response;
  return {
    ...data,
    success: response?.success ?? true,
    message: response?.message || 'Product created successfully',
    data,
  };
};

/**
 * Updates an existing product in PostgreSQL.
 * Endpoint: PUT /api/products/:id
 *
 * @param {string} id - Product UUID
 * @param {Object} updateData
 * @param {Object} [options]
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, updateData, options = {}) => {
  if (!id || typeof id !== 'string' || !isUUID(id)) {
    throw new ApiError('Valid product UUID is required for update', 400);
  }

  const cleanId = id.trim();
  const rawImage =
    updateData.imageUrl ||
    (Array.isArray(updateData.images) && updateData.images[0]) ||
    updateData.image ||
    null;

  const validImageUrl = typeof rawImage === 'string' && isValidHttpUrl(rawImage) ? rawImage : null;

  const payload = {};
  if (updateData.name !== undefined) payload.name = String(updateData.name).trim();
  if (updateData.description !== undefined) {
    payload.description = updateData.description ? String(updateData.description).trim() : null;
  }
  if (updateData.price !== undefined) payload.price = parseFloat(updateData.price);
  if (updateData.stock !== undefined) payload.stock = parseInt(updateData.stock, 10);
  if (updateData.minOrderQuantity !== undefined || updateData.moq !== undefined) {
    payload.minOrderQuantity = parseInt(updateData.minOrderQuantity ?? updateData.moq, 10);
  }
  if (updateData.unit !== undefined) payload.unit = String(updateData.unit).trim().toLowerCase();
  if (updateData.imageUrl !== undefined || rawImage !== undefined) payload.imageUrl = validImageUrl;
  if (updateData.isActive !== undefined) payload.isActive = Boolean(updateData.isActive);
  if (updateData.isFeatured !== undefined) payload.isFeatured = Boolean(updateData.isFeatured);
  if (updateData.isSurplus !== undefined) payload.isSurplus = Boolean(updateData.isSurplus);
  if (updateData.categoryId !== undefined) payload.categoryId = String(updateData.categoryId).trim();
  if (updateData.businessId !== undefined) payload.businessId = String(updateData.businessId).trim();

  if (Array.isArray(updateData.bulkPricing)) {
    payload.bulkPricing = updateData.bulkPricing
      .map((tier) => ({
        minQuantity: parseInt(tier.minQuantity, 10),
        maxQuantity:
          tier.maxQuantity !== null && tier.maxQuantity !== undefined && tier.maxQuantity !== ''
            ? parseInt(tier.maxQuantity, 10)
            : null,
        pricePerUnit: parseFloat(tier.pricePerUnit),
      }))
      .filter((t) => !isNaN(t.minQuantity) && !isNaN(t.pricePerUnit) && t.minQuantity > 0 && t.pricePerUnit > 0);
  }

  if (updateData.surplusQuantity !== undefined) payload.surplusQuantity = parseInt(updateData.surplusQuantity, 10);
  if (updateData.surplusPrice !== undefined) {
    payload.surplusPrice = updateData.surplusPrice ? parseFloat(updateData.surplusPrice) : null;
  }
  if (updateData.surplusDeadline !== undefined) {
    payload.surplusDeadline = updateData.surplusDeadline ? new Date(updateData.surplusDeadline).toISOString() : null;
  }

  const response = await apiClient.put(
    `${API_CONFIG.ENDPOINTS.PRODUCTS}/${encodeURIComponent(cleanId)}`,
    payload,
    options
  );
  const data = response?.data || response;
  return {
    ...data,
    success: response?.success ?? true,
    message: response?.message || 'Product updated successfully',
    data,
  };
};



/**
 * Soft deactivates a product in PostgreSQL.
 * Endpoint: PATCH /api/products/:id/deactivate
 */
export const deactivateProduct = async (id, options = {}) => {
  if (!id || typeof id !== 'string' || !isUUID(id)) {
    throw new ApiError('Valid product UUID is required for deactivation', 400);
  }

  const cleanId = id.trim();
  const response = await apiClient.patch(
    `${API_CONFIG.ENDPOINTS.PRODUCTS}/${encodeURIComponent(cleanId)}/deactivate`,
    {},
    options
  );
  const data = response?.data || response;
  return {
    ...data,
    success: response?.success ?? true,
    message: response?.message || 'Product deactivated successfully',
    data,
  };
};

/**
 * Deletes or soft-deactivates a product on the backend.
 * Endpoint: DELETE /api/products/:id
 */
export const deleteProduct = async (id, options = {}) => {
  if (!id || typeof id !== 'string' || !isUUID(id)) {
    throw new ApiError('Valid product UUID is required for deletion', 400);
  }

  const cleanId = id.trim();
  const response = await apiClient.delete(
    `${API_CONFIG.ENDPOINTS.PRODUCTS}/${encodeURIComponent(cleanId)}`,
    options
  );
  const data = response?.data || response;
  return {
    ...data,
    success: response?.success ?? true,
    message: response?.message || 'Product deleted successfully',
    data,
  };
};

/**
 * Fetches seller-owned products from the backend.
 * Endpoint: GET /api/seller/products
 */
export const getSellerProducts = async (params = {}, options = {}) => {
  const queryParams = sanitizeProductParams(params);
  if (params.includeInactive !== undefined) {
    queryParams.includeInactive = params.includeInactive;
  }
  if (params.isActive !== undefined) {
    queryParams.isActive = params.isActive;
  }

  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.SELLER_PRODUCTS || '/seller/products',
    {
      params: queryParams,
      ...options,
    }
  );

  const data = response?.data || {};
  return {
    products: Array.isArray(data.products) ? data.products : [],
    pagination: data.pagination || {
      total: 0,
      page: Number(queryParams.page) || 1,
      limit: Number(queryParams.limit) || 50,
      totalPages: 0,
    },
    success: response?.success ?? true,
    message: response?.message || 'Seller products fetched successfully',
    data,
  };
};

const productService = {
  getProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  deleteProduct,
  getSellerProducts,
  sanitizeProductParams,
  isUUID,
  UUID_REGEX,
};

export default productService;

