const productService = require("../services/product.service");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/products - Get all products (with optional query filters and pagination)
const getAllProducts = async (req, res) => {
  try {
    const { category, categoryId, search, isFeatured, page, limit, sortBy, sortOrder } = req.query;

    const parsedFilters = {};

    // 1. Validate search query if provided
    if (search !== undefined) {
      if (typeof search !== "string") {
        return res.status(400).json({
          success: false,
          message: "Search query must be a string",
        });
      }
      const trimmedSearch = search.trim();
      if (trimmedSearch.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Search query cannot exceed 100 characters",
        });
      }
      if (trimmedSearch) {
        parsedFilters.search = trimmedSearch;
      }
    }

    // 2. Validate categoryId if provided
    const rawCategoryId = categoryId || category;
    if (rawCategoryId !== undefined) {
      if (typeof rawCategoryId !== "string" || !rawCategoryId.trim() || !UUID_REGEX.test(rawCategoryId.trim())) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID format",
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
      const trimmedPage = typeof page === "string" ? page.trim() : page;
      if (!/^\d+$/.test(String(trimmedPage))) {
        return res.status(400).json({
          success: false,
          message: "Page must be a positive integer",
        });
      }
      const pageNum = Number(trimmedPage);
      if (!Number.isInteger(pageNum) || pageNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Page must be a positive integer",
        });
      }
      parsedFilters.page = pageNum;
    } else {
      parsedFilters.page = 1;
    }

    // 5. Validate limit if provided
    if (limit !== undefined) {
      const trimmedLimit = typeof limit === "string" ? limit.trim() : limit;
      if (!/^\d+$/.test(String(trimmedLimit))) {
        return res.status(400).json({
          success: false,
          message: "Limit must be a positive integer between 1 and 100",
        });
      }
      const limitNum = Number(trimmedLimit);
      if (!Number.isInteger(limitNum) || limitNum <= 0 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: "Limit must be a positive integer between 1 and 100",
        });
      }
      parsedFilters.limit = limitNum;
    } else {
      parsedFilters.limit = 10;
    }

    // 6. Validate sortBy and sortOrder if provided
    if (sortOrder !== undefined && sortBy === undefined) {
      return res.status(400).json({
        success: false,
        message: "sortOrder cannot be provided without sortBy",
      });
    }

    if (sortBy !== undefined) {
      if (typeof sortBy !== "string" || sortBy.trim().toLowerCase() !== "price") {
        return res.status(400).json({
          success: false,
          message: "Unsupported sortBy field. Only 'price' is supported.",
        });
      }
      parsedFilters.sortBy = "price";

      if (sortOrder !== undefined) {
        if (typeof sortOrder !== "string") {
          return res.status(400).json({
            success: false,
            message: "Unsupported sortOrder direction. Only 'asc' and 'desc' are supported.",
          });
        }
        const normalizedSortOrder = sortOrder.trim().toLowerCase();
        if (normalizedSortOrder !== "asc" && normalizedSortOrder !== "desc") {
          return res.status(400).json({
            success: false,
            message: "Unsupported sortOrder direction. Only 'asc' and 'desc' are supported.",
          });
        }
        parsedFilters.sortOrder = normalizedSortOrder;
      } else {
        parsedFilters.sortOrder = "asc";
      }
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

    if (!id || typeof id !== "string" || !id.trim() || !UUID_REGEX.test(id.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await productService.getProductById(id.trim());

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

// POST /api/products - Create a new product
const createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

// PUT /api/products/:id - Update an existing product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProduct = await productService.updateProduct(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

// PATCH /api/products/:id/deactivate - Soft deactivate a product
const deactivateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !id.trim() || !UUID_REGEX.test(id.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const deactivatedProduct = await productService.deactivateProduct(id.trim());

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
      data: deactivatedProduct,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate product",
    });
  }
};

// GET /api/products/featured - Return active featured products with pagination
const getFeaturedProducts = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const parsedOptions = {};

    // 1. Validate page if provided
    if (page !== undefined) {
      const pageNum = Number(page);
      if (!Number.isInteger(pageNum) || pageNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Page must be a positive integer",
        });
      }
      parsedOptions.page = pageNum;
    }

    // 2. Validate limit if provided
    if (limit !== undefined) {
      const limitNum = Number(limit);
      if (!Number.isInteger(limitNum) || limitNum <= 0 || limitNum > 50) {
        return res.status(400).json({
          success: false,
          message: "Limit must be a positive integer between 1 and 50",
        });
      }
      parsedOptions.limit = limitNum;
    }

    const result = await productService.getFeaturedProducts(parsedOptions);

    return res.status(200).json({
      success: true,
      message: "Featured products fetched successfully",
      data: {
        products: result.products,
        pagination: {
          total: result.pagination.totalProducts,
          totalProducts: result.pagination.totalProducts,
          page: result.pagination.page,
          limit: result.pagination.limit,
          totalPages: result.pagination.totalPages,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch featured products",
    });
  }
};

// PATCH /api/products/:id/featured - Update product featured status
const updateProductFeaturedStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate product ID format
    if (!id || typeof id !== "string" || !id.trim() || !UUID_REGEX.test(id.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // 2. Validate isFeatured is explicitly provided and is a boolean
    const { isFeatured } = req.body || {};
    if (typeof isFeatured !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isFeatured must be a boolean",
      });
    }

    const updatedProduct = await productService.updateProductFeaturedStatus(
      id.trim(),
      isFeatured
    );

    return res.status(200).json({
      success: true,
      message: "Product featured status updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update product featured status",
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  updateProductFeaturedStatus,
};
