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
 * Standard status progression transitions
 */
const VALID_STATUS_TRANSITIONS = {
  Confirmed: ["Processing", "Rejected", "Cancelled"],
  "Pending Acceptance": ["Processing", "Confirmed", "Rejected", "Cancelled"],
  Processing: ["Dispatched", "Cancelled"],
  Dispatched: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
  Rejected: [],
  Cancelled: [],
};

const canTransitionStatus = (currentStatus, targetStatus) => {
  if (!targetStatus) return false;
  const currentKey = Object.keys(VALID_STATUS_TRANSITIONS).find(
    (k) => k.toLowerCase() === String(currentStatus || "Confirmed").trim().toLowerCase()
  );
  if (!currentKey) return false;
  const allowed = VALID_STATUS_TRANSITIONS[currentKey] || [];
  return allowed.some(
    (s) => s.toLowerCase() === String(targetStatus).trim().toLowerCase()
  );
};

/**
 * Calculates wholesale pricing based on database bulk pricing tiers.
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
  const savings = Math.max(0, Number(((regularPrice - unitPrice) * qty).toFixed(2)));

  return {
    unitPrice,
    regularPrice,
    itemTotal,
    savings,
    activeTier,
  };
};

/**
 * Validates order items against PostgreSQL product records, stock, MOQ, and ownership.
 */
const validateOrderItems = async (userId, items) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new AppError("Valid User ID (x-user-id header) is required to place or validate orders", 400);
  }
  const cleanUserId = userId.trim();

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

    if (UUID_REGEX.test(cleanProductId)) {
      const product = await prisma.product.findUnique({
        where: { id: cleanProductId },
        include: { business: true, bulkPricing: true },
      });

      if (!product) {
        throw new AppError(`Product not found: ${cleanProductId}`, 404);
      }

      if (!product.isActive) {
        throw new AppError(`Product "${product.name}" is no longer active or available for purchase`, 400);
      }

      // OWN PRODUCT PURCHASE PREVENTION
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

      // Handle Quotation locked pricing if item originates from accepted quotation
      let unitPrice = Number(product.price);
      let savings = 0;
      let activeTier = null;
      let quotationId = item.quotationId || null;

      if (quotationId && UUID_REGEX.test(String(quotationId).trim())) {
        const quotation = await prisma.quotation.findUnique({
          where: { id: String(quotationId).trim() },
        });

        if (quotation) {
          if (quotation.buyerId !== cleanUserId) {
            throw new AppError("Quotation does not belong to the requesting buyer", 403);
          }
          if (quotation.status === "Ordered") {
            throw new AppError("Quotation has already been converted to an order", 409);
          }
          if (quotation.status !== "Accepted") {
            throw new AppError(`Quotation status is "${quotation.status}", must be "Accepted" to place order`, 400);
          }
          if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
            throw new AppError("Accepted quotation has expired", 400);
          }

          // Enforce accepted quotation price
          unitPrice = Number(quotation.quotedUnitPrice || product.price);
          const regPrice = Number(product.price);
          savings = Math.max(0, (regPrice - unitPrice) * qty);
        }
      } else {
        // Standard wholesale bulk tier calculation
        const pricing = calculateProductPricing(product, qty);
        unitPrice = pricing.unitPrice;
        savings = pricing.savings;
        activeTier = pricing.activeTier;
      }

      // Check stock availability
      if (product.stock < qty) {
        throw new AppError(
          `Insufficient stock for "${product.name}". Available stock: ${product.stock}, requested: ${qty}`,
          400
        );
      }

      const itemTotal = Number((unitPrice * qty).toFixed(2));

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        price: unitPrice,
        itemTotal,
        savings,
        unit: product.unit || "piece",
        businessId: product.businessId,
        businessName: product.business?.name || "Verified Seller",
        quotationId,
        activeTier,
      });
    } else {
      // Offline / fallback item handling
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

      const price = Number(item.unitPrice || item.price || 0);
      const itemTotal = Number((price * qty).toFixed(2));

      validatedItems.push({
        productId: null,
        productName: item.name || item.title || "Wholesale Product",
        quantity: qty,
        unitPrice: price,
        itemTotal,
        savings: Number(item.savings || 0),
        unit: item.unit || "unit",
        businessId: itemBizId || null,
        businessName: item.sellerName || "Verified Seller",
        quotationId: item.quotationId || null,
        activeTier: item.activeTier || null,
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
 * Places an order with PostgreSQL persistence, stock decrement, and cart clearance in a transaction.
 */
const createOrder = async (userId, orderPayload) => {
  if (!orderPayload || typeof orderPayload !== "object") {
    throw new AppError("Order payload is required", 400);
  }

  // Pre-check duplicate order prevention for quotation
  const rawQuotationId =
    orderPayload.quotationId ||
    (Array.isArray(orderPayload.items) && orderPayload.items.find((i) => i?.quotationId)?.quotationId) ||
    null;

  const cleanQuotationId =
    rawQuotationId && UUID_REGEX.test(String(rawQuotationId).trim())
      ? String(rawQuotationId).trim()
      : null;

  if (cleanQuotationId) {
    const existingQuotationOrder = await prisma.order.findUnique({
      where: { quotationId: cleanQuotationId },
    });
    if (existingQuotationOrder) {
      throw new AppError(
        `Quotation ${cleanQuotationId} has already been converted to order ${existingQuotationOrder.orderNumber}`,
        409
      );
    }
    const quotationRecord = await prisma.quotation.findUnique({
      where: { id: cleanQuotationId },
    });
    if (quotationRecord && quotationRecord.status === "Ordered") {
      throw new AppError(
        `Quotation ${cleanQuotationId} has already been converted to an order`,
        409
      );
    }
  }

  const { validatedItems, userBusinessId } = await validateOrderItems(userId, orderPayload.items);

  const orderId =
    orderPayload.id && UUID_REGEX.test(orderPayload.id)
      ? orderPayload.id
      : undefined;

  const orderNumber =
    orderPayload.orderNumber ||
    `VS-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  let subtotal = 0;
  let totalSavings = 0;
  let totalUnits = 0;

  validatedItems.forEach((item) => {
    subtotal += item.itemTotal;
    totalSavings += item.savings;
    totalUnits += item.quantity;
  });

  const totalAmount = subtotal;

  // Execute atomic PostgreSQL transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the Order
    const createdOrder = await tx.order.create({
      data: {
        ...(orderId ? { id: orderId } : {}),
        orderNumber,
        buyerId: userId.trim(),
        status: orderPayload.status || "Confirmed",
        subtotal,
        totalSavings,
        totalAmount,
        totalUnits,
        deliveryAddress: orderPayload.deliveryAddress || null,
        paymentMethod: orderPayload.paymentMethod || "Trade Credit / RTGS / NEFT",
        notes: orderPayload.notes || null,
        quotationId: cleanQuotationId,
        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            itemTotal: item.itemTotal,
            savings: item.savings,
            unit: item.unit,
            businessId: item.businessId,
            businessName: item.businessName,
            quotationId: item.quotationId,
            activeTier: item.activeTier,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // 2. Decrement product stock for real products
    for (const item of validatedItems) {
      if (item.productId && UUID_REGEX.test(item.productId)) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    // 3. Update quotation status to "Ordered" and link order
    if (cleanQuotationId) {
      await tx.quotation.update({
        where: { id: cleanQuotationId },
        data: {
          status: "Ordered",
          orderedAt: new Date(),
        },
      });

      // Append quotation negotiation message
      await tx.quotationMessage.create({
        data: {
          quotationId: cleanQuotationId,
          senderId: userId.trim(),
          senderRole: "BUYER",
          action: "CONVERT_TO_ORDER",
          price: validatedItems[0]?.unitPrice,
          quantity: validatedItems[0]?.quantity,
          notes: `Quotation converted to wholesale order #${createdOrder.orderNumber}`,
        },
      });
    }

    // 4. Clear the buyer's PostgreSQL cart
    await tx.cartItem.deleteMany({
      where: {
        cart: {
          userId: userId.trim(),
        },
      },
    });

    return createdOrder;
  });

  return formatOrder(result);
};

/**
 * Retrieves orders placed by a specific buyer.
 */
const getBuyerOrders = async (userId, filters = {}) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new AppError("Valid User ID (x-user-id header) is required", 400);
  }

  const where = {
    buyerId: userId.trim(),
  };

  if (filters.status && filters.status !== "All") {
    where.status = {
      equals: filters.status,
      mode: "insensitive",
    };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map(formatOrder);
};

/**
 * Retrieves a single order by ID or orderNumber, enforcing buyer or seller access control.
 */
const getOrderById = async (orderId, requestingUserId, requestingBusinessId) => {
  if (!orderId || typeof orderId !== "string") {
    throw new AppError("Order ID is required", 400);
  }

  const cleanId = orderId.trim();

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { orderNumber: cleanId },
      ],
    },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
      quotation: true,
    },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  // Access control validation:
  // Requester must be either:
  // 1. The buyer of the order
  // 2. The seller of at least one item in the order
  const isBuyer = requestingUserId && order.buyerId === requestingUserId.trim();
  let isSeller = false;

  if (requestingBusinessId) {
    const cleanBizId = requestingBusinessId.trim().toLowerCase();
    isSeller = order.items.some(
      (item) => item.businessId && item.businessId.toLowerCase() === cleanBizId
    );
  } else if (requestingUserId) {
    // Check if requesting user owns a business matching any order item
    const userBiz = await prisma.business.findUnique({
      where: { ownerId: requestingUserId.trim() },
    });
    if (userBiz) {
      isSeller = order.items.some(
        (item) => item.businessId && item.businessId.toLowerCase() === userBiz.id.toLowerCase()
      );
    }
  }

  if (!isBuyer && !isSeller) {
    throw new AppError("Access denied: You do not have permission to view this order", 403);
  }

  return {
    ...formatOrder(order),
    isBuyer,
    isSeller,
  };
};

/**
 * Retrieves incoming orders for a seller business.
 */
const getSellerOrders = async (businessId, filters = {}) => {
  if (!businessId || typeof businessId !== "string" || !UUID_REGEX.test(businessId.trim())) {
    throw new AppError("Valid business ID required", 400);
  }

  const cleanBizId = businessId.trim();

  // Find orders containing items belonging to this business
  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          businessId: cleanBizId,
        },
      },
    },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Attach seller-specific metrics to each order
  const sellerOrders = orders.map((order) => {
    const sellerItems = order.items.filter(
      (item) => item.businessId && item.businessId.toLowerCase() === cleanBizId.toLowerCase()
    );

    const sellerSubtotal = sellerItems.reduce((sum, item) => sum + Number(item.itemTotal), 0);
    const sellerUnits = sellerItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      ...order,
      sellerItems,
      sellerItemCount: sellerItems.length,
      sellerSubtotal,
      sellerUnits,
      hasOtherSellerItems: order.items.length > sellerItems.length,
    };
  });

  return sellerOrders;
};

/**
 * Updates order status with validation and milestone dates.
 */
const updateOrderStatus = async (orderId, actorUserId, actorBusinessId, newStatus, extraData = {}) => {
  if (!orderId || !newStatus) {
    throw new AppError("Order ID and new status are required", 400);
  }

  const order = await getOrderById(orderId, actorUserId, actorBusinessId);

  if (!canTransitionStatus(order.status, newStatus)) {
    throw new AppError(
      `Transition from "${order.status}" to "${newStatus}" is not permitted`,
      400
    );
  }

  const updateData = {
    status: newStatus,
  };

  const now = new Date();

  if (newStatus === "Processing" && !order.acceptedAt) {
    updateData.acceptedAt = now;
  } else if (newStatus === "Dispatched") {
    updateData.dispatchedAt = now;
    if (extraData.carrierName) updateData.carrierName = extraData.carrierName;
    if (extraData.trackingNumber) updateData.trackingNumber = extraData.trackingNumber;
  } else if (newStatus === "Delivered") {
    updateData.deliveredAt = now;
  } else if (newStatus === "Rejected") {
    updateData.rejectedAt = now;
    if (extraData.rejectionReason) updateData.rejectionReason = extraData.rejectionReason;
  } else if (newStatus === "Cancelled") {
    updateData.cancelledAt = now;
    if (extraData.cancellationReason) updateData.cancellationReason = extraData.cancellationReason;
  }

  // If rejected or cancelled, restore product stock
  if (newStatus === "Rejected" || newStatus === "Cancelled") {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });

      for (const item of order.items) {
        if (item.productId && UUID_REGEX.test(item.productId)) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      }
    });
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });
  }

  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return formatOrder(updatedOrder);
};

/**
 * Validates whether a specific product can be added to the user's cart.
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

const formatOrder = (order) => {
  if (!order) return null;
  return {
    ...order,
    subtotal: Number(order.subtotal || 0),
    totalSavings: Number(order.totalSavings || 0),
    totalAmount: Number(order.totalAmount || 0),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice || 0),
          itemTotal: Number(item.itemTotal || 0),
          savings: Number(item.savings || 0),
        }))
      : [],
  };
};

module.exports = {
  validateOrderItems,
  createOrder,
  getBuyerOrders,
  getOrderById,
  getSellerOrders,
  updateOrderStatus,
  validateCartProduct,
  calculateProductPricing,
  canTransitionStatus,
  formatOrder,
  AppError,
  UUID_REGEX,
};
