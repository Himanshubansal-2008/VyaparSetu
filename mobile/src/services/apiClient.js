import { API_CONFIG } from '../config/api.js';

let currentAuthToken = null;
let unauthorizedHandler = null;
let isHandlingUnauthorized = false;

/**
 * Updates the in-memory JWT authentication token for outgoing protected requests.
 *
 * @param {string|null} token
 */
export const setAuthToken = (token) => {
  currentAuthToken = token || null;
};

/**
 * Returns the currently active in-memory authentication token.
 *
 * @returns {string|null}
 */
export const getAuthToken = () => currentAuthToken;

/**
 * Registers a global callback invoked when a protected request returns HTTP 401 Unauthorized.
 *
 * @param {Function|null} handler
 */
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

/**
 * Determines whether a given endpoint and HTTP method represent an unauthenticated public resource.
 *
 * @param {string} endpoint
 * @param {string} [method='GET']
 * @returns {boolean}
 */
export const isPublicEndpoint = (endpoint, method = 'GET') => {
  if (!endpoint || typeof endpoint !== 'string') return false;
  const upperMethod = method.toUpperCase();
  const clean = endpoint.toLowerCase().replace(/^\/+/, '').replace(/^api\//, '');

  // Auth endpoints that do not require prior authentication
  if (clean === 'auth/login' || clean === 'auth/signup' || clean === 'auth/status') {
    return true;
  }

  // Public catalog and status endpoints
  if (upperMethod === 'GET') {
    if (
      clean === 'health' ||
      clean === 'products' ||
      clean === 'products/featured' ||
      clean.startsWith('products/') ||
      clean === 'categories' ||
      clean.startsWith('categories/')
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Custom API Error class with HTTP status code and response payload
 */
export class ApiError extends Error {
  constructor(message, statusCode = 0, data = null, originalError = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
    this.originalError = originalError;
  }
}

/**
 * Builds a sanitized, fully qualified URL with query parameters.
 *
 * @param {string} baseUrl - Base API URL (e.g. "http://localhost:5050/api")
 * @param {string} endpoint - Path or endpoint (e.g. "/products" or "products")
 * @param {Object} [params] - Optional query parameters
 * @returns {string} Fully qualified URL string
 */
export const buildUrl = (baseUrl = API_CONFIG.BASE_URL, endpoint = '', params = null) => {
  let url = endpoint;

  if (!/^https?:\/\//i.test(endpoint)) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    let cleanEndpoint = endpoint.replace(/^\/+/, '');

    // Avoid duplicating '/api' when base ends with '/api' and endpoint begins with 'api/'
    if (cleanBase.endsWith('/api') && cleanEndpoint.startsWith('api/')) {
      cleanEndpoint = cleanEndpoint.substring(4);
    }

    url = `${cleanBase}/${cleanEndpoint}`;
  }

  if (params && typeof params === 'object') {
    const queryParts = [];
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
      }
    });

    if (queryParts.length > 0) {
      const delimiter = url.includes('?') ? '&' : '?';
      url = `${url}${delimiter}${queryParts.join('&')}`;
    }
  }

  return url;
};

/**
 * Core HTTP request handler using standard fetch.
 *
 * @param {string} endpoint - Request endpoint or full URL
 * @param {Object} [options] - Request configuration
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.params] - Query parameters
 * @param {any} [options.body] - Request body (objects will be JSON.stringify-ed)
 * @param {Object} [options.headers] - Custom request headers
 * @param {number} [options.timeout] - Timeout in milliseconds
 * @param {string} [options.baseUrl] - Custom base URL
 * @returns {Promise<any>} Parsed response data
 */
export const request = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    params,
    body,
    headers = {},
    timeout = API_CONFIG.TIMEOUT_MS,
    baseUrl = API_CONFIG.BASE_URL,
    ...restOptions
  } = options;

  const url = buildUrl(baseUrl, endpoint, params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const isPublic = options.isPublic ?? isPublicEndpoint(endpoint, method);

  const requestHeaders = {
    ...API_CONFIG.DEFAULT_HEADERS,
    ...headers,
  };

  // Automatically attach Bearer token to protected endpoints without manual per-request handling
  if (!isPublic && currentAuthToken && !requestHeaders.Authorization && !requestHeaders.authorization) {
    requestHeaders.Authorization = `Bearer ${currentAuthToken}`;
  }

  const fetchOptions = {
    method: method.toUpperCase(),
    headers: requestHeaders,
    signal: controller.signal,
    ...restOptions,
  };

  if (body !== undefined && body !== null) {
    if (typeof body === 'object' && !(body instanceof FormData)) {
      fetchOptions.body = JSON.stringify(body);
    } else {
      fetchOptions.body = body;
    }
  }

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    let responseData = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (err) {
        responseData = null;
      }
    } else {
      try {
        responseData = await response.text();
      } catch (err) {
        responseData = null;
      }
    }

    if (!response.ok) {
      const message =
        (responseData && typeof responseData === 'object' && responseData.message) ||
        (typeof responseData === 'string' && responseData) ||
        `HTTP Error ${response.status}: ${response.statusText}`;

      // Handle 401 Unauthorized on protected endpoints
      if (response.status === 401 && !isPublic && unauthorizedHandler) {
        if (!isHandlingUnauthorized) {
          isHandlingUnauthorized = true;
          try {
            unauthorizedHandler(new ApiError(message, 401, responseData));
          } catch (handlerErr) {
            console.error('[ApiClient] Error in unauthorizedHandler:', handlerErr);
          } finally {
            setTimeout(() => {
              isHandlingUnauthorized = false;
            }, 1000);
          }
        }
      }

      throw new ApiError(message, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeout}ms`, 408, null, error);
    }

    // Network connectivity or DNS failure
    throw new ApiError(
      error.message || 'Network request failed. Please check your internet connection.',
      0,
      null,
      error
    );
  }
};

/**
 * Convenience HTTP method wrappers
 */
export const get = (endpoint, options = {}) =>
  request(endpoint, { ...options, method: 'GET' });

export const post = (endpoint, body, options = {}) =>
  request(endpoint, { ...options, method: 'POST', body });

export const put = (endpoint, body, options = {}) =>
  request(endpoint, { ...options, method: 'PUT', body });

export const patch = (endpoint, body, options = {}) =>
  request(endpoint, { ...options, method: 'PATCH', body });

export const del = (endpoint, options = {}) =>
  request(endpoint, { ...options, method: 'DELETE' });

/**
 * Domain-specific API helpers for VyaparSetu
 */
export const fetchProducts = (params = {}, options = {}) =>
  get(API_CONFIG.ENDPOINTS.PRODUCTS, { ...options, params });

export const fetchFeaturedProducts = (params = {}, options = {}) =>
  get(API_CONFIG.ENDPOINTS.FEATURED_PRODUCTS, { ...options, params });

export const fetchProductById = (id, options = {}) =>
  get(`${API_CONFIG.ENDPOINTS.PRODUCTS}/${encodeURIComponent(id)}`, options);

export const fetchCategories = (options = {}) =>
  get(API_CONFIG.ENDPOINTS.CATEGORIES, options);

export const checkHealth = (options = {}) =>
  get(API_CONFIG.ENDPOINTS.HEALTH, options);

const apiClient = {
  request,
  get,
  post,
  put,
  patch,
  delete: del,
  setAuthToken,
  getAuthToken,
  setUnauthorizedHandler,
  isPublicEndpoint,
  fetchProducts,
  fetchFeaturedProducts,
  fetchProductById,
  fetchCategories,
  checkHealth,
};

export default apiClient;
