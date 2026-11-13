/**
 * Pure cart pricing and validation utility functions for VyaparSetu.
 * Free of JSX for universal compatibility across React components, services, and test suites.
 */

/**
 * Calculates the applicable per-unit price for a given product and quantity,
 * respecting tiered bulk pricing if configured on the product.
 */
export function getApplicableUnitPrice(product, quantity) {
  if (!product) return 0;
  const qty = Number(quantity) || 0;

  if (Array.isArray(product.bulkPricing) && product.bulkPricing.length > 0 && qty > 0) {
    const matchingTier = product.bulkPricing.find((tier) => {
      const min =
        tier.minQuantity !== null && tier.minQuantity !== undefined
          ? Number(tier.minQuantity)
          : 0;
      const minMatch = qty >= min;
      const maxMatch =
        tier.maxQuantity === null || tier.maxQuantity === undefined
          ? true
          : qty <= Number(tier.maxQuantity);
      return minMatch && maxMatch;
    });

    if (
      matchingTier &&
      matchingTier.pricePerUnit !== undefined &&
      matchingTier.pricePerUnit !== null
    ) {
      return Number(matchingTier.pricePerUnit);
    }
  }

  return product.price !== undefined && product.price !== null
    ? Number(product.price)
    : 0;
}

/**
 * Finds the active bulk pricing tier for a product at a given quantity.
 */
export function getActiveTier(product, quantity) {
  if (!product || !Array.isArray(product.bulkPricing) || product.bulkPricing.length === 0) {
    return null;
  }
  const qty = Number(quantity) || 0;
  if (qty <= 0) return null;

  const found = product.bulkPricing.find((tier) => {
    const min =
      tier.minQuantity !== null && tier.minQuantity !== undefined
        ? Number(tier.minQuantity)
        : 0;
    const minMatch = qty >= min;
    const maxMatch =
      tier.maxQuantity === null || tier.maxQuantity === undefined
        ? true
        : qty <= Number(tier.maxQuantity);
    return minMatch && maxMatch;
  });

  return found || null;
}

/**
 * Returns minimum order quantity (MOQ) for a product (defaults to 1).
 */
export function getProductMoq(product) {
  if (!product) return 1;
  const raw =
    product.moq !== undefined
      ? product.moq
      : product.minOrderQuantity !== undefined
      ? product.minOrderQuantity
      : null;
  const parsed = Number(raw);
  return !isNaN(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Returns maximum available stock for a product, or Infinity if not specified.
 */
export function getProductStock(product) {
  if (!product) return Infinity;
  const rawStock =
    product.stock !== undefined
      ? product.stock
      : product.availableQuantity !== undefined
      ? product.availableQuantity
      : null;

  if (rawStock === null || rawStock === undefined) return Infinity;
  const parsed = Number(rawStock);
  return !isNaN(parsed) && parsed >= 0 ? parsed : Infinity;
}

/**
 * Re-computes unit price, item total, and savings for a product at a quantity.
 */
export function calculateItemValues(product, quantity) {
  const qty = Math.max(1, Number(quantity) || 1);
  const unitPrice = getApplicableUnitPrice(product, qty);
  const itemTotal = qty * unitPrice;
  const regularPrice =
    product && product.price !== undefined && product.price !== null
      ? Number(product.price)
      : unitPrice;
  const savings = Math.max(0, (regularPrice - unitPrice) * qty);
  const activeTier = getActiveTier(product, qty);

  return {
    unitPrice,
    itemTotal,
    savings,
    activeTier,
  };
}

/**
 * Normalizes backend cart item into the mobile client cart item structure.
 */
export function normalizeBackendCartItem(backendItem, existingLocalItem = null) {
  if (!backendItem) return null;
  const product = backendItem.product || existingLocalItem?.product || {};
  const productId =
    backendItem.productId ||
    product.id ||
    backendItem.id ||
    existingLocalItem?.id;

  const qty = Number(backendItem.quantity) || existingLocalItem?.quantity || 1;
  const unitPrice =
    backendItem.unitPrice !== undefined && backendItem.unitPrice !== null
      ? Number(backendItem.unitPrice)
      : calculateItemValues(product, qty).unitPrice;

  const itemTotal =
    backendItem.itemTotal !== undefined && backendItem.itemTotal !== null
      ? Number(backendItem.itemTotal)
      : qty * unitPrice;

  const savings =
    backendItem.savings !== undefined && backendItem.savings !== null
      ? Number(backendItem.savings)
      : Math.max(0, ((Number(product.price) || unitPrice) - unitPrice) * qty);

  return {
    id: productId,
    cartItemId: backendItem.id,
    productId,
    product: {
      ...product,
      id: productId,
    },
    quantity: qty,
    unitPrice,
    itemTotal,
    savings,
    activeTier: backendItem.activeTier || getActiveTier(product, qty),
    isUnavailable: Boolean(backendItem.isUnavailable),
    unavailableReason: backendItem.unavailableReason || null,
    quotationId: backendItem.quotationId || existingLocalItem?.quotationId || null,
    quotationNumber: backendItem.quotationNumber || existingLocalItem?.quotationNumber || null,
    quotationDetails: backendItem.quotationDetails || existingLocalItem?.quotationDetails || null,
    addedAt: backendItem.createdAt || existingLocalItem?.addedAt || new Date().toISOString(),
    updatedAt: backendItem.updatedAt || new Date().toISOString(),
  };
}
