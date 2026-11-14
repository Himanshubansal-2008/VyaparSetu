import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_KEY_SESSION_PROFILE,
  getSessionBusinessProfile,
  isUserCreatedProfile,
  remapBusinessProfileId,
} from '../data/businessProfileData';
import { remapProductSellerId } from '../data/products';
import { remapOrderSellerId } from '../data/orders';
import { remapQuotationSellerId } from '../data/quotations';
import * as businessService from './businessService';
import { getClientUserId } from './apiClient';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUUID = (str) => {
  return typeof str === 'string' && UUID_REGEX.test(str.trim());
};

/**
 * Remap seller/business ID in @vyaparsetu_cart
 */
export const remapCartSellerId = async (oldSellerId, newSellerId) => {
  if (!oldSellerId || !newSellerId || oldSellerId === newSellerId) return 0;
  const cleanOld = String(oldSellerId).trim().toLowerCase();
  const cleanNew = String(newSellerId).trim();

  try {
    const rawCart = await AsyncStorage.getItem('@vyaparsetu_cart');
    if (!rawCart) return 0;
    const cart = JSON.parse(rawCart);
    if (!Array.isArray(cart)) return 0;

    let modified = false;
    cart.forEach((item) => {
      if (!item) return;
      if (item.sellerId && String(item.sellerId).trim().toLowerCase() === cleanOld) {
        item.sellerId = cleanNew;
        modified = true;
      }
      if (item.product) {
        if (item.product.sellerId && String(item.product.sellerId).trim().toLowerCase() === cleanOld) {
          item.product.sellerId = cleanNew;
          modified = true;
        }
        if (item.product.businessId && String(item.product.businessId).trim().toLowerCase() === cleanOld) {
          item.product.businessId = cleanNew;
          modified = true;
        }
      }
    });

    if (modified) {
      await AsyncStorage.setItem('@vyaparsetu_cart', JSON.stringify(cart));
    }
    return modified ? 1 : 0;
  } catch (err) {
    console.warn('[businessMigration] Failed to remap cart items:', err);
    return 0;
  }
};

/**
 * Checks whether an existing business profile in AsyncStorage needs migration to PostgreSQL,
 * and performs the migration safely and idempotently.
 *
 * @returns {Promise<{ migrated: boolean, reason?: string, error?: string, legacyId?: string, newUUID?: string }>}
 */
export const migrateLegacyBusinessProfileIfNeeded = async () => {
  // 1. MIGRATION DETECTION
  let storedProfile = null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SESSION_PROFILE);
    if (raw) {
      storedProfile = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[businessMigration] Failed to read business profile from storage:', err);
    return { migrated: false, error: err.message };
  }

  // Fallback to in-memory profile if not yet written to AsyncStorage
  if (!storedProfile) {
    storedProfile = getSessionBusinessProfile();
  }

  // If no user-created profile exists, exit without action
  if (!storedProfile || !isUserCreatedProfile(storedProfile)) {
    return { migrated: false, reason: 'no_legacy_profile' };
  }

  const currentId = storedProfile.id || storedProfile.sellerId;
  // If the profile ID is already a valid UUID, no migration is needed
  if (isUUID(currentId)) {
    return { migrated: false, reason: 'already_uuid', id: currentId };
  }

  const legacyId = String(currentId).trim();
  const userId = getClientUserId();

  if (!userId || !isUUID(userId)) {
    console.warn('[businessMigration] User ID not initialized or invalid UUID. Deferring migration.');
    return { migrated: false, reason: 'missing_user_uuid' };
  }

  // 2. CHECK BACKEND FIRST (GET /api/businesses/me)
  let targetBusiness = null;
  try {
    const existing = await businessService.getMyBusiness();
    if (existing && existing.id && isUUID(existing.id)) {
      targetBusiness = existing;
    }
  } catch (err) {
    // 404 means no business registered on backend yet for this user
    if (err?.statusCode !== 404) {
      // Network failure, timeout, or server error -> abort to prevent data corruption
      console.warn('[businessMigration] Backend check failed, preserving local profile:', err?.message);
      return { migrated: false, error: err?.message, status: 'offline' };
    }
  }

  // If not found in PostgreSQL, register through POST /api/businesses
  if (!targetBusiness) {
    try {
      const payload = {
        name: storedProfile.businessName || storedProfile.sellerName || storedProfile.name,
        description: storedProfile.description,
        category: storedProfile.category,
        address: storedProfile.address || storedProfile.streetAddress,
        city: storedProfile.city,
        state: storedProfile.state,
        pincode: storedProfile.pincode,
        phone: storedProfile.contactNumber || storedProfile.phone,
        email: storedProfile.email,
        ownerId: userId,
      };

      const created = await businessService.createBusiness(payload);
      if (created && created.id && isUUID(created.id)) {
        targetBusiness = created;
      }
    } catch (err) {
      // Handle 409 Conflict: backend already has a business for this owner
      if (err?.statusCode === 409) {
        const conflictBiz = err?.data?.data || err?.data;
        if (conflictBiz && conflictBiz.id && isUUID(conflictBiz.id)) {
          targetBusiness = conflictBiz;
        } else {
          try {
            const recheck = await businessService.getMyBusiness();
            if (recheck && recheck.id && isUUID(recheck.id)) {
              targetBusiness = recheck;
            }
          } catch (recheckErr) {
            console.warn('[businessMigration] Recheck after 409 failed:', recheckErr?.message);
          }
        }
      }

      // If still no target business, registration failed -> preserve original data
      if (!targetBusiness) {
        console.warn('[businessMigration] Registration failed, preserving local profile:', err?.message);
        return { migrated: false, error: err?.message, status: 'registration_failed' };
      }
    }
  }

  if (!targetBusiness || !targetBusiness.id || !isUUID(targetBusiness.id)) {
    return { migrated: false, error: 'Failed to obtain valid PostgreSQL UUID from backend' };
  }

  const newUUID = targetBusiness.id;

  // 3. PRESERVE EXISTING DATA & UPDATE REFERENCES
  try {
    await remapBusinessProfileId(legacyId, newUUID);
    await remapProductSellerId(legacyId, newUUID);
    await remapOrderSellerId(legacyId, newUUID);
    await remapQuotationSellerId(legacyId, newUUID);
    await remapCartSellerId(legacyId, newUUID);

    return {
      migrated: true,
      legacyId,
      newUUID,
      business: targetBusiness,
    };
  } catch (remapError) {
    console.error('[businessMigration] Error remapping references:', remapError);
    return {
      migrated: false,
      error: remapError?.message,
    };
  }
};

export default {
  UUID_REGEX,
  isUUID,
  remapCartSellerId,
  migrateLegacyBusinessProfileIfNeeded,
};

