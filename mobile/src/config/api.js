let Platform = null;
try {
  // eslint-disable-next-line global-require
  Platform = require('react-native').Platform;
} catch (e) {
  // Graceful fallback for non-React Native environments (e.g., Node.js verification scripts)
}

/**
 * Normalizes the API base URL:
 * - Trims whitespace
 * - Strips trailing slashes
 * - Appends /api prefix if missing
 *
 * @param {string} url
 * @returns {string}
 */
export const normalizeBaseUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
};

/**
 * Resolves the default base URL based on the runtime platform:
 * - Android Emulator: 10.0.2.2 maps to host machine localhost
 * - iOS Simulator / Web / Desktop: localhost maps to host machine
 *
 * @returns {string}
 */
export const getDefaultBaseUrl = () => {
  const defaultPort = 5050;
  if (Platform && Platform.OS === 'android') {
    return `http://10.0.2.2:${defaultPort}/api`;
  }
  return `http://localhost:${defaultPort}/api`;
};

const rawEnvUrl = process.env.EXPO_PUBLIC_API_URL;

/**
 * Resolves the active base URL, adapting for LAN/hostname access in browser environments
 */
export const resolveBaseUrl = () => {
  let url = rawEnvUrl ? normalizeBaseUrl(rawEnvUrl) : getDefaultBaseUrl();

  // If running in a web browser environment accessed via LAN IP or hostname (not localhost)
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    url.includes('localhost')
  ) {
    url = url.replace('localhost', window.location.hostname);
  }

  return url;
};

export const BASE_URL = resolveBaseUrl();

export const API_CONFIG = {
  get BASE_URL() {
    return resolveBaseUrl();
  },
  TIMEOUT_MS: 15000,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  ENDPOINTS: {
    HEALTH: '/health',
    PRODUCTS: '/products',
    FEATURED_PRODUCTS: '/products/featured',
    CATEGORIES: '/categories',
    USERS: '/users',
    BUSINESSES: '/businesses',
  },
};

export default API_CONFIG;
