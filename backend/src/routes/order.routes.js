const express = require("express");
const router = express.Router();
const {
  createOrder,
  getBuyerOrders,
  getOrderById,
  updateOrderStatus,
  validateOrder,
} = require("../controllers/order.controller");

// Route mappings for /api/orders
router.post("/", createOrder);
router.get("/", getBuyerOrders);
router.post("/validate", validateOrder);
router.get("/:id", getOrderById);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
