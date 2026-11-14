const express = require("express");
const router = express.Router();
const {
  getSellerProducts,
  getSellerOrders,
  updateSellerOrderStatus,
} = require("../controllers/seller.controller");

// Route mappings for /api/seller
router.get("/products", getSellerProducts);
router.get("/orders", getSellerOrders);
router.put("/orders/:id/status", updateSellerOrderStatus);

module.exports = router;
