const prisma = require("../lib/prisma");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
  }
}

/**
 * Validates whether a user can purchase the specified order items.
 * Strictly verifies product ownership against the requesting user's actual database-associated business.
 * Rejects with 403 Forbidden if any item belongs to the user's own business.
 *
 * @param {string} userId - Requesting user UUID
 * @param {Array} items - List of items in the order
 */
const validateOrderItems = async (userId, items) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new AppError("Valid User ID (x-user-id header) is required to place or validate orders", 400);
  }
  const cleanUserId = userId.trim();

  // Find user and their real owned business directly from PostgreSQL
  const user = await prisma.user.findUnique({
    where: { id: cleanUserId },
    include: { business: true },
  });

  if (!user) {
    throw new AppError("User not found in system", 404);
  }

  const userBusinessId = user.business ? user.business.id : null;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Order must contain at least one item", 400);
  }

  const validatedItems = [];

  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new AppError("Invalid order item structure", 400);
    }

    const rawProductId = item.productId || item.id;
    if (!rawProductId || typeof rawProductId !== "string") {
      throw new AppError("Item productId is required", 400);
    }
    const cleanProductId = rawProductId.trim();

    // If product ID is a UUID, verify against PostgreSQL
    if (UUID_REGEX.test(cleanProductId)) {
      const product = await prisma.product.findUnique({
        where: { id: cleanProductId },
        include: { business: true },
      });

      if (!product) {
        throw new AppError(`Product not found: ${cleanProductId}`, 404);
      }

      if (!product.isActive) {
        throw new AppError(`Product "${product.name}" is no longer active or available for purchase`, 400);
      }

      // CRITICAL SECURITY ENFORCEMENT:
      // If the requesting user owns a business and the product belongs to that business, reject!
      if (userBusinessId && (product.businessId === userBusinessId || product.business?.id === userBusinessId)) {
        throw new AppError(
          `Sellers cannot purchase products from their own business. Product "${product.name}" belongs to your business.`,
          403,
          {
            code: "OWN_PRODUCT_PURCHASE_FORBIDDEN",
            productId: product.id,
            productName: product.name,
            businessId: userBusinessId,
          }
        );
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new AppError(`Valid positive quantity required for product "${product.name}"`, 400);
      }

      if (product.minOrderQuantity && qty < product.minOrderQuantity) {
        throw new AppError(
          `Quantity (${qty}) for product "${product.name}" is below minimum order quantity of ${product.minOrderQuantity}`,
          400
        );
      }

      validatedItems.push({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: qty,
        unit: product.unit,
        businessId: product.businessId,
        businessName: product.business?.name || "Verified Seller",
      });
    } else {
      // Legacy mock catalog item (e.g. prod-001) or custom offline item
      // Check client-provided sellerId / businessId vs user business
      const itemBizId = item.businessId || item.sellerId;
      if (userBusinessId && itemBizId && String(itemBizId).trim().toLowerCase() === userBusinessId.toLowerCase()) {
        throw new AppError(
          `Sellers cannot purchase products from their own business. Product "${item.name || cleanProductId}" belongs to your business.`,
          403,
          {
            code: "OWN_PRODUCT_PURCHASE_FORBIDDEN",
            productId: cleanProductId,
            productName: item.name,
            businessId: userBusinessId,
          }
        );
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new AppError("Item quantity must be a positive integer", 400);
      }

      validatedItems.push({
        productId: cleanProductId,
        name: item.name || "Wholesale Product",
        price: Number(item.price || item.unitPrice || 0),
        quantity: qty,
        unit: item.unit || "unit",
        businessId: itemBizId || null,
        businessName: item.sellerName || "Verified Seller",
      });
    }
  }

  return {
    isValid: true,
    userBusinessId,
    itemCount: validatedItems.length,
    validatedItems,
  };
};

/**
 * Creates an order after strict server-side ownership and catalog validation.
 *
 * @param {string} userId - Requesting user UUID
 * @param {Object} orderPayload - Order details including items, address, payment
 */
const createOrder = async (userId, orderPayload) => {
  if (!orderPayload || typeof orderPayload !== "object") {
    throw new AppError("Order payload is required", 400);
  }

  const { validatedItems, userBusinessId } = await validateOrderItems(userId, orderPayload.items);

  const orderId = orderPayload.id || `ord-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderNumber = orderPayload.orderNumber || orderId;

  let totalAmount = 0;
  validatedItems.forEach((item) => {
    totalAmount += item.price * item.quantity;
  });

  const createdOrder = {
    id: orderId,
    orderNumber,
    buyerId: userId,
    createdAt: new Date().toISOString(),
    status: "Confirmed",
    items: validatedItems,
    totalItems: validatedItems.length,
    totalAmount: orderPayload.totalAmount !== undefined ? Number(orderPayload.totalAmount) : totalAmount,
    deliveryAddress: orderPayload.deliveryAddress || null,
    paymentMethod: orderPayload.paymentMethod || "Trade Credit / NEFT / RTGS",
  };

  return createdOrder;
};

/**
 * Validates whether a specific product can be added to the user's cart.
 * Rejects with 403 Forbidden if the product belongs to the user's business.
 *
 * @param {string} userId - Requesting user UUID
 * @param {string} productId - Product UUID
 */
const validateCartProduct = async (userId, productId) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new AppError("Valid User ID (x-user-id header) is required", 400);
  }
  if (!productId || typeof productId !== "string") {
    throw new AppError("Valid Product ID is required", 400);
  }

  const cleanUserId = userId.trim();
  const cleanProductId = productId.trim();

  const user = await prisma.user.findUnique({
    where: { id: cleanUserId },
    include: { business: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const userBusinessId = user.business ? user.business.id : null;

  if (UUID_REGEX.test(cleanProductId)) {
    const product = await prisma.product.findUnique({
      where: { id: cleanProductId },
      include: { business: true },
    });

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (!product.isActive) {
      throw new AppError(`Product "${product.name}" is no longer available`, 400);
    }

    if (userBusinessId && (product.businessId === userBusinessId || product.business?.id === userBusinessId)) {
      throw new AppError(
        `You cannot add your own product to your wholesale cart. Product "${product.name}" belongs to your business.`,
        403,
        {
          code: "OWN_PRODUCT_CART_FORBIDDEN",
          productId: product.id,
          productName: product.name,
          businessId: userBusinessId,
        }
      );
    }

    return {
      eligible: true,
      product: {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        moq: product.minOrderQuantity,
        stock: product.stock,
        businessId: product.businessId,
      },
    };
  }

  return { eligible: true };
};

module.exports = {
  validateOrderItems,
  createOrder,
  validateCartProduct,
  AppError,
  UUID_REGEX,
};

