const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  deleteProduct,
  updateProductFeaturedStatus,
} = require("../controllers/product.controller");
const {
  validateProductCreate,
  validateProductUpdate,
  validateProductQuery,
} = require("../middlewares/product.validator");

// Route mappings for /api/products
router.get("/", validateProductQuery, getAllProducts);
router.get("/featured", getFeaturedProducts);
router.get("/:id", getProductById);
router.post("/", validateProductCreate, createProduct);
router.put("/:id", validateProductUpdate, updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/deactivate", deactivateProduct);
router.patch("/:id/featured", updateProductFeaturedStatus);

module.exports = router;

