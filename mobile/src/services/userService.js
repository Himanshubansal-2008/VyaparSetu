import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { setClientUserId, setClientBusinessId } from './apiClient';
import { API_CONFIG } from '../config/api';

export const STORAGE_KEY_USER_ID = '@vyaparsetu_user_id';

let cachedUser = null;

/**
 * Generate a random fallback UUID (v4) in browser/mobile without external dependencies
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Initializes or retrieves the current user session.
 * 1. Reads '@vyaparsetu_user_id' from AsyncStorage.
 * 2. Contacts backend POST /api/users/init.
 * 3. Persists returned user ID and attaches to apiClient headers.
 * 4. Gracefully falls back to local storage if offline.
 *
 * @param {Object} [params] - Optional initial user profile details (name, email, phone)
 * @returns {Promise<Object>} Resolved user session
 */
export const initUserSession = async (params = {}) => {
  let storedUserId = null;
  try {
    storedUserId = await AsyncStorage.getItem(STORAGE_KEY_USER_ID);
  } catch (err) {
    console.warn('[userService] Failed to read stored user ID:', err);
  }

  try {
    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.USERS}/init`,
      {
        userId: storedUserId || undefined,
        name: params.name,
        email: params.email,
        phone: params.phone,
      }
    );

    const user = response?.data || response;
    if (user && user.id) {
      cachedUser = user;
      await AsyncStorage.setItem(STORAGE_KEY_USER_ID, user.id);
      setClientUserId(user.id);

      if (user.business && user.business.id) {
        setClientBusinessId(user.business.id);
      }

      return user;
    }
  } catch (apiError) {
    console.warn('[userService] Backend unavailable during user init, continuing offline:', apiError?.message);
  }

  // Offline / Network fallback
  const fallbackId = storedUserId || generateUUID();
  if (!storedUserId) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER_ID, fallbackId);
    } catch (e) {
      console.warn('[userService] Failed to persist fallback user ID:', e);
    }
  }

  cachedUser = {
    id: fallbackId,
    name: params.name || 'Guest Buyer',
    role: 'BUYER',
    isOfflineFallback: true,
  };
  setClientUserId(fallbackId);
  return cachedUser;
};

/**
 * Returns the currently cached user session or null if not yet initialized
 */
export const getCurrentUser = () => cachedUser;

/**
 * Clear cached user (e.g. for testing / reset)
 */
export const clearUserSession = async () => {
  cachedUser = null;
  setClientUserId(null);
  setClientBusinessId(null);
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_USER_ID);
  } catch (e) {
    // ignore
  }
};

const userService = {
  STORAGE_KEY_USER_ID,
  initUserSession,
  getCurrentUser,
  clearUserSession,
  generateUUID,
};

export default userService;

