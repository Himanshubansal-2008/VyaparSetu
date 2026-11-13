const express = require("express");
const router = express.Router();
const {
  validateCartProduct,
} = require("../controllers/order.controller");

// Route mappings for /api/cart
router.post("/validate", validateCartProduct);

module.exports = router;

