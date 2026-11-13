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
 * Fetches the current buyer's order history from the backend.
 *
 * @param {Object} filters - Optional query filters (status, etc.)
 * @returns {Promise<Array>} List of orders
 */
export const fetchBuyerOrders = async (filters = {}, options = {}) => {
  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.ORDERS || '/orders',
    {
      ...options,
      params: filters,
    }
  );
  return response?.data || response;
};

/**
 * Fetches order details by ID from the backend.
 *
 * @param {string} orderId - Order UUID or orderNumber
 * @returns {Promise<Object>} Order details
 */
export const fetchOrderDetails = async (orderId, options = {}) => {
  const response = await apiClient.get(
    `${API_CONFIG.ENDPOINTS.ORDERS || '/orders'}/${orderId}`,
    options
  );
  return response?.data || response;
};

/**
 * Fetches incoming wholesale orders for the active seller.
 *
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} List of seller orders
 */
export const fetchSellerOrders = async (filters = {}, options = {}) => {
  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.SELLER_ORDERS || '/seller/orders',
    {
      ...options,
      params: filters,
    }
  );
  return response?.data || response;
};

/**
 * Updates order status (Confirmed -> Processing -> Dispatched -> Out for Delivery -> Delivered / Cancelled / Rejected).
 *
 * @param {string} orderId - Order UUID
 * @param {Object} payload - Status and tracking/reason details
 * @returns {Promise<Object>} Updated order data
 */
export const updateOrderStatus = async (orderId, payload, options = {}) => {
  const response = await apiClient.put(
    `${API_CONFIG.ENDPOINTS.ORDERS || '/orders'}/${orderId}/status`,
    payload,
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
  fetchBuyerOrders,
  fetchOrderDetails,
  fetchSellerOrders,
  updateOrderStatus,
  validateCartProduct,
};

export default orderService;
