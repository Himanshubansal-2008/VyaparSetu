const prisma = require("../lib/prisma");
const { AppError, UUID_REGEX } = require("./order.service");

/**
 * Valid quotation transitions
 */
const VALID_QUOTATION_TRANSITIONS = {
  Submitted: ["Quotation Provided", "Counter-Offer Made", "Rejected by Seller", "Rejected by Buyer"],
  "Quotation Provided": ["Accepted", "Rejected by Buyer", "Counter-Offer Made", "Quotation Provided"],
  "Counter-Offer Made": ["Accepted", "Rejected by Buyer", "Counter-Offer Made", "Quotation Provided", "Rejected by Seller"],
  Accepted: ["Ordered", "Rejected by Buyer"],
  "Rejected by Seller": [],
  "Rejected by Buyer": [],
  Ordered: [],
};

const canTransitionQuotationStatus = (currentStatus, targetStatus) => {
  if (!targetStatus) return false;
  const currentKey = Object.keys(VALID_QUOTATION_TRANSITIONS).find(
    (k) => k.toLowerCase() === String(currentStatus || "Submitted").trim().toLowerCase()
  );
  if (!currentKey) return false;
  const allowed = VALID_QUOTATION_TRANSITIONS[currentKey] || [];
  return allowed.some(
    (s) => s.toLowerCase() === String(targetStatus).trim().toLowerCase()
  );
};

/**
 * Submits a new Buyer Quotation Request
 */
const createQuotation = async (userId, payload) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new AppError("Valid User ID (x-user-id header) is required", 400);
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

  const rawProductId = payload.productId || payload.id;
  if (!rawProductId || typeof rawProductId !== "string") {
    throw new AppError("Product ID is required for quotation request", 400);
  }
  const cleanProductId = rawProductId.trim();

  let sellerBusinessId = payload.sellerBusinessId || payload.sellerId;
  let productSnapshot = null;
  let product = null;

  if (UUID_REGEX.test(cleanProductId)) {
    product = await prisma.product.findUnique({
      where: { id: cleanProductId },
      include: { business: true },
    });

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (!product.isActive) {
      throw new AppError(`Product "${product.name}" is no longer active for quotations`, 400);
    }

    // OWN PRODUCT QUOTATION RESTRICTION
    if (userBusinessId && (product.businessId === userBusinessId || product.business?.id === userBusinessId)) {
      throw new AppError(
        `You cannot request a quotation for your own business's product. Product "${product.name}" belongs to your business.`,
        403,
        {
          code: "OWN_PRODUCT_QUOTATION_FORBIDDEN",
          productId: product.id,
          productName: product.name,
          businessId: userBusinessId,
        }
      );
    }

    sellerBusinessId = product.businessId;
    productSnapshot = {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      minOrderQuantity: product.minOrderQuantity,
      unit: product.unit,
      imageUrl: product.imageUrl,
      businessId: product.businessId,
      businessName: product.business?.name || "Verified Supplier",
    };
  } else {
    // Offline / fallback catalog item
    if (userBusinessId && sellerBusinessId && String(sellerBusinessId).trim().toLowerCase() === userBusinessId.toLowerCase()) {
      throw new AppError(
        `You cannot request a quotation for your own product.`,
        403,
        {
          code: "OWN_PRODUCT_QUOTATION_FORBIDDEN",
          productId: cleanProductId,
          businessId: userBusinessId,
        }
      );
    }
    productSnapshot = {
      id: cleanProductId,
      name: payload.productName || payload.title || "Wholesale Product",
      price: Number(payload.price || 0),
      unit: payload.unit || "piece",
    };
  }

  // Resolve seller business record
  let finalSellerBusinessId = sellerBusinessId;
  if (!finalSellerBusinessId || !UUID_REGEX.test(finalSellerBusinessId)) {
    // Try to find a fallback business or user's business
    const firstBiz = await prisma.business.findFirst();
    if (firstBiz) {
      finalSellerBusinessId = firstBiz.id;
    } else {
      throw new AppError("No valid seller business available for this quotation", 400);
    }
  }

  const requestedQuantity = Math.max(1, parseInt(payload.requestedQuantity || payload.quantity, 10) || 1);
  const buyerTargetPrice =
    payload.buyerTargetPrice !== undefined && payload.buyerTargetPrice !== null && payload.buyerTargetPrice !== ""
      ? Number(payload.buyerTargetPrice)
      : null;

  const quotationNumber =
    payload.quotationNumber ||
    `QUOT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const created = await prisma.$transaction(async (tx) => {
    const quote = await tx.quotation.create({
      data: {
        ...(payload.id && UUID_REGEX.test(payload.id) ? { id: payload.id } : {}),
        quotationNumber,
        buyerId: cleanUserId,
        sellerBusinessId: finalSellerBusinessId,
        productId: product ? product.id : null,
        productSnapshot,
        buyerInfo: payload.buyerInfo || {
          fullName: payload.deliveryAddress?.fullName || user.name,
          businessName: payload.deliveryAddress?.businessName || user.name,
          phone: payload.deliveryAddress?.phone || user.phone,
        },
        status: "Submitted",
        requestedQuantity,
        buyerTargetPrice,
        deliveryAddress: payload.deliveryAddress || null,
        paymentTerms: payload.paymentTerms || "50% Advance + 50% on Delivery",
        requiredByDate: payload.requiredByDate || "Within 15 days",
        buyerNotes: payload.buyerNotes || "",
      },
      include: {
        product: true,
        sellerBusiness: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Record initial message in negotiation audit trail
    await tx.quotationMessage.create({
      data: {
        quotationId: quote.id,
        senderId: cleanUserId,
        senderRole: "BUYER",
        action: "SUBMIT",
        price: buyerTargetPrice,
        quantity: requestedQuantity,
        notes: payload.buyerNotes || `Submitted quotation request for ${requestedQuantity} units`,
      },
    });

    return quote;
  });

  return formatQuotation(created);
};

/**
 * Retrieves quotations submitted by a buyer
 */
const getBuyerQuotations = async (userId, filters = {}) => {
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

  const quotations = await prisma.quotation.findMany({
    where,
    include: {
      product: true,
      sellerBusiness: true,
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return quotations.map(formatQuotation);
};

/**
 * Retrieves incoming quotations for a seller business
 */
const getSellerQuotations = async (businessId, filters = {}) => {
  if (!businessId || typeof businessId !== "string" || !UUID_REGEX.test(businessId.trim())) {
    throw new AppError("Valid business ID required", 400);
  }

  const where = {
    sellerBusinessId: businessId.trim(),
  };

  if (filters.status && filters.status !== "All") {
    where.status = {
      equals: filters.status,
      mode: "insensitive",
    };
  }

  const quotations = await prisma.quotation.findMany({
    where,
    include: {
      product: true,
      sellerBusiness: true,
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return quotations.map(formatQuotation);
};

/**
 * Retrieves a single quotation with negotiation history, enforcing buyer/seller access control
 */
const getQuotationById = async (quotationId, requestingUserId, requestingBusinessId) => {
  if (!quotationId || typeof quotationId !== "string") {
    throw new AppError("Quotation ID is required", 400);
  }
  const cleanId = quotationId.trim();

  const quotation = await prisma.quotation.findFirst({
    where: {
      OR: [
        { id: cleanId },
        { quotationNumber: cleanId },
      ],
    },
    include: {
      product: true,
      sellerBusiness: true,
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError("Quotation not found", 404);
  }

  // Access control validation
  const isBuyer = requestingUserId && quotation.buyerId === requestingUserId.trim();
  let isSeller = false;

  if (requestingBusinessId && quotation.sellerBusinessId) {
    isSeller = quotation.sellerBusinessId.toLowerCase() === requestingBusinessId.trim().toLowerCase();
  } else if (requestingUserId && quotation.sellerBusinessId) {
    const userBiz = await prisma.business.findUnique({
      where: { ownerId: requestingUserId.trim() },
    });
    if (userBiz && userBiz.id.toLowerCase() === quotation.sellerBusinessId.toLowerCase()) {
      isSeller = true;
    }
  }

  if (!isBuyer && !isSeller) {
    throw new AppError("Access denied: You do not have permission to view this quotation", 403);
  }

  return {
    ...formatQuotation(quotation),
    isBuyer,
    isSeller,
  };
};

/**
 * Seller responds to quotation: Quote, Counter, or Reject
 */
const respondToQuotation = async (quotationId, sellerUserId, sellerBusinessId, responseData) => {
  if (!quotationId || !responseData) {
    throw new AppError("Quotation ID and response data required", 400);
  }

  const quotation = await getQuotationById(quotationId, sellerUserId, sellerBusinessId);

  if (!quotation.isSeller) {
    throw new AppError("Only the supplier can respond to this quotation", 403);
  }

  const {
    type = "quote",
    quotedUnitPrice,
    quotedQuantity,
    validityDays = 14,
    dispatchTimeline = "3-5 business days",
    freightTerms = "Standard B2B freight included. GST extra.",
    sellerNotes = "",
    rejectionReason = "",
  } = responseData;

  let newStatus = "Quotation Provided";
  if (type === "counter") {
    newStatus = "Counter-Offer Made";
  } else if (type === "reject") {
    newStatus = "Rejected by Seller";
  }

  if (!canTransitionQuotationStatus(quotation.status, newStatus)) {
    throw new AppError(
      `Cannot transition quotation from "${quotation.status}" to "${newStatus}"`,
      400
    );
  }

  const unitPrice =
    quotedUnitPrice !== undefined && quotedUnitPrice !== null
      ? Number(quotedUnitPrice)
      : quotation.buyerTargetPrice || Number(quotation.product?.price || 0);

  const qty =
    quotedQuantity !== undefined && quotedQuantity !== null
      ? Number(quotedQuantity)
      : quotation.requestedQuantity || 1;

  const totalAmount = Number((unitPrice * qty).toFixed(2));
  const validDaysNum = Number(validityDays) || 14;
  const validUntil = new Date(Date.now() + validDaysNum * 24 * 60 * 60 * 1000);

  const isCounter = type === "counter";
  const isReject = type === "reject";

  const updated = await prisma.$transaction(async (tx) => {
    const updatedQuote = await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status: newStatus,
        respondedAt: new Date(),
        quotedUnitPrice: !isReject ? unitPrice : undefined,
        quotedQuantity: !isReject ? qty : undefined,
        quotedTotalAmount: !isReject ? totalAmount : undefined,
        validityDays: !isReject ? validDaysNum : undefined,
        validUntil: !isReject ? validUntil : undefined,
        dispatchTimeline: !isReject ? dispatchTimeline : undefined,
        freightTerms: !isReject ? freightTerms : undefined,
        sellerNotes: sellerNotes || "",
        rejectionReason: isReject ? rejectionReason || "Supplier unable to fulfill consignment" : undefined,
        isCounterOffer: isCounter,
      },
      include: {
        product: true,
        sellerBusiness: true,
        buyer: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    let action = "QUOTE";
    if (isCounter) action = "SELLER_COUNTER";
    if (isReject) action = "REJECT_BY_SELLER";

    await tx.quotationMessage.create({
      data: {
        quotationId: quotation.id,
        senderId: sellerUserId || quotation.sellerBusinessId,
        senderRole: "SELLER",
        action,
        price: !isReject ? unitPrice : null,
        quantity: !isReject ? qty : null,
        notes: isReject
          ? rejectionReason || "Supplier declined quotation request"
          : sellerNotes || (isCounter ? `Counter-offer: ${qty} units @ ₹${unitPrice}` : `Quoted: ₹${unitPrice}/unit`),
      },
    });

    return updatedQuote;
  });

  return formatQuotation(updated);
};

/**
 * Buyer submits counter-offer to seller's quote
 */
const submitBuyerCounter = async (quotationId, buyerUserId, counterData) => {
  if (!quotationId || !counterData) {
    throw new AppError("Quotation ID and counter data required", 400);
  }

  const quotation = await getQuotationById(quotationId, buyerUserId, null);

  if (!quotation.isBuyer) {
    throw new AppError("Only the buyer can make a counter-offer", 403);
  }

  if (quotation.status !== "Quotation Provided" && quotation.status !== "Counter-Offer Made") {
    throw new AppError(
      `Cannot make counter-offer when quotation status is "${quotation.status}"`,
      400
    );
  }

  const counterPrice = parseFloat(counterData.counterPrice || counterData.targetPrice);
  const counterQty = parseInt(counterData.counterQuantity || counterData.quantity, 10);

  if (isNaN(counterPrice) || counterPrice <= 0) {
    throw new AppError("Valid positive counter price required", 400);
  }

  if (isNaN(counterQty) || counterQty <= 0) {
    throw new AppError("Valid positive counter quantity required", 400);
  }

  const notes = counterData.buyerNotes || counterData.notes || `Buyer counter-offer: ${counterQty} units @ ₹${counterPrice}/unit`;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedQuote = await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status: "Counter-Offer Made",
        buyerTargetPrice: counterPrice,
        requestedQuantity: counterQty,
        isCounterOffer: true,
        buyerNotes: notes,
      },
      include: {
        product: true,
        sellerBusiness: true,
        buyer: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    await tx.quotationMessage.create({
      data: {
        quotationId: quotation.id,
        senderId: buyerUserId,
        senderRole: "BUYER",
        action: "BUYER_COUNTER",
        price: counterPrice,
        quantity: counterQty,
        notes,
      },
    });

    return updatedQuote;
  });

  return formatQuotation(updated);
};

/**
 * Buyer accepts quotation terms
 */
const acceptQuotation = async (quotationId, buyerUserId) => {
  const quotation = await getQuotationById(quotationId, buyerUserId, null);

  if (!quotation.isBuyer) {
    throw new AppError("Only the buyer can accept this quotation", 403);
  }

  if (!canTransitionQuotationStatus(quotation.status, "Accepted")) {
    throw new AppError(
      `Cannot accept quotation in current status "${quotation.status}"`,
      400
    );
  }

  if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
    throw new AppError("This quotation has expired. Please request an updated quotation.", 400);
  }

  const agreedPrice = Number(quotation.quotedUnitPrice || quotation.buyerTargetPrice || quotation.product?.price || 0);
  const agreedQty = Number(quotation.quotedQuantity || quotation.requestedQuantity || 1);

  const updated = await prisma.$transaction(async (tx) => {
    const updatedQuote = await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status: "Accepted",
        acceptedAt: new Date(),
      },
      include: {
        product: true,
        sellerBusiness: true,
        buyer: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    await tx.quotationMessage.create({
      data: {
        quotationId: quotation.id,
        senderId: buyerUserId,
        senderRole: "BUYER",
        action: "ACCEPT",
        price: agreedPrice,
        quantity: agreedQty,
        notes: `Buyer accepted quotation terms: ${agreedQty} units @ ₹${agreedPrice}/unit`,
      },
    });

    return updatedQuote;
  });

  return formatQuotation(updated);
};

/**
 * Buyer rejects quotation terms
 */
const rejectQuotation = async (quotationId, buyerUserId, reason = "") => {
  const quotation = await getQuotationById(quotationId, buyerUserId, null);

  if (!quotation.isBuyer) {
    throw new AppError("Only the buyer can reject this quotation", 403);
  }

  if (!canTransitionQuotationStatus(quotation.status, "Rejected by Buyer")) {
    throw new AppError(
      `Cannot reject quotation in current status "${quotation.status}"`,
      400
    );
  }

  const rejectionNotes = reason || "Buyer chose not to proceed with quoted terms";

  const updated = await prisma.$transaction(async (tx) => {
    const updatedQuote = await tx.quotation.update({
      where: { id: quotation.id },
      data: {
        status: "Rejected by Buyer",
        buyerRejectionReason: rejectionNotes,
      },
      include: {
        product: true,
        sellerBusiness: true,
        buyer: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    await tx.quotationMessage.create({
      data: {
        quotationId: quotation.id,
        senderId: buyerUserId,
        senderRole: "BUYER",
        action: "REJECT_BY_BUYER",
        notes: rejectionNotes,
      },
    });

    return updatedQuote;
  });

  return formatQuotation(updated);
};

const formatQuotation = (quotation) => {
  if (!quotation) return null;
  return {
    ...quotation,
    orderId: quotation.order?.id || quotation.orderId || null,
    buyerTargetPrice:
      quotation.buyerTargetPrice !== null && quotation.buyerTargetPrice !== undefined
        ? Number(quotation.buyerTargetPrice)
        : null,
    quotedUnitPrice:
      quotation.quotedUnitPrice !== null && quotation.quotedUnitPrice !== undefined
        ? Number(quotation.quotedUnitPrice)
        : null,
    quotedTotalAmount:
      quotation.quotedTotalAmount !== null && quotation.quotedTotalAmount !== undefined
        ? Number(quotation.quotedTotalAmount)
        : null,
    product: quotation.product
      ? {
          ...quotation.product,
          price: Number(quotation.product.price),
        }
      : null,
    messages: Array.isArray(quotation.messages)
      ? quotation.messages.map((m) => ({
          ...m,
          price: m.price !== null && m.price !== undefined ? Number(m.price) : null,
        }))
      : [],
  };
};

module.exports = {
  createQuotation,
  getBuyerQuotations,
  getSellerQuotations,
  getQuotationById,
  respondToQuotation,
  submitBuyerCounter,
  acceptQuotation,
  rejectQuotation,
  canTransitionQuotationStatus,
  formatQuotation,
  VALID_QUOTATION_TRANSITIONS,
};
