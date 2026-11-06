const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
} = require("../controllers/product.controller");

// Route mappings for /api/products
router.get("/", getAllProducts);
router.get("/:id", getProductById);

module.exports = router;

