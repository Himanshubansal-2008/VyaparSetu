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

const categoryService = {
  getCategories,
  getCategoryById,
};

export default categoryService;

