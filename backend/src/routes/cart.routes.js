const express = require("express");
const router = express.Router();
const {
  getCart,
  addToCart,
  updateQuantity,
  removeItem,
  clearCart,
  migrateCart,
} = require("../controllers/cart.controller");
const {
  validateCartProduct,
} = require("../controllers/order.controller");

// Route mappings for /api/cart
router.get("/", getCart);
router.post("/items", addToCart);
router.post("/", addToCart);
router.put("/items/:productId", updateQuantity);
router.delete("/items/:productId", removeItem);
router.delete("/", clearCart);
router.post("/migrate", migrateCart);
router.post("/validate", validateCartProduct);

module.exports = router;
