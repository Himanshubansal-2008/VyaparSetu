const productService = require("../services/product.service");
const prisma = require("../lib/prisma");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

// GET /api/seller/products - Retrieve products belonging to the active seller
const getSellerProducts = async (req, res) => {
  try {
    const headerBizId = req.headers["x-business-id"];
    const queryBizId = req.query?.businessId;
    const userBizId = req.business?.id;
    let businessId = userBizId || headerBizId || queryBizId;

    // If no businessId header yet, look up business owned by current user
    if (!businessId) {
      const userId = req.user?.id || req.headers["x-user-id"];
      if (userId && UUID_REGEX.test(userId.trim())) {
        const userBiz = await prisma.business.findUnique({
          where: { ownerId: userId.trim() },
          select: { id: true },
        });
        if (userBiz) {
          businessId = userBiz.id;
        }
      }
    }

    if (!businessId || typeof businessId !== "string" || !UUID_REGEX.test(businessId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Seller business identification required. Provide x-business-id or x-user-id header.",
      });
    }

    const {
      search,
      categoryId,
      category,
      sortBy,
      sortOrder,
      page,
      limit,
      isActive,
      includeInactive,
    } = req.query;

    const filters = {
      search,
      categoryId: categoryId || category,
      sortBy,
      sortOrder,
      page,
      limit,
      isActive,
      includeInactive: includeInactive === "true" || includeInactive === true,
    };

    const result = await productService.getSellerProducts(businessId.trim(), filters);

    return res.status(200).json({
      success: true,
      message: "Seller products fetched successfully",
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch seller products",
    });
  }
};

module.exports = {
  getSellerProducts,
};

