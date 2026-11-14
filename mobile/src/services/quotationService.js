import apiClient, { ApiError } from './apiClient.js';
import { API_CONFIG } from '../config/api.js';

/**
 * Submits a new Buyer Quotation Request to the backend.
 *
 * @param {Object} payload - Quotation request parameters
 * @returns {Promise<Object>} Created quotation
 */
export const createQuotation = async (payload, options = {}) => {
  const response = await apiClient.post(
    API_CONFIG.ENDPOINTS.QUOTATIONS || '/quotations',
    payload,
    options
  );
  return response?.data || response;
};

/**
 * Fetches quotations submitted by the active buyer.
 *
 * @param {Object} filters - Optional query filters (e.g. status)
 * @returns {Promise<Array>} List of buyer quotations
 */
export const fetchBuyerQuotations = async (filters = {}, options = {}) => {
  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.BUYER_QUOTATIONS || '/quotations/buyer',
    {
      ...options,
      params: filters,
    }
  );
  return response?.data || response;
};

/**
 * Fetches incoming quotations for the active seller.
 *
 * @param {Object} filters - Optional query filters
 * @returns {Promise<Array>} List of seller quotations
 */
export const fetchSellerQuotations = async (filters = {}, options = {}) => {
  const response = await apiClient.get(
    API_CONFIG.ENDPOINTS.SELLER_QUOTATIONS || '/quotations/seller',
    {
      ...options,
      params: filters,
    }
  );
  return response?.data || response;
};

/**
 * Fetches full quotation details including negotiation message history.
 *
 * @param {string} quotationId - Quotation UUID
 * @returns {Promise<Object>} Quotation details
 */
export const fetchQuotationDetails = async (quotationId, options = {}) => {
  const response = await apiClient.get(
    `${API_CONFIG.ENDPOINTS.QUOTATIONS || '/quotations'}/${quotationId}`,
    options
  );
  return response?.data || response;
};

/**
 * Allows a seller to respond to an incoming quotation with quote, counter, or reject.
 *
 * @param {string} quotationId - Quotation UUID
 * @param {Object} responsePayload - Response details
 * @returns {Promise<Object>} Updated quotation
 */
export const respondToQuotation = async (quotationId, responsePayload, options = {}) => {
  const response = await apiClient.post(
    `${API_CONFIG.ENDPOINTS.QUOTATIONS || '/quotations'}/${quotationId}/respond`,
    responsePayload,
    options
  );
  return response?.data || response;
};

/**
 * Allows a buyer to submit a counter-offer to a seller's quotation.
 *
 * @param {string} quotationId - Quotation UUID
 * @param {Object} counterPayload - { counterPrice, counterQuantity, buyerNotes }
 * @returns {Promise<Object>} Updated quotation
 */
export const submitBuyerCounter = async (quotationId, counterPayload, options = {}) => {
  const response = await apiClient.post(
    `${API_CONFIG.ENDPOINTS.QUOTATIONS || '/quotations'}/${quotationId}/buyer-counter`,
    counterPayload,
    options
  );
  return response?.data || response;
};

/**
 * Allows a buyer to accept an active quotation.
 *
 * @param {string} quotationId - Quotation UUID
 * @returns {Promise<Object>} Updated quotation
 */
export const acceptQuotation = async (quotationId, options = {}) => {
  const response = await apiClient.post(
    `${API_CONFIG.ENDPOINTS.QUOTATIONS || '/quotations'}/${quotationId}/accept`,
    {},
    options
  );
  return response?.data || response;
};

/**
 * Allows a buyer to decline an active quotation.
 *
 * @param {string} quotationId - Quotation UUID
 * @param {string} reason - Rejection explanation
 * @returns {Promise<Object>} Updated quotation
 */
export const rejectQuotation = async (quotationId, reason = '', options = {}) => {
  const response = await apiClient.post(
    `${API_CONFIG.ENDPOINTS.QUOTATIONS || '/quotations'}/${quotationId}/reject`,
    { reason },
    options
  );
  return response?.data || response;
};

/**
 * Converts an accepted quotation into an order.
 *
 * @param {string} quotationId - Quotation UUID
 * @param {Object} orderPayload - Delivery address, notes, paymentMethod
 * @returns {Promise<Object>} Created order
 */
export const convertToOrder = async (quotationId, orderPayload = {}, options = {}) => {
  const response = await apiClient.post(
    `${API_CONFIG.ENDPOINTS.QUOTATIONS || '/quotations'}/${quotationId}/convert-to-order`,
    orderPayload,
    options
  );
  return response?.data || response;
};

const quotationService = {
  createQuotation,
  fetchBuyerQuotations,
  fetchSellerQuotations,
  fetchQuotationDetails,
  respondToQuotation,
  submitBuyerCounter,
  acceptQuotation,
  rejectQuotation,
  convertToOrder,
};

export default quotationService;

