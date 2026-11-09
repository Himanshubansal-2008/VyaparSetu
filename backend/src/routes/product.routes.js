const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
} = require("../controllers/product.controller");
const {
  validateProductCreate,
  validateProductUpdate,
} = require("../middlewares/product.validator");

// Route mappings for /api/products
router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", validateProductCreate, createProduct);
router.put("/:id", validateProductUpdate, updateProduct);
router.patch("/:id/deactivate", deactivateProduct);

module.exports = router;

