const productService = require("../services/product.service");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/products - Get all products (with optional query filters and pagination)
const getAllProducts = async (req, res) => {
  try {
    const { category, categoryId, search, isFeatured, page, limit } = req.query;

    const parsedFilters = {};

    // 1. Validate search query if provided
    if (search !== undefined) {
      if (typeof search !== "string") {
        return res.status(400).json({
          success: false,
          message: "Search query must be a string",
        });
      }
      parsedFilters.search = search.trim();
    }

    // 2. Validate categoryId if provided
    const rawCategoryId = categoryId || category;
    if (rawCategoryId !== undefined) {
      if (typeof rawCategoryId !== "string" || !rawCategoryId.trim() || !UUID_REGEX.test(rawCategoryId.trim())) {
        return res.status(400).json({
          success: false,
          message: "Invalid categoryId format",
        });
      }
      parsedFilters.categoryId = rawCategoryId.trim();
    }

    // 3. Validate isFeatured if provided
    if (isFeatured !== undefined) {
      if (typeof isFeatured === "boolean") {
        parsedFilters.isFeatured = isFeatured;
      } else if (typeof isFeatured === "string") {
        const val = isFeatured.trim().toLowerCase();
        if (val === "true") {
          parsedFilters.isFeatured = true;
        } else if (val === "false") {
          parsedFilters.isFeatured = false;
        } else {
          return res.status(400).json({
            success: false,
            message: "isFeatured must be 'true' or 'false'",
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "isFeatured must be 'true' or 'false'",
        });
      }
    }

    // 4. Validate page if provided
    if (page !== undefined) {
      const pageNum = Number(page);
      if (!Number.isInteger(pageNum) || pageNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Page must be a positive integer",
        });
      }
      parsedFilters.page = pageNum;
    }

    // 5. Validate limit if provided
    if (limit !== undefined) {
      const limitNum = Number(limit);
      if (!Number.isInteger(limitNum) || limitNum <= 0 || limitNum > 50) {
        return res.status(400).json({
          success: false,
          message: "Limit must be a positive integer between 1 and 50",
        });
      }
      parsedFilters.limit = limitNum;
    }

    const result = await productService.getAllProducts(parsedFilters);

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
