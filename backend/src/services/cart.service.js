const prisma = require("../lib/prisma");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

const LEGACY_PRODUCT_MAP = {
  "prod-001": "c1000000-0000-4000-8000-000000000001",
  "prod-002": "c1000000-0000-4000-8000-000000000002",
  "prod-003": "c1000000-0000-4000-8000-000000000003",
  "prod-004": "c1000000-0000-4000-8000-000000000004",
  "prod-005": "c1000000-0000-4000-8000-000000000005",
  "prod-006": "c1000000-0000-4000-8000-000000000006",
  "prod-007": "c1000000-0000-4000-8000-000000000007",
  "prod-008": "c1000000-0000-4000-8000-000000000008",
  "prod-009": "c1000000-0000-4000-8000-000000000009",
  "prod-010": "c1000000-0000-4000-8000-000000000010",
};

const resolveProductId = (id) => {
  if (!id || typeof id !== "string") return id;
  const clean = id.trim().toLowerCase();
  return LEGACY_PRODUCT_MAP[clean] || id.trim();
};

/**
 * Calculates per-unit price, item total, savings, and active bulk pricing tier
 * using trusted database product records.
 *
 * @param {Object} product - Product record from Prisma (including bulkPricing)
 * @param {number} quantity - Quantity of items
 * @returns {Object} Calculated pricing details
 */
const calculateProductPricing = (product, quantity) => {
  if (!product) {
    return {
      unitPrice: 0,
      regularPrice: 0,
      itemTotal: 0,
      savings: 0,
      activeTier: null,
    };
  }

  const qty = Math.max(1, Math.round(Number(quantity) || 1));
  const regularPrice = Number(product.price || 0);

  let unitPrice = regularPrice;
  let activeTier = null;

  if (Array.isArray(product.bulkPricing) && product.bulkPricing.length > 0 && qty > 0) {
    // Sort ascending by minQuantity
    const sortedTiers = [...product.bulkPricing].sort(
      (a, b) => Number(a.minQuantity || 0) - Number(b.minQuantity || 0)
    );

    const match = sortedTiers.find((tier) => {
      const min = Number(tier.minQuantity || 0);
      const minOk = qty >= min;
      const maxOk =
        tier.maxQuantity === null || tier.maxQuantity === undefined
          ? true
          : qty <= Number(tier.maxQuantity);
      return minOk && maxOk;
    });

    if (match && match.pricePerUnit !== null && match.pricePerUnit !== undefined) {
      unitPrice = Number(match.pricePerUnit);
      activeTier = {
        id: match.id,
        minQuantity: match.minQuantity,
        maxQuantity: match.maxQuantity,
        pricePerUnit: Number(match.pricePerUnit),
      };
    }
  }

  const itemTotal = Number((qty * unitPrice).toFixed(2));
  const regularTotal = Number((qty * regularPrice).toFixed(2));
  const savings = Math.max(0, Number((regularTotal - itemTotal).toFixed(2)));

  return {
    unitPrice,
    regularPrice,
    itemTotal,
    savings,
    activeTier,
  };
};

/**
 * Formats a Cart database record with recalculated trusted pricing and aggregates.
 *
 * @param {Object} cart - Cart record from Prisma with items and products
 * @returns {Object} Formatted Cart object
 */
const formatCartResponse = (cart) => {
  if (!cart) return null;

  const rawItems = Array.isArray(cart.items) ? cart.items : [];
  let subtotal = 0;
  let totalSavings = 0;
  let totalUnits = 0;

  const items = rawItems.map((item) => {
    const product = item.product || {};
    const qty = Math.max(1, Number(item.quantity) || 1);
    const isUnavailable = !product || product.isActive === false;

    const pricing = calculateProductPricing(product, qty);

    if (!isUnavailable) {
      subtotal += pricing.itemTotal;
      totalSavings += pricing.savings;
      totalUnits += qty;
    }

    return {
      id: item.id,
      cartId: item.cartId,
      productId: item.productId,
      quantity: qty,
      unitPrice: pricing.unitPrice,
      regularPrice: pricing.regularPrice,
      itemTotal: pricing.itemTotal,
      savings: pricing.savings,
      activeTier: pricing.activeTier,
      isUnavailable,
      unavailableReason: isUnavailable
        ? "This product has been removed or is no longer active for purchase."
        : null,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price || 0),
        stock: product.stock,
        minOrderQuantity: product.minOrderQuantity || 1,
        unit: product.unit || "piece",
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        businessId: product.businessId,
        businessName: product.business?.name || "Verified Supplier",
        business: product.business
          ? {
              id: product.business.id,
              name: product.business.name,
              city: product.business.city,
              state: product.business.state,
            }
          : null,
        categoryId: product.categoryId,
        category: product.category
          ? {
              id: product.category.id,
              name: product.category.name,
            }
          : null,
        bulkPricing: Array.isArray(product.bulkPricing)
          ? product.bulkPricing.map((t) => ({
              id: t.id,
              minQuantity: t.minQuantity,
              maxQuantity: t.maxQuantity,
              pricePerUnit: Number(t.pricePerUnit),
            }))
          : [],
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });

  subtotal = Number(subtotal.toFixed(2));
  totalSavings = Number(totalSavings.toFixed(2));
  const totalAmount = subtotal;
  const cartItemCount = items.length;
  const hasUnavailableProducts = items.some((i) => i.isUnavailable);

  return {
    id: cart.id,
    userId: cart.userId,
    items,
    subtotal,
    totalSavings,
    totalAmount,
    totalUnits,
    cartItemCount,
    hasUnavailableProducts,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

/**
 * Retrieves or creates a Cart for the given user.
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Formatted cart
 */
const getOrCreateUserCart = async (userId) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    const error = new Error("Valid user ID (UUID) is required");
    error.statusCode = 400;
    throw error;
  }

  const cleanUserId = userId.trim();

  // Verify user exists in database
  const user = await prisma.user.findUnique({
    where: { id: cleanUserId },
    select: { id: true },
  });
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  let cart = await prisma.cart.findUnique({
    where: { userId: cleanUserId },
    include: {
      items: {
        include: {
          product: {
            include: {
              business: true,
              category: true,
              bulkPricing: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: cleanUserId },
      include: {
        items: {
          include: {
            product: {
              include: {
                business: true,
                category: true,
                bulkPricing: true,
              },
            },
          },
        },
      },
    });
  }

  return formatCartResponse(cart);
};

/**
 * Adds a product to the user's cart, enforcing ownership, active status, MOQ, and stock limits.
 *
 * @param {string} userId - Requesting user UUID
 * @param {Object} payload
 * @param {string} payload.productId - Product UUID
 * @param {number} [payload.quantity] - Quantity to add (defaults to MOQ)
 * @returns {Promise<Object>} Updated formatted cart
 */
const addToCart = async (userId, { productId, quantity, replace }) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    const error = new Error("Valid user ID (UUID) is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanUserId = userId.trim();

  const resolvedProductId = resolveProductId(productId);
  if (!resolvedProductId || typeof resolvedProductId !== "string" || !UUID_REGEX.test(resolvedProductId)) {
    const error = new Error("Valid Product ID (UUID) is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanProductId = resolvedProductId;

  // 1. Fetch live product from DB
  const product = await prisma.product.findUnique({
    where: { id: cleanProductId },
    include: {
      business: true,
      bulkPricing: true,
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  if (product.isActive === false) {
    const error = new Error("This product is inactive and cannot be added to the cart");
    error.statusCode = 400;
    throw error;
  }

  // 2. Server-side ownership enforcement: check if buyer owns this product's business
  const userBusiness = await prisma.business.findUnique({
    where: { ownerId: cleanUserId },
    select: { id: true },
  });

  if (userBusiness && userBusiness.id === product.businessId) {
    const error = new Error("Sellers cannot purchase products from their own business.");
    error.statusCode = 403;
    error.code = "own_product";
    throw error;
  }

  // 3. Ensure cart exists
  await getOrCreateUserCart(cleanUserId);
  const cart = await prisma.cart.findUnique({
    where: { userId: cleanUserId },
    include: { items: true },
  });

  const moq = product.minOrderQuantity || 1;
  const stock = product.stock !== null ? product.stock : Infinity;

  // 4. Determine quantity
  const existingItem = cart.items.find((i) => i.productId === cleanProductId);
  const requestedQty = quantity !== undefined && quantity !== null ? Number(quantity) : moq;

  if (isNaN(requestedQty) || requestedQty <= 0) {
    const error = new Error(`Quantity must be a positive number`);
    error.statusCode = 400;
    throw error;
  }

  let targetQuantity = Boolean(replace)
    ? requestedQty
    : (existingItem ? existingItem.quantity + requestedQty : requestedQty);
  targetQuantity = Math.round(targetQuantity);

  // Validate against MOQ
  if (targetQuantity < moq) {
    const error = new Error(`Quantity must be at least minimum order quantity of ${moq}`);
    error.statusCode = 400;
    throw error;
  }

  // Validate against Stock
  if (stock !== Infinity && targetQuantity > stock) {
    const error = new Error(`Requested quantity exceeds available stock (${stock})`);
    error.statusCode = 400;
    throw error;
  }

  // 5. Upsert CartItem
  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: targetQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: cleanProductId,
        quantity: targetQuantity,
      },
    });
  }

  return await getOrCreateUserCart(cleanUserId);
};

/**
 * Updates the quantity of an existing item in the user's cart.
 *
 * @param {string} userId - User UUID
 * @param {string} productId - Product UUID
 * @param {number} quantity - New quantity
 * @returns {Promise<Object>} Updated formatted cart
 */
const updateCartItemQuantity = async (userId, productId, quantity) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    const error = new Error("Valid user ID (UUID) is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanUserId = userId.trim();

  const resolvedProductId = resolveProductId(productId);
  if (!resolvedProductId || typeof resolvedProductId !== "string" || !UUID_REGEX.test(resolvedProductId)) {
    const error = new Error("Valid Product ID (UUID) is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanProductId = resolvedProductId;

  const cart = await prisma.cart.findUnique({
    where: { userId: cleanUserId },
    include: { items: true },
  });

  if (!cart) {
    const error = new Error("Cart not found");
    error.statusCode = 404;
    throw error;
  }

  const item = cart.items.find((i) => i.productId === cleanProductId);
  if (!item) {
    const error = new Error("Item not found in your cart");
    error.statusCode = 404;
    throw error;
  }

  const product = await prisma.product.findUnique({
    where: { id: cleanProductId },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const moq = product.minOrderQuantity || 1;
  const stock = product.stock !== null ? product.stock : Infinity;
  const newQty = Math.round(Number(quantity));

  if (isNaN(newQty) || newQty <= 0) {
    const error = new Error("Quantity must be a positive integer");
    error.statusCode = 400;
    throw error;
  }

  if (newQty < moq) {
    const error = new Error(`Quantity cannot be less than minimum order quantity of ${moq}`);
    error.statusCode = 400;
    throw error;
  }

  if (stock !== Infinity && newQty > stock) {
    const error = new Error(`Requested quantity exceeds available stock (${stock})`);
    error.statusCode = 400;
    throw error;
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: newQty },
  });

  return await getOrCreateUserCart(cleanUserId);
};

/**
 * Removes an item from the user's cart by productId.
 *
 * @param {string} userId - User UUID
 * @param {string} productId - Product UUID
 * @returns {Promise<Object>} Updated formatted cart
 */
const removeCartItem = async (userId, productId) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    const error = new Error("Valid user ID (UUID) is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanUserId = userId.trim();

  const resolvedProductId = resolveProductId(productId);
  if (!resolvedProductId || typeof resolvedProductId !== "string" || !UUID_REGEX.test(resolvedProductId)) {
    const error = new Error("Valid Product ID (UUID) is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanProductId = resolvedProductId;

  const cart = await prisma.cart.findUnique({
    where: { userId: cleanUserId },
    include: { items: true },
  });

  if (cart) {
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId: cleanProductId,
      },
    });
  }

  return await getOrCreateUserCart(cleanUserId);
};

/**
 * Clears all items from the user's cart in PostgreSQL.
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Cleared formatted cart
 */
const clearCart = async (userId) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    const error = new Error("Valid user ID (UUID) is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanUserId = userId.trim();

  const cart = await prisma.cart.findUnique({
    where: { userId: cleanUserId },
  });

  if (cart) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }

  return await getOrCreateUserCart(cleanUserId);
};

/**
 * Idempotently migrates local cart items from AsyncStorage to PostgreSQL.
 * Maps legacy product IDs to backend UUIDs, skips user's own products and invalid items,
 * and preserves existing backend items.
 *
 * @param {string} userId - User UUID
 * @param {Array<Object>} items - Array of { productId, id, quantity, legacyProductId }
 * @returns {Promise<Object>} Result including migrated count and updated cart
 */
const migrateLocalCart = async (userId, items = []) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    const error = new Error("Valid user ID (UUID) is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanUserId = userId.trim();

  if (!Array.isArray(items) || items.length === 0) {
    const currentCart = await getOrCreateUserCart(cleanUserId);
    return {
      migratedCount: 0,
      skippedCount: 0,
      cart: currentCart,
    };
  }

  // Get user's business ID to check own products
  const userBiz = await prisma.business.findUnique({
    where: { ownerId: cleanUserId },
    select: { id: true },
  });
  const userBizId = userBiz?.id;

  const cart = await prisma.cart.upsert({
    where: { userId: cleanUserId },
    create: { userId: cleanUserId },
    update: {},
    include: { items: true },
  });

  let migratedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    if (!item) {
      skippedCount++;
      continue;
    }

    const rawId = item.productId || item.id || item.product?.id;
    if (!rawId) {
      skippedCount++;
      continue;
    }

    const resolvedRawId = resolveProductId(rawId);
    let targetProduct = null;
    if (typeof resolvedRawId === "string" && UUID_REGEX.test(resolvedRawId.trim())) {
      targetProduct = await prisma.product.findUnique({
        where: { id: resolvedRawId.trim() },
        include: { bulkPricing: true },
      });
    }

    // If not found by direct UUID, search by name or other identifier
    if (!targetProduct && item.product?.name) {
      targetProduct = await prisma.product.findFirst({
        where: {
          name: { equals: item.product.name.trim(), mode: "insensitive" },
          isActive: true,
        },
        include: { bulkPricing: true },
      });
    }

    // If still not found or inactive, skip safely
    if (!targetProduct || targetProduct.isActive === false) {
      skippedCount++;
      continue;
    }

    // Skip own products (server-side ownership protection)
    if (userBizId && targetProduct.businessId === userBizId) {
      skippedCount++;
      continue;
    }

    const moq = targetProduct.minOrderQuantity || 1;
    const stock = targetProduct.stock !== null ? targetProduct.stock : Infinity;
    let qty = Math.max(moq, Math.round(Number(item.quantity) || moq));
    if (stock !== Infinity && qty > stock) {
      qty = stock;
    }
    if (qty < moq) {
      skippedCount++;
      continue;
    }

    // Idempotent upsert
    const existing = cart.items.find((ci) => ci.productId === targetProduct.id);
    if (existing) {
      // Reuse existing or merge quantity without duplicating
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.max(existing.quantity, qty) },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: targetProduct.id,
          quantity: qty,
        },
      });
    }
    migratedCount++;
  }

  const updatedCart = await getOrCreateUserCart(cleanUserId);
  return {
    ...updatedCart,
    migratedCount,
    skippedCount,
    cart: updatedCart,
  };
};

module.exports = {
  calculateProductPricing,
  formatCartResponse,
  getOrCreateUserCart,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  migrateLocalCart,
};
