import apiClient, { ApiError } from './apiClient.js';
import { API_CONFIG } from '../config/api.js';

export const LEGACY_PRODUCT_MAP = {
  'prod-001': 'c1000000-0000-4000-8000-000000000001',
  'prod-002': 'c1000000-0000-4000-8000-000000000002',
  'prod-003': 'c1000000-0000-4000-8000-000000000003',
  'prod-004': 'c1000000-0000-4000-8000-000000000004',
  'prod-005': 'c1000000-0000-4000-8000-000000000005',
  'prod-006': 'c1000000-0000-4000-8000-000000000006',
  'prod-007': 'c1000000-0000-4000-8000-000000000007',
  'prod-008': 'c1000000-0000-4000-8000-000000000008',
  'prod-009': 'c1000000-0000-4000-8000-000000000009',
  'prod-010': 'c1000000-0000-4000-8000-000000000010',
};

export const resolveProductId = (id) => {
  if (!id || typeof id !== 'string') return id;
  const clean = id.trim().toLowerCase();
  return LEGACY_PRODUCT_MAP[clean] || id.trim();
};

/**
 * Cart Backend Service for VyaparSetu
 * Handles server-side cart operations and PostgreSQL persistence.
 */

/**
 * Fetches the active user's cart from PostgreSQL via backend API.
 * 
 * @param {Object} [options]
 * @returns {Promise<Object>} Cart data with items and trusted recalculated totals
 */
export const fetchBackendCart = async (options = {}) => {
  const response = await apiClient.get(API_CONFIG.ENDPOINTS.CART, options);
  return response?.data || response;
};

/**
 * Adds an item to the user's cart on the backend.
 * 
 * @param {string} productId
 * @param {number} quantity
 * @param {Object} [options]
 * @returns {Promise<Object>} Updated cart data
 */
export const addBackendCartItem = async (productId, quantity, options = {}) => {
  if (!productId) {
    throw new Error('Product ID is required to add item to cart.');
  }

  const cleanProductId = resolveProductId(productId);
  const payload = {
    productId: cleanProductId,
    quantity: Math.max(1, Number(quantity) || 1),
    ...(options.replace !== undefined ? { replace: Boolean(options.replace) } : {}),
  };

  const response = await apiClient.post(API_CONFIG.ENDPOINTS.CART_ITEMS, payload, options);
  return response?.data || response;
};

/**
 * Updates the quantity of an item in the cart on the backend.
 * 
 * @param {string} productId
 * @param {number} quantity
 * @param {Object} [options]
 * @returns {Promise<Object>} Updated cart data
 */
export const updateBackendCartQuantity = async (productId, quantity, options = {}) => {
  if (!productId) {
    throw new Error('Product ID is required to update cart quantity.');
  }

  const cleanProductId = resolveProductId(productId);
  const payload = {
    quantity: Number(quantity),
  };

  const response = await apiClient.put(
    `${API_CONFIG.ENDPOINTS.CART_ITEMS}/${encodeURIComponent(cleanProductId)}`,
    payload,
    options
  );
  return response?.data || response;
};

/**
 * Removes an item from the user's cart on the backend.
 * 
 * @param {string} productId
 * @param {Object} [options]
 * @returns {Promise<Object>} Updated cart data
 */
export const removeBackendCartItem = async (productId, options = {}) => {
  if (!productId) {
    throw new Error('Product ID is required to remove item from cart.');
  }

  const cleanProductId = resolveProductId(productId);
  const response = await apiClient.delete(
    `${API_CONFIG.ENDPOINTS.CART_ITEMS}/${encodeURIComponent(cleanProductId)}`,
    options
  );
  return response?.data || response;
};

/**
 * Clears all items from the user's cart on the backend.
 * 
 * @param {Object} [options]
 * @returns {Promise<Object>} Empty cart data
 */
export const clearBackendCart = async (options = {}) => {
  const response = await apiClient.delete(API_CONFIG.ENDPOINTS.CART, options);
  return response?.data || response;
};

/**
 * Migrates local AsyncStorage cart items to PostgreSQL.
 * 
 * @param {Array<Object>} items - Array of local cart items ({ productId, quantity })
 * @param {Object} [options]
 * @returns {Promise<Object>} Migration response and reconciled cart
 */
export const migrateBackendCart = async (items = [], options = {}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, migratedCount: 0, skippedCount: 0 };
  }

  const sanitizedItems = items
    .map((item) => ({
      productId: item.productId || item.product?.id || item.id,
      quantity: Math.max(1, Number(item.quantity) || 1),
    }))
    .filter((i) => Boolean(i.productId));

  if (sanitizedItems.length === 0) {
    return { success: true, migratedCount: 0, skippedCount: 0 };
  }

  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.CART_MIGRATE,
    { items: sanitizedItems },
    options
  );
  return response?.data || response;
};

/**
 * Pre-flight validation for adding item to cart.
 * 
 * @param {string} productId
 * @param {number} [quantity=1]
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export const validateCartItem = async (productId, quantity = 1, options = {}) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.CART_VALIDATE,
    { productId, quantity },
    options
  );
  return response?.data || response;
};

const cartService = {
  fetchBackendCart,
  addBackendCartItem,
  updateBackendCartQuantity,
  removeBackendCartItem,
  clearBackendCart,
  migrateBackendCart,
  validateCartItem,
};

export default cartService;

