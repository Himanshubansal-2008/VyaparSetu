import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSessionBusinessProfile,
  isUserCreatedProfile,
  isProductOwnedByCurrentSeller,
} from '../data/businessProfileData';
import {
  products,
  STORAGE_KEY_CUSTOM_PRODUCTS,
  isProductDeletedLocally,
  isProductArchivedLocally,
  remapMigratedProduct,
} from '../data/products';
import { remapOrderProductId } from '../data/orders';
import { remapQuotationProductId } from '../data/quotations';
import productService, { isUUID } from './productService';
import { resolveCategoryUUID } from './categoryService';

export const STORAGE_KEY_PRODUCT_ID_MAP = '@vyaparsetu_product_id_map';
export const STORAGE_KEY_CART = '@vyaparsetu_cart';

/**
 * Checks whether an ID belongs to a static mock catalog product (prod-001 through prod-013)
 * which must never be migrated to PostgreSQL.
 */
export const isMockSeedProduct = (id) => {
  if (!id) return true;
  const clean = String(id).trim().toLowerCase();
  return (
    /^prod-0\d{2}$/i.test(clean) ||
    /^c1000000-0000-4000-8000-0000000000\d{2}$/i.test(clean)
  );
};

/**
 * Remap product ID references in @vyaparsetu_cart
 */
export const remapCartProductId = async (oldProductId, newProductId) => {
  if (!oldProductId || !newProductId || oldProductId === newProductId) return 0;
  const cleanOld = String(oldProductId).trim().toLowerCase();
  const cleanNew = String(newProductId).trim();

  try {
    const rawCart = await AsyncStorage.getItem(STORAGE_KEY_CART);
    if (!rawCart) return 0;
    const cart = JSON.parse(rawCart);
    if (!Array.isArray(cart)) return 0;

    let modified = false;
    cart.forEach((item) => {
      if (!item) return;
      const itemId = item.id || item.productId;
      if (itemId && String(itemId).trim().toLowerCase() === cleanOld) {
        item.id = cleanNew;
        item.productId = cleanNew;
        if (!item.legacyProductId) {
          item.legacyProductId = oldProductId;
        }
        modified = true;
      }
      if (item.product) {
        const prodId = item.product.id || item.product.productId;
        if (prodId && String(prodId).trim().toLowerCase() === cleanOld) {
          item.product.id = cleanNew;
          if (!item.product.legacyId) {
            item.product.legacyId = oldProductId;
          }
          modified = true;
        }
      }
    });

    if (modified) {
      await AsyncStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
      return 1;
    }
    return 0;
  } catch (err) {
    console.warn('[productMigration] Failed to remap cart items:', err);
    return 0;
  }
};

/**
 * Retrieves the persisted migration ID mapping (legacyId -> PostgreSQL UUID).
 */
export const getProductMigrationMap = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PRODUCT_ID_MAP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.warn('[productMigration] Error reading migration map:', e);
  }
  return {};
};

/**
 * Persists the migration ID mapping.
 */
export const saveProductMigrationMap = async (map) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PRODUCT_ID_MAP, JSON.stringify(map));
  } catch (e) {
    console.warn('[productMigration] Error saving migration map:', e);
  }
};

/**
 * Migrates local custom products from AsyncStorage (@vyaparsetu_custom_products) to PostgreSQL.
 *
 * Requirements enforced:
 * 1. Checks current business profile: must have a valid PostgreSQL UUID.
 * 2. Does NOT migrate mock/seed catalog products (prod-001 through prod-013).
 * 3. Does NOT create duplicate products on app restart (checks UUID and @vyaparsetu_product_id_map).
 * 4. Preserves deleted and archived states.
 * 5. Remaps all references across local product catalog, cart, orders, and quotations.
 * 6. Idempotent and resumable on partial failure.
 *
 * @returns {Promise<{ migrated: boolean, migratedCount: number, reason?: string, idMap?: Object }>}
 */
export const migrateLocalProductsToBackendIfNeeded = async () => {
  // 1. Check current session business profile
  const sessionProfile = getSessionBusinessProfile();
  if (!sessionProfile || !isUserCreatedProfile(sessionProfile)) {
    return { migrated: false, reason: 'no_user_business_profile', migratedCount: 0 };
  }

  const businessId = sessionProfile.id;
  if (!isUUID(businessId)) {
    return { migrated: false, reason: 'business_id_not_uuid', migratedCount: 0 };
  }

  // 2. Load existing migration map
  const idMap = await getProductMigrationMap();

  // 3. Read custom products from AsyncStorage
  let storedCustomProducts = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_CUSTOM_PRODUCTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        storedCustomProducts = parsed;
      }
    }
  } catch (e) {
    console.warn('[productMigration] Error reading custom products:', e);
  }

  const candidateMap = new Map();
  storedCustomProducts.forEach((p) => {
    if (p && p.id) {
      candidateMap.set(String(p.id).trim().toLowerCase(), p);
    }
  });

  // Also include any custom products in memory not yet in storage
  if (Array.isArray(products)) {
    products.forEach((p) => {
      if (p && p.id) {
        const clean = String(p.id).trim().toLowerCase();
        if (
          !candidateMap.has(clean) &&
          (p.isCustom || clean.startsWith('prod-custom-') || clean.startsWith('prod-submitted-'))
        ) {
          candidateMap.set(clean, p);
        }
      }
    });
  }

  // 4. Filter eligible products:
  // - Not a mock seed product
  // - Not already a UUID
  // - Not already in idMap
  // - Not permanently deleted locally
  // - Owned by current seller's business
  const eligibleProducts = [];
  for (const [cleanId, p] of candidateMap.entries()) {
    if (isMockSeedProduct(cleanId)) continue;
    if (isUUID(p.id)) continue;
    if (idMap[p.id]) continue;
    if (isProductDeletedLocally(p.id)) continue;
    if (!isProductOwnedByCurrentSeller(p, sessionProfile)) continue;
    eligibleProducts.push(p);
  }

  if (eligibleProducts.length === 0) {
    return { migrated: false, reason: 'no_eligible_products', migratedCount: 0, idMap };
  }

  let migratedCount = 0;

  for (const p of eligibleProducts) {
    try {
      const isArchived = isProductArchivedLocally(p.id) || p.isArchived || p.status === 'archived';
      const categoryUUID = resolveCategoryUUID(p.categoryName || p.categoryId || p.category);

      let cleanBulkTiers = undefined;
      if (Array.isArray(p.bulkPricing) && p.bulkPricing.length > 0) {
        cleanBulkTiers = p.bulkPricing
          .map((t) => ({
            minQuantity: parseInt(t.minQuantity, 10),
            maxQuantity:
              t.maxQuantity !== null && t.maxQuantity !== undefined && t.maxQuantity !== ''
                ? parseInt(t.maxQuantity, 10)
                : null,
            pricePerUnit: parseFloat(t.pricePerUnit),
          }))
          .filter(
            (t) =>
              !isNaN(t.minQuantity) &&
              !isNaN(t.pricePerUnit) &&
              t.minQuantity > 0 &&
              t.pricePerUnit > 0
          );
      }

      const rawImg = p.image || (Array.isArray(p.images) && p.images[0]) || p.imageUrl || null;
      const validImageUrl =
        typeof rawImg === 'string' && (rawImg.startsWith('http://') || rawImg.startsWith('https://'))
          ? rawImg
          : null;

      const payload = {
        name: String(p.name || '').trim(),
        description: p.description ? String(p.description).trim() : null,
        price: parseFloat(p.price) || 0,
        stock: parseInt(p.stock ?? p.availableQuantity ?? 0, 10),
        minOrderQuantity: parseInt(p.moq ?? p.minOrderQuantity ?? 1, 10),
        unit: String(p.unit || 'piece').trim().toLowerCase(),
        imageUrl: validImageUrl,
        isActive: !isArchived && p.isActive !== false,
        isFeatured: Boolean(p.isFeatured),
        isSurplus: Boolean(p.isSurplus),
        categoryId: categoryUUID,
        businessId: businessId,
      };

      if (cleanBulkTiers && cleanBulkTiers.length > 0) {
        payload.bulkPricing = cleanBulkTiers;
      }

      const createdRes = await productService.createProduct(payload);
      const newUUID = createdRes?.id || createdRes?.data?.id;

      if (newUUID && isUUID(newUUID)) {
        idMap[p.id] = newUUID;
        await saveProductMigrationMap(idMap);

        // Remap references across catalog, cart, orders, and quotations
        await remapMigratedProduct(p.id, newUUID);
        await remapCartProductId(p.id, newUUID);
        await remapOrderProductId(p.id, newUUID);
        await remapQuotationProductId(p.id, newUUID);

        migratedCount++;
      }
    } catch (itemErr) {
      console.warn(`[productMigration] Failed to migrate product "${p.name || p.id}":`, itemErr);
    }
  }

  return {
    migrated: migratedCount > 0,
    migratedCount,
    idMap,
  };
};

export default {
  STORAGE_KEY_PRODUCT_ID_MAP,
  STORAGE_KEY_CART,
  isMockSeedProduct,
  remapCartProductId,
  getProductMigrationMap,
  saveProductMigrationMap,
  migrateLocalProductsToBackendIfNeeded,
};

