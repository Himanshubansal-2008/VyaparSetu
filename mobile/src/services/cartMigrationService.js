import AsyncStorage from '@react-native-async-storage/async-storage';
import { CART_STORAGE_KEY } from '../context/CartContext.js';
import { migrateBackendCart, fetchBackendCart } from './cartService.js';
import { isProductOwnedByCurrentSeller, getSessionBusinessProfile } from '../data/businessProfileData.js';
import { getProductById, isProductActive } from '../data/products.js';

export const STORAGE_KEY_CART_MIGRATED = '@vyaparsetu_cart_migrated';

/**
 * Checks whether local cart needs migration and performs idempotent synchronization.
 * 
 * Requirements:
 * 1. Retrieve local cart items from AsyncStorage (@vyaparsetu_cart).
 * 2. If local items exist and backend is reachable, migrate them to PostgreSQL.
 * 3. Preserve existing quantities for each product.
 * 4. Handle products that no longer exist or are inactive gracefully.
 * 5. Skip own products (own-product purchase prevention).
 * 6. Prevent duplicate cart items (idempotence).
 * 7. Do not lose existing cart items if the backend is temporarily unreachable.
 *
 * @param {Object} [options]
 * @returns {Promise<Object>} Migration result
 */
export const migrateLocalCartToBackendIfNeeded = async (options = {}) => {
  try {
    const rawCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (!rawCart) {
      return { success: true, migratedCount: 0, skippedCount: 0, reason: 'empty_local_cart' };
    }

    const localItems = JSON.parse(rawCart);
    if (!Array.isArray(localItems) || localItems.length === 0) {
      return { success: true, migratedCount: 0, skippedCount: 0, reason: 'no_items' };
    }

    // Filter out own products and inactive products before sending to backend
    const sessionProfile = getSessionBusinessProfile();
    const candidateItems = [];
    let skippedCount = 0;

    for (const item of localItems) {
      const pId = item.productId || item.product?.id || item.id;
      if (!pId) {
        skippedCount++;
        continue;
      }

      const product = item.product || getProductById(pId);
      if (product && isProductOwnedByCurrentSeller(product, sessionProfile)) {
        skippedCount++;
        continue;
      }

      if (product && !isProductActive(product)) {
        skippedCount++;
        continue;
      }

      candidateItems.push({
        productId: pId,
        quantity: Math.max(1, Number(item.quantity) || 1),
      });
    }

    if (candidateItems.length === 0) {
      return { success: true, migratedCount: 0, skippedCount, reason: 'no_eligible_items' };
    }

    // Call backend migration endpoint
    const response = await migrateBackendCart(candidateItems, options);
    const cartData = response?.data || response;

    await AsyncStorage.setItem(STORAGE_KEY_CART_MIGRATED, 'true');

    return {
      success: true,
      migratedCount: response?.migratedCount !== undefined ? response.migratedCount : candidateItems.length,
      skippedCount: (response?.skippedCount || 0) + skippedCount,
      cart: cartData,
    };
  } catch (err) {
    console.warn('[cartMigrationService] Migration failed or backend offline, preserving local cart:', err.message || err);
    return {
      success: false,
      migratedCount: 0,
      skippedCount: 0,
      error: err.message || err,
    };
  }
};

const cartMigrationService = {
  migrateLocalCartToBackendIfNeeded,
  STORAGE_KEY_CART_MIGRATED,
};

export default cartMigrationService;

