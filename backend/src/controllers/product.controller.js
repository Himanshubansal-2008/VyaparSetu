const productService = require("../services/product.service");

// GET /api/products - Get all products (with optional query filters and pagination)
const getAllProducts = async (req, res) => {
  try {
    const { category, categoryId, search, isFeatured, page, limit } = req.query;

    const result = await productService.getAllProducts({
      category,
      categoryId,
      search,
      isFeatured,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: {
        products: result.products,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

// GET /api/products/:id - Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Structured controller placeholder awaiting Product service layer
    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: {
        id: id.trim(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
};
