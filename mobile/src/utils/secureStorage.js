let SecureStore = null;
try {
  // eslint-disable-next-line global-require
  SecureStore = require('expo-secure-store');
} catch (e) {
  // Graceful fallback for non-native / node execution environments
}

let Platform = { OS: 'web' };
try {
  // eslint-disable-next-line global-require
  const rn = require('react-native');
  if (rn && rn.Platform) {
    Platform = rn.Platform;
  }
} catch (e) {
  // Graceful fallback
}

// In-memory fallback cache for Node environments without window or SecureStore
const nodeMemoryStore = new Map();

const JWT_STORAGE_KEY = 'vyaparsetu_jwt_token';
const USER_STORAGE_KEY = 'vyaparsetu_user_info';

/**
 * Persists the JWT token securely using expo-secure-store on iOS/Android.
 * Falls back to web localStorage in web browser environments.
 * Never stores tokens in AsyncStorage, plain files, or environment variables.
 *
 * @param {string} token - Signed JWT token
 * @returns {Promise<void>}
 */
export const storeAuthToken = async (token) => {
  if (!token || typeof token !== 'string') return;
  try {
    if (Platform.OS !== 'web' && SecureStore && typeof SecureStore.setItemAsync === 'function') {
      await SecureStore.setItemAsync(JWT_STORAGE_KEY, token);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(JWT_STORAGE_KEY, token);
    } else {
      nodeMemoryStore.set(JWT_STORAGE_KEY, token);
    }
  } catch (error) {
    console.error('[SecureStorage] Failed to store auth token:', error);
    throw error;
  }
};

/**
 * Retrieves the persisted JWT token from expo-secure-store.
 *
 * @returns {Promise<string|null>}
 */
export const getStoredAuthToken = async () => {
  try {
    if (Platform.OS !== 'web' && SecureStore && typeof SecureStore.getItemAsync === 'function') {
      return await SecureStore.getItemAsync(JWT_STORAGE_KEY);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(JWT_STORAGE_KEY);
    }
    return nodeMemoryStore.get(JWT_STORAGE_KEY) || null;
  } catch (error) {
    console.error('[SecureStorage] Failed to retrieve auth token:', error);
    return null;
  }
};

/**
 * Deletes the stored JWT token from expo-secure-store.
 *
 * @returns {Promise<void>}
 */
export const deleteStoredAuthToken = async () => {
  try {
    if (Platform.OS !== 'web' && SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
      await SecureStore.deleteItemAsync(JWT_STORAGE_KEY);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(JWT_STORAGE_KEY);
    } else {
      nodeMemoryStore.delete(JWT_STORAGE_KEY);
    }
  } catch (error) {
    console.error('[SecureStorage] Failed to delete auth token:', error);
  }
};

/**
 * Stores minimal, sanitized user information (strictly excluding passwords and hashes).
 *
 * @param {Object} user - Sanitized user object
 * @returns {Promise<void>}
 */
export const storeStoredUser = async (user) => {
  if (!user || typeof user !== 'object') return;
  try {
    const safeUser = {
      id: user.id || user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role || 'BUYER',
    };
    const serialized = JSON.stringify(safeUser);
    if (Platform.OS !== 'web' && SecureStore && typeof SecureStore.setItemAsync === 'function') {
      await SecureStore.setItemAsync(USER_STORAGE_KEY, serialized);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(USER_STORAGE_KEY, serialized);
    } else {
      nodeMemoryStore.set(USER_STORAGE_KEY, serialized);
    }
  } catch (error) {
    console.error('[SecureStorage] Failed to store user profile:', error);
  }
};

/**
 * Retrieves cached safe user profile.
 *
 * @returns {Promise<Object|null>}
 */
export const getStoredUser = async () => {
  try {
    let serialized = null;
    if (Platform.OS !== 'web' && SecureStore && typeof SecureStore.getItemAsync === 'function') {
      serialized = await SecureStore.getItemAsync(USER_STORAGE_KEY);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      serialized = window.localStorage.getItem(USER_STORAGE_KEY);
    } else {
      serialized = nodeMemoryStore.get(USER_STORAGE_KEY);
    }
    return serialized ? JSON.parse(serialized) : null;
  } catch (error) {
    console.error('[SecureStorage] Failed to retrieve user profile:', error);
    return null;
  }
};

/**
 * Deletes cached user profile.
 *
 * @returns {Promise<void>}
 */
export const deleteStoredUser = async () => {
  try {
    if (Platform.OS !== 'web' && SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
      await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
    } else if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    } else {
      nodeMemoryStore.delete(USER_STORAGE_KEY);
    }
  } catch (error) {
    console.error('[SecureStorage] Failed to delete user profile:', error);
  }
};

export default {
  storeAuthToken,
  getStoredAuthToken,
  deleteStoredAuthToken,
  storeStoredUser,
  getStoredUser,
  deleteStoredUser,
};
