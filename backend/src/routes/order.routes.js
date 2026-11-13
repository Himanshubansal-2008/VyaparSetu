const express = require("express");
const router = express.Router();
const {
  createOrder,
  validateOrder,
} = require("../controllers/order.controller");

// Route mappings for /api/orders
router.post("/", createOrder);
router.post("/validate", validateOrder);

module.exports = router;

