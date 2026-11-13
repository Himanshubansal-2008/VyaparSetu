const orderService = require("../services/order.service");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

// POST /api/orders - Place a new order with server-side ownership and price validation
const createOrder = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.user?.id || req.body?.buyerId || req.body?.userId;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to place an order",
      });
    }

    const orderData = req.body;
    const order = await orderService.createOrder(userId.trim(), orderData);

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details || undefined,
      });
    }

    console.error("[OrderController] Order creation error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while processing the order",
    });
  }
};

// GET /api/orders - Get buyer order history
const getBuyerOrders = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.user?.id || req.query?.userId;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to view orders",
      });
    }

    const filters = {
      status: req.query?.status,
    };

    const orders = await orderService.getBuyerOrders(userId.trim(), filters);

    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: orders,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[OrderController] Get buyer orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
    });
  }
};

// GET /api/orders/:id - Get order details with access control
const getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.headers["x-user-id"] || req.user?.id;
    const businessId = req.headers["x-business-id"] || req.business?.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await orderService.getOrderById(orderId, userId, businessId);

    return res.status(200).json({
      success: true,
      message: "Order details retrieved successfully",
      data: order,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[OrderController] Get order error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order details",
    });
  }
};

// PUT /api/orders/:id/status - Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.headers["x-user-id"] || req.user?.id;
    const businessId = req.headers["x-business-id"] || req.business?.id;
    const { status, carrierName, trackingNumber, rejectionReason, cancellationReason } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: "Order ID and status are required",
      });
    }

    const updated = await orderService.updateOrderStatus(
      orderId,
      userId,
      businessId,
      status,
      {
        carrierName,
        trackingNumber,
        rejectionReason,
        cancellationReason,
      }
    );

    return res.status(200).json({
      success: true,
      message: `Order status updated to "${status}"`,
      data: updated,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("[OrderController] Update order status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

// POST /api/orders/validate - Pre-flight validate order items for purchasing eligibility
const validateOrder = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.user?.id || req.body?.buyerId || req.body?.userId;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to validate an order",
      });
    }

    const items = req.body.items || req.body;
    const result = await orderService.validateOrderItems(userId.trim(), items);

    return res.status(200).json({
      success: true,
      message: "Order items are valid for purchase",
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details || undefined,
      });
    }

    console.error("[OrderController] Order validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to validate order items",
    });
  }
};

// POST /api/cart/validate - Validate single product eligibility for adding to cart
const validateCartProduct = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] || req.user?.id || req.body?.userId;
    const productId = req.body.productId || req.body.id || req.params.productId;

    if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to validate cart",
      });
    }

    const result = await orderService.validateCartProduct(userId.trim(), productId);

    return res.status(200).json({
      success: true,
      message: "Product is eligible for cart",
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details || undefined,
      });
    }

    console.error("[OrderController] Cart validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to validate cart product",
    });
  }
};

module.exports = {
  createOrder,
  getBuyerOrders,
  getOrderById,
  updateOrderStatus,
  validateOrder,
  validateCartProduct,
};
