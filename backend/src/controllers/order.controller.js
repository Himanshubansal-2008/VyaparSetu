const orderService = require("../services/order.service");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

// POST /api/orders - Place a new order with server-side ownership validation
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
  validateOrder,
  validateCartProduct,
};

