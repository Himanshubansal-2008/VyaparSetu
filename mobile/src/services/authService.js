import apiClient, { ApiError } from './apiClient.js';
import { API_CONFIG } from '../config/api.js';

/**
 * Registers a new user account.
 * Endpoint: POST /api/auth/signup
 *
 * @param {Object} payload
 * @param {string} payload.name
 * @param {string} payload.email
 * @param {string} [payload.phone]
 * @param {string} payload.password
 * @param {string} payload.confirmPassword
 * @param {Object} [options] - Additional request options
 * @returns {Promise<{ success: boolean, message: string, user: Object, data: Object }>}
 */
export const signupUser = async (payload, options = {}) => {
  const requestBody = {
    name: payload?.name,
    email: payload?.email,
    password: payload?.password,
    confirmPassword: payload?.confirmPassword,
  };

  if (payload?.phone !== undefined && payload?.phone !== null && payload?.phone !== '') {
    requestBody.phone = payload.phone;
  }

  const endpoint = API_CONFIG.ENDPOINTS.AUTH_SIGNUP || '/auth/signup';
  const response = await apiClient.post(endpoint, requestBody, options);

  return {
    success: response?.success ?? true,
    message: response?.message || 'Account created successfully',
    user: response?.data?.user || null,
    data: response?.data || {},
  };
};

/**
 * Authenticates user credentials and retrieves signed JWT.
 * Endpoint: POST /api/auth/login
 *
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @param {Object} [options] - Additional request options
 * @returns {Promise<{ success: boolean, message: string, token: string, user: Object, data: Object }>}
 */
export const loginUser = async (credentials, options = {}) => {
  const requestBody = {
    email: credentials?.email ? String(credentials.email).trim().toLowerCase() : '',
    password: credentials?.password || '',
  };

  const endpoint = API_CONFIG.ENDPOINTS.AUTH_LOGIN || '/auth/login';
  const response = await apiClient.post(endpoint, requestBody, options);

  return {
    success: response?.success ?? true,
    message: response?.message || 'Login successful',
    token: response?.data?.token || '',
    user: response?.data?.user || null,
    data: response?.data || {},
  };
};

export default {
  signupUser,
  loginUser,
};

