const cartService = require("../services/cart.service");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

const getEffectiveUserId = (req) => {
  const userId = req.user?.id || req.headers["x-user-id"];
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    return null;
  }
  return userId.trim();
};

/**
 * GET /api/cart - Fetch the active user's cart
 */
const getCart = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID (UUID) is required in x-user-id header",
      });
    }

    const cart = await cartService.getOrCreateUserCart(userId);
    return res.status(200).json({
      success: true,
      message: "Cart fetched successfully",
      data: cart,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch cart",
    });
  }
};

/**
 * POST /api/cart/items - Add a product to the user's cart
 */
const addToCart = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID (UUID) is required in x-user-id header",
      });
    }

    const { productId, quantity, replace } = req.body || {};
    if (!productId || typeof productId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const cart = await cartService.addToCart(userId, { productId, quantity, replace });
    return res.status(201).json({
      success: true,
      message: "Product added to cart successfully",
      data: cart,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to add product to cart",
      error: error.code || (statusCode === 403 ? "own_product" : "cart_error"),
    });
  }
};

/**
 * PUT /api/cart/items/:productId - Update quantity of an item in cart
 */
const updateQuantity = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID (UUID) is required in x-user-id header",
      });
    }

    const { productId } = req.params;
    const { quantity } = req.body || {};

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: "Quantity is required",
      });
    }

    const cart = await cartService.updateCartItemQuantity(userId, productId, quantity);
    return res.status(200).json({
      success: true,
      message: "Cart item quantity updated successfully",
      data: cart,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update cart item quantity",
    });
  }
};

/**
 * DELETE /api/cart/items/:productId - Remove an item from the cart
 */
const removeItem = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID (UUID) is required in x-user-id header",
      });
    }

    const { productId } = req.params;
    const cart = await cartService.removeCartItem(userId, productId);
    return res.status(200).json({
      success: true,
      message: "Cart item removed successfully",
      data: cart,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to remove cart item",
    });
  }
};

/**
 * DELETE /api/cart - Clear all items from user's cart
 */
const clearCart = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID (UUID) is required in x-user-id header",
      });
    }

    const cart = await cartService.clearCart(userId);
    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to clear cart",
    });
  }
};

/**
 * POST /api/cart/migrate - Idempotently migrate local cart items
 */
const migrateCart = async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID (UUID) is required in x-user-id header",
      });
    }

    const { items } = req.body || {};
    const result = await cartService.migrateLocalCart(userId, items);
    return res.status(200).json({
      success: true,
      message: `Migrated ${result.migratedCount} items to cart (${result.skippedCount} skipped)`,
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to migrate cart items",
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeItem,
  clearCart,
  migrateCart,
};
