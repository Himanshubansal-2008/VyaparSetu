import apiClient, { setClientBusinessId } from './apiClient';
import { API_CONFIG } from '../config/api';

/**
 * Creates a new business profile in the PostgreSQL database via backend API.
 * 
 * @param {Object} businessData
 * @param {string} businessData.name - Business Name
 * @param {string} [businessData.ownerId] - User UUID (if omitted, apiClient sends x-user-id header)
 * @param {string} [businessData.description]
 * @param {string} [businessData.category]
 * @param {string} [businessData.address]
 * @param {string} [businessData.city]
 * @param {string} [businessData.state]
 * @param {string} [businessData.pincode]
 * @param {string} [businessData.phone]
 * @param {string} [businessData.email]
 * @returns {Promise<Object>} Created business record
 */
export const createBusiness = async (businessData) => {
  const payload = {
    name: businessData.name || businessData.businessName,
    description: businessData.description,
    category: businessData.category,
    address: businessData.address || businessData.streetAddress,
    city: businessData.city,
    state: businessData.state,
    pincode: businessData.pincode,
    phone: businessData.phone || businessData.contactNumber,
    email: businessData.email,
    ownerId: businessData.ownerId,
  };

  const response = await apiClient.post(API_CONFIG.ENDPOINTS.BUSINESSES, payload);
  const data = response?.data || response;

  if (data && data.id) {
    setClientBusinessId(data.id);
  }

  return data;
};

/**
 * Updates an existing business profile in PostgreSQL.
 * 
 * @param {string} id - Business UUID
 * @param {Object} updateData - Updated business fields
 * @returns {Promise<Object>} Updated business record
 */
export const updateBusiness = async (id, updateData) => {
  const payload = {
    name: updateData.name !== undefined ? updateData.name : updateData.businessName,
    description: updateData.description,
    category: updateData.category,
    address: updateData.address !== undefined ? updateData.address : updateData.streetAddress,
    city: updateData.city,
    state: updateData.state,
    pincode: updateData.pincode,
    phone: updateData.phone !== undefined ? updateData.phone : updateData.contactNumber,
    email: updateData.email,
  };

  const cleanId = String(id).trim();
  const response = await apiClient.put(
    `${API_CONFIG.ENDPOINTS.BUSINESSES}/${encodeURIComponent(cleanId)}`,
    payload
  );
  const data = response?.data || response;

  if (data && data.id) {
    setClientBusinessId(data.id);
  }

  return data;
};

/**
 * Fetches the currently active seller's business profile from PostgreSQL.
 * Uses x-user-id header set in apiClient.
 * 
 * @returns {Promise<Object|null>}
 */
export const getMyBusiness = async () => {
  try {
    const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.BUSINESSES}/me`);
    const data = response?.data || response;
    if (data && data.id) {
      setClientBusinessId(data.id);
      return data;
    }
    return null;
  } catch (error) {
    if (error?.statusCode === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Fetches public details of any verified business by its UUID.
 * 
 * @param {string} id - Business UUID
 * @returns {Promise<Object|null>}
 */
export const getBusinessById = async (id) => {
  const cleanId = String(id).trim();
  const response = await apiClient.get(
    `${API_CONFIG.ENDPOINTS.BUSINESSES}/${encodeURIComponent(cleanId)}`
  );
  return response?.data || response;
};

const businessService = {
  createBusiness,
  updateBusiness,
  getMyBusiness,
  getBusinessById,
};

export default businessService;

