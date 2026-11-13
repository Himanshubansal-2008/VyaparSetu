const quotationService = require("../services/quotation.service");
const orderService = require("../services/order.service");
const prisma = require("../lib/prisma");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

// POST /api/quotations - Submit buyer quotation request
const createQuotation = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.user?.id || req.body?.buyerId;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to submit a quotation request",
      });
    }

    const quotation = await quotationService.createQuotation(userId.trim(), req.body);

    return res.status(201).json({
      success: true,
      message: "Quotation request submitted successfully",
      data: quotation,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details || undefined,
      });
    }

    console.error("[QuotationController] Create quotation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit quotation request",
    });
  }
};

// GET /api/quotations/buyer - Get buyer's submitted quotations
const getBuyerQuotations = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.user?.id || req.query?.buyerId;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to view quotations",
      });
    }

    const filters = {
      status: req.query?.status,
    };

    const quotations = await quotationService.getBuyerQuotations(userId.trim(), filters);

    return res.status(200).json({
      success: true,
      message: "Buyer quotations retrieved successfully",
      data: quotations,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[QuotationController] Get buyer quotations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve quotations",
    });
  }
};

// GET /api/quotations/seller - Get seller's incoming quotation requests
const getSellerQuotations = async (req, res) => {
  try {
    const headerBizId = req.headers["x-business-id"];
    const queryBizId = req.query?.businessId;
    const userBizId = req.business?.id;
    let businessId = userBizId || headerBizId || queryBizId;

    if (!businessId) {
      const userId = req.user?.id || req.headers["x-user-id"];
      if (userId && UUID_REGEX.test(userId.trim())) {
        const userBiz = await prisma.business.findUnique({
          where: { ownerId: userId.trim() },
          select: { id: true },
        });
        if (userBiz) {
          businessId = userBiz.id;
        }
      }
    }

    if (!businessId || typeof businessId !== "string" || !UUID_REGEX.test(businessId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Seller business identification required. Provide x-business-id or x-user-id header.",
      });
    }

    const filters = {
      status: req.query?.status,
    };

    const quotations = await quotationService.getSellerQuotations(businessId.trim(), filters);

    return res.status(200).json({
      success: true,
      message: "Seller quotations retrieved successfully",
      data: quotations,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[QuotationController] Get seller quotations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve seller quotations",
    });
  }
};

// GET /api/quotations/:id - Get quotation details with negotiation history
const getQuotationById = async (req, res) => {
  try {
    const quotationId = req.params.id;
    const userId = req.headers["x-user-id"] || req.user?.id;
    const businessId = req.headers["x-business-id"] || req.business?.id;

    if (!quotationId) {
      return res.status(400).json({
        success: false,
        message: "Quotation ID is required",
      });
    }

    const quotation = await quotationService.getQuotationById(quotationId, userId, businessId);

    return res.status(200).json({
      success: true,
      message: "Quotation retrieved successfully",
      data: quotation,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[QuotationController] Get quotation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve quotation",
    });
  }
};

// POST /api/quotations/:id/respond - Seller responds (Quote, Counter, Reject)
const respondToQuotation = async (req, res) => {
  try {
    const quotationId = req.params.id;
    const userId = req.headers["x-user-id"] || req.user?.id;
    const businessId = req.headers["x-business-id"] || req.business?.id;

    if (!quotationId) {
      return res.status(400).json({
        success: false,
        message: "Quotation ID is required",
      });
    }

    const updated = await quotationService.respondToQuotation(
      quotationId,
      userId,
      businessId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Quotation response submitted successfully",
      data: updated,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[QuotationController] Respond to quotation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit response to quotation",
    });
  }
};

// POST /api/quotations/:id/buyer-counter - Buyer submits counter-offer
const submitBuyerCounter = async (req, res) => {
  try {
    const quotationId = req.params.id;
    const userId = req.headers["x-user-id"] || req.user?.id;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to submit a counter-offer",
      });
    }

    const updated = await quotationService.submitBuyerCounter(
      quotationId,
      userId.trim(),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Counter-offer submitted successfully",
      data: updated,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[QuotationController] Buyer counter error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit counter-offer",
    });
  }
};

// POST /api/quotations/:id/accept - Buyer accepts quotation
const acceptQuotation = async (req, res) => {
  try {
    const quotationId = req.params.id;
    const userId = req.headers["x-user-id"] || req.user?.id;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to accept quotation",
      });
    }

    const updated = await quotationService.acceptQuotation(quotationId, userId.trim());

    return res.status(200).json({
      success: true,
      message: "Quotation accepted successfully",
      data: updated,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[QuotationController] Accept quotation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept quotation",
    });
  }
};

// POST /api/quotations/:id/reject - Buyer declines quotation
const rejectQuotation = async (req, res) => {
  try {
    const quotationId = req.params.id;
    const userId = req.headers["x-user-id"] || req.user?.id;
    const { reason } = req.body;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to decline quotation",
      });
    }

    const updated = await quotationService.rejectQuotation(quotationId, userId.trim(), reason);

    return res.status(200).json({
      success: true,
      message: "Quotation declined successfully",
      data: updated,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[QuotationController] Reject quotation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to decline quotation",
    });
  }
};

// POST /api/quotations/:id/convert-to-order - Convert accepted quotation directly to order
const convertToOrder = async (req, res) => {
  try {
    const quotationId = req.params.id;
    const userId = req.headers["x-user-id"] || req.user?.id;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to place order",
      });
    }

    const quotation = await quotationService.getQuotationById(quotationId, userId.trim(), null);

    if (!quotation.isBuyer) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can convert this quotation to an order",
      });
    }

    if (quotation.status === "Ordered" || quotation.order) {
      return res.status(409).json({
        success: false,
        message: "This quotation has already been converted to an order.",
      });
    }

    if (quotation.status !== "Accepted") {
      return res.status(400).json({
        success: false,
        message: `Quotation status is "${quotation.status}". Only accepted quotations can be converted to orders.`,
      });
    }

    const effectiveQty = Number(quotation.quotedQuantity) || Number(quotation.requestedQuantity) || 1;
    const effectivePrice =
      Number(quotation.quotedUnitPrice) ||
      Number(quotation.buyerTargetPrice) ||
      Number(quotation.product?.price || 0);

    const orderPayload = {
      quotationId: quotation.id,
      items: [
        {
          productId: quotation.productId || quotation.product?.id,
          quantity: effectiveQty,
          unitPrice: effectivePrice,
          quotationId: quotation.id,
          name: quotation.product?.name,
          unit: quotation.product?.unit,
          businessId: quotation.sellerBusinessId,
        },
      ],
      deliveryAddress: req.body?.deliveryAddress || quotation.deliveryAddress,
      paymentMethod: req.body?.paymentMethod || "Trade Credit / RTGS / NEFT",
      notes: req.body?.notes || quotation.buyerNotes,
    };

    const createdOrder = await orderService.createOrder(userId.trim(), orderPayload);

    return res.status(201).json({
      success: true,
      message: "Quotation successfully converted to wholesale order",
      data: createdOrder,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details || undefined,
      });
    }

    console.error("[QuotationController] Convert to order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to convert quotation to order",
    });
  }
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
  convertToOrder,
};
