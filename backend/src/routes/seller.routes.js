const express = require("express");
const router = express.Router();
const { getSellerProducts } = require("../controllers/seller.controller");

// Route mappings for /api/seller
router.get("/products", getSellerProducts);

module.exports = router;

