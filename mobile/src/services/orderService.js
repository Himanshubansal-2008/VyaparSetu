import apiClient, { ApiError } from './apiClient.js';
import { API_CONFIG } from '../config/api.js';

/**
 * Validates and places an order on the backend with strict ownership verification.
 *
 * @param {Object} orderPayload - Order details including items, address, paymentMethod
 * @returns {Promise<Object>} Created order data
 */
export const createOrder = async (orderPayload, options = {}) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.ORDERS || '/orders',
    orderPayload,
    options
  );
  return response?.data || response;
};

/**
 * Pre-flight validates order items against the backend to verify that no items
 * belong to the requesting user's business.
 *
 * @param {Array} items - Order items
 * @returns {Promise<Object>} Validation result
 */
export const validateOrder = async (items, options = {}) => {
  const response = await apiClient.post(
    `${API_CONFIG.ENDPOINTS.ORDERS || '/orders'}/validate`,
    { items },
    options
  );
  return response?.data || response;
};

/**
 * Validates whether a specific product can be added to the user's wholesale cart.
 *
 * @param {string} productId - Product UUID
 * @returns {Promise<Object>} Validation result
 */
export const validateCartProduct = async (productId, options = {}) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.CART_VALIDATE || '/cart/validate',
    { productId },
    options
  );
  return response?.data || response;
};

const orderService = {
  createOrder,
  validateOrder,
  validateCartProduct,
};

export default orderService;

