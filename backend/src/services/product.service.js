const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");

/**
 * Custom Application Error class with HTTP status code and details
 */
class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
  }
}

/**
 * Standard product select definition including sanitized Category, Business, and BulkPricing relations
 */
const PRODUCT_DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  stock: true,
  minOrderQuantity: true,
  unit: true,
  imageUrl: true,
  isActive: true,
  isFeatured: true,
  isSurplus: true,
  surplusQuantity: true,
  surplusPrice: true,
  surplusDeadline: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
    },
  },
  business: {
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      phone: true,
      email: true,
    },
  },
  bulkPricing: {
    select: {
      id: true,
      minQuantity: true,
      maxQuantity: true,
      pricePerUnit: true,
    },
    orderBy: {
      minQuantity: "asc",
    },
  },
};

/**
 * Helper to validate, parse, and sort bulk pricing tiers
 * @param {Array} tiers
 * @returns {Array<{ minQuantity: number, maxQuantity: number|null, pricePerUnit: Prisma.Decimal }>}
 */
const parseBulkPricingTiers = (tiers) => {
  if (!Array.isArray(tiers)) {
    throw new AppError("Bulk pricing tiers must be provided as an array", 400);
  }

  if (tiers.length === 0) {
    return [];
  }

  const parsedTiers = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (!tier || typeof tier !== "object") {
      throw new AppError(`Bulk pricing tier at index ${i} must be a valid object`, 400);
    }

    const minQty = Number(tier.minQuantity);
    if (!Number.isInteger(minQty) || minQty <= 0) {
      throw new AppError(
        `Bulk pricing tier at index ${i}: minQuantity must be a positive integer greater than zero`,
        400
      );
    }

    let maxQty = null;
    if (tier.maxQuantity !== null && tier.maxQuantity !== undefined) {
      maxQty = Number(tier.maxQuantity);
      if (!Number.isInteger(maxQty) || maxQty < minQty) {
        throw new AppError(
          `Bulk pricing tier at index ${i}: maxQuantity must be null or an integer greater than or equal to minQuantity`,
          400
        );
      }
    }

    let pricePerUnit;
    try {
      pricePerUnit = new Prisma.Decimal(tier.pricePerUnit);
      if (pricePerUnit.isNaN() || !pricePerUnit.isPositive() || pricePerUnit.isZero()) {
        throw new Error();
      }
    } catch {
      throw new AppError(
        `Bulk pricing tier at index ${i}: pricePerUnit must be a positive decimal number`,
        400
      );
    }

    parsedTiers.push({
      minQuantity: minQty,
      maxQuantity: maxQty,
      pricePerUnit,
    });
  }

  // Sort ascending by minQuantity to detect overlaps
  parsedTiers.sort((a, b) => a.minQuantity - b.minQuantity);

  for (let i = 0; i < parsedTiers.length; i++) {
    const current = parsedTiers[i];
    const next = parsedTiers[i + 1];

    if (next) {
      if (current.maxQuantity === null) {
        throw new AppError(
          "Bulk pricing ranges cannot overlap: an open-ended tier cannot be followed by another tier",
          400
        );
      }
      if (current.maxQuantity >= next.minQuantity) {
        throw new AppError(
          `Bulk pricing ranges cannot overlap: tier [${current.minQuantity}, ${current.maxQuantity}] overlaps with [${next.minQuantity}, ${next.maxQuantity !== null ? next.maxQuantity : "unlimited"}]`,
          400
        );
      }
    }
  }

  return parsedTiers;
};

/**
 * Fetch active products with filtering, pagination, and relations
 * @param {Object} filters
 * @param {string} [filters.search] - Partial product name match
 * @param {string} [filters.categoryId] - Filter by category ID
 * @param {boolean|string} [filters.isFeatured] - Filter by isFeatured status
 * @param {number|string} [filters.page=1] - Current page number
 * @param {number|string} [filters.limit=10] - Items per page (max 50)
 */
const getAllProducts = async (filters = {}) => {
  const where = {
    isActive: true,
  };

  // 1. Search by product name (case-insensitive substring)
  if (filters.search && typeof filters.search === "string" && filters.search.trim()) {
    where.name = {
      contains: filters.search.trim(),
      mode: "insensitive",
    };
  }

  // 2. Filter by category ID
  const categoryId = filters.categoryId || filters.category;
  if (categoryId && typeof categoryId === "string" && categoryId.trim()) {
    where.categoryId = categoryId.trim();
  }

  // 3. Filter by featured status
  if (filters.isFeatured !== undefined) {
    if (typeof filters.isFeatured === "boolean") {
      where.isFeatured = filters.isFeatured;
    } else if (typeof filters.isFeatured === "string") {
      const val = filters.isFeatured.trim().toLowerCase();
      if (val === "true") {
        where.isFeatured = true;
      } else if (val === "false") {
        where.isFeatured = false;
      }
    }
  }

  // 4. Pagination configuration
  const rawPage = parseInt(filters.page, 10);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = parseInt(filters.limit, 10);
  let limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  if (limit > 50) {
    limit = 50;
  }

  const skip = (page - 1) * limit;
  const take = limit;

  // 5. Execute query and count in parallel
  const [totalProducts, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: PRODUCT_DETAIL_SELECT,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take,
    }),
  ]);

  const totalPages = Math.ceil(totalProducts / limit);

  return {
    products,
    pagination: {
      page,
      limit,
      totalProducts,
      totalPages,
    },
  };
};

/**
 * Fetch a single active product by ID with full details and relations
 * @param {string} id - Product UUID
 * @returns {Promise<Object|null>} - Active product or null
 */
const getProductById = async (id) => {
  return await prisma.product.findFirst({
    where: {
      id,
      isActive: true,
    },
    select: PRODUCT_DETAIL_SELECT,
  });
};

/**
 * Create a new product with optional nested bulk pricing tiers
 * @param {Object} productData - Validated product creation payload
 * @returns {Promise<Object>} Created product record with category, business, and bulk pricing
 */
const createProduct = async (productData = {}) => {
  if (!productData || typeof productData !== "object") {
    throw new AppError("Product data must be provided as an object", 400);
  }

  // 1. Validate required name
  if (!productData.name || typeof productData.name !== "string" || !productData.name.trim()) {
    throw new AppError("Product name is required and cannot be empty", 400);
  }
  const name = productData.name.trim();

  // 2. Validate price: must be a positive decimal number
  if (productData.price === undefined || productData.price === null || productData.price === "") {
    throw new AppError("Product price is required", 400);
  }
  let decimalPrice;
  try {
    decimalPrice = new Prisma.Decimal(productData.price);
    if (decimalPrice.isNaN() || !decimalPrice.isPositive() || decimalPrice.isZero()) {
      throw new Error();
    }
  } catch {
    throw new AppError("Invalid product price: must be a positive decimal number", 400);
  }

  // 3. Validate categoryId & businessId presence
  if (!productData.categoryId || typeof productData.categoryId !== "string" || !productData.categoryId.trim()) {
    throw new AppError("Category ID is required", 400);
  }
  const categoryId = productData.categoryId.trim();

  if (!productData.businessId || typeof productData.businessId !== "string" || !productData.businessId.trim()) {
    throw new AppError("Business ID is required", 400);
  }
  const businessId = productData.businessId.trim();

  // 4. Verify Category and Business references exist in PostgreSQL
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true },
  });

  if (!business) {
    throw new AppError("Business not found", 404);
  }

  // 5. Validate stock (default: 0)
  let stock = 0;
  if (productData.stock !== undefined && productData.stock !== null) {
    const parsedStock = Number(productData.stock);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      throw new AppError("Stock must be a non-negative integer", 400);
    }
    stock = parsedStock;
  }

  // 6. Validate minOrderQuantity (default: 1)
  let minOrderQuantity = 1;
  if (productData.minOrderQuantity !== undefined && productData.minOrderQuantity !== null) {
    const parsedMOQ = Number(productData.minOrderQuantity);
    if (!Number.isInteger(parsedMOQ) || parsedMOQ <= 0) {
      throw new AppError("Minimum order quantity must be an integer greater than zero", 400);
    }
    minOrderQuantity = parsedMOQ;
  }

  // 7. Validate unit (default: "piece")
  let unit = "piece";
  if (productData.unit !== undefined && productData.unit !== null) {
    if (typeof productData.unit !== "string" || !productData.unit.trim()) {
      throw new AppError("Unit must be a non-empty string", 400);
    }
    unit = productData.unit.trim();
  }

  // 8. Description & imageUrl
  const description =
    productData.description !== undefined && productData.description !== null
      ? String(productData.description).trim()
      : null;

  let imageUrl = null;
  if (productData.imageUrl !== undefined && productData.imageUrl !== null) {
    if (typeof productData.imageUrl !== "string" || !productData.imageUrl.trim()) {
      throw new AppError("Image URL must be a valid string or null", 400);
    }
    imageUrl = productData.imageUrl.trim();
  }

  // 9. Boolean flags
  const isActive = productData.isActive !== undefined ? Boolean(productData.isActive) : true;
  const isFeatured = productData.isFeatured !== undefined ? Boolean(productData.isFeatured) : false;
  const isSurplus = productData.isSurplus !== undefined ? Boolean(productData.isSurplus) : false;

  // 10. Surplus fields
  let surplusQuantity = 0;
  let surplusPrice = null;
  let surplusDeadline = null;

  if (productData.surplusQuantity !== undefined && productData.surplusQuantity !== null) {
    const parsedSQ = Number(productData.surplusQuantity);
    if (!Number.isInteger(parsedSQ) || parsedSQ < 0) {
      throw new AppError("Surplus quantity must be a non-negative integer", 400);
    }
    if (parsedSQ > stock) {
      throw new AppError("Surplus quantity cannot exceed total stock", 400);
    }
    surplusQuantity = parsedSQ;
  }

  if (productData.surplusPrice !== undefined && productData.surplusPrice !== null) {
    try {
      const sp = new Prisma.Decimal(productData.surplusPrice);
      if (sp.isNaN() || !sp.isPositive() || sp.isZero()) {
        throw new Error();
      }
      if (sp.greaterThanOrEqualTo(decimalPrice)) {
        throw new AppError("Surplus price must be lower than the regular price", 400);
      }
      surplusPrice = sp;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("Invalid surplus price: must be a positive decimal number", 400);
    }
  }

  if (productData.surplusDeadline !== undefined && productData.surplusDeadline !== null) {
    const deadline = new Date(productData.surplusDeadline);
    if (isNaN(deadline.getTime())) {
      throw new AppError("Surplus deadline must be a valid date", 400);
    }
    surplusDeadline = deadline;
  }

  // 11. Bulk pricing tiers validation & nested write preparation
  let bulkPricingCreate = undefined;
  if (productData.bulkPricing !== undefined && productData.bulkPricing !== null) {
    const parsedTiers = parseBulkPricingTiers(productData.bulkPricing);
    if (parsedTiers.length > 0) {
      bulkPricingCreate = {
        create: parsedTiers.map((t) => ({
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          pricePerUnit: t.pricePerUnit,
        })),
      };
    }
  }

  // 12. Persist Product and BulkPricing atomically in PostgreSQL
  try {
    const createdProduct = await prisma.product.create({
      data: {
        name,
        description,
        price: decimalPrice,
        stock,
        minOrderQuantity,
        unit,
        imageUrl,
        isActive,
        isFeatured,
        isSurplus,
        surplusQuantity,
        surplusPrice,
        surplusDeadline,
        categoryId,
        businessId,
        ...(bulkPricingCreate ? { bulkPricing: bulkPricingCreate } : {}),
      },
      select: PRODUCT_DETAIL_SELECT,
    });

    return createdProduct;
  } catch (dbError) {
    if (dbError instanceof AppError) {
      throw dbError;
    }
    if (dbError.code === "P2003") {
      throw new AppError(
        "Foreign key constraint violation: referenced Category or Business does not exist",
        400
      );
    }
    if (dbError.code === "P2002") {
      throw new AppError("Unique constraint violation on Product", 409);
    }
    throw new AppError("Failed to create product in database", 500);
  }
};

/**
 * Update an existing product and optionally replace its bulk pricing tiers atomically
 * @param {string} id - Product UUID
 * @param {Object} updateData - Validated product update payload
 * @returns {Promise<Object>} Updated product with full relations
 */
const updateProduct = async (id, updateData = {}) => {
  if (!id || typeof id !== "string" || !id.trim()) {
    throw new AppError("Product ID is required", 400);
  }
  const productId = id.trim();

  if (!updateData || typeof updateData !== "object" || Array.isArray(updateData)) {
    throw new AppError("Update data must be provided as an object", 400);
  }

  // 1. Verify that the product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: { bulkPricing: true },
  });

  if (!existingProduct) {
    throw new AppError("Product not found", 404);
  }

  const updateFields = {};

  // 2. Name
  if (updateData.name !== undefined) {
    if (typeof updateData.name !== "string" || !updateData.name.trim()) {
      throw new AppError("Product name cannot be empty", 400);
    }
    updateFields.name = updateData.name.trim();
  }

  // 3. Description
  if (updateData.description !== undefined) {
    updateFields.description =
      updateData.description !== null ? String(updateData.description).trim() : null;
  }

  // 4. Price
  if (updateData.price !== undefined) {
    try {
      const p = new Prisma.Decimal(updateData.price);
      if (p.isNaN() || !p.isPositive() || p.isZero()) {
        throw new Error();
      }
      updateFields.price = p;
    } catch {
      throw new AppError("Invalid product price: must be a positive decimal number", 400);
    }
  }

  // 5. Stock
  if (updateData.stock !== undefined) {
    const parsedStock = Number(updateData.stock);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      throw new AppError("Stock must be a non-negative integer", 400);
    }
    updateFields.stock = parsedStock;
  }

  // 6. Minimum Order Quantity
  if (updateData.minOrderQuantity !== undefined) {
    const parsedMOQ = Number(updateData.minOrderQuantity);
    if (!Number.isInteger(parsedMOQ) || parsedMOQ <= 0) {
      throw new AppError("Minimum order quantity must be an integer greater than zero", 400);
    }
    updateFields.minOrderQuantity = parsedMOQ;
  }

  // 7. Unit
  if (updateData.unit !== undefined) {
    if (typeof updateData.unit !== "string" || !updateData.unit.trim()) {
      throw new AppError("Unit must be a non-empty string", 400);
    }
    updateFields.unit = updateData.unit.trim();
  }

  // 8. Image URL
  if (updateData.imageUrl !== undefined) {
    if (updateData.imageUrl === null) {
      updateFields.imageUrl = null;
    } else if (typeof updateData.imageUrl === "string" && updateData.imageUrl.trim()) {
      updateFields.imageUrl = updateData.imageUrl.trim();
    } else {
      throw new AppError("Image URL must be a valid string or null", 400);
    }
  }

  // 9. Boolean flags
  if (updateData.isActive !== undefined) {
    updateFields.isActive = Boolean(updateData.isActive);
  }
  if (updateData.isFeatured !== undefined) {
    updateFields.isFeatured = Boolean(updateData.isFeatured);
  }
  if (updateData.isSurplus !== undefined) {
    updateFields.isSurplus = Boolean(updateData.isSurplus);
  }

  // 10. Surplus quantity
  if (updateData.surplusQuantity !== undefined) {
    const parsedSQ = Number(updateData.surplusQuantity);
    if (!Number.isInteger(parsedSQ) || parsedSQ < 0) {
      throw new AppError("Surplus quantity must be a non-negative integer", 400);
    }
    const effectiveStock =
      updateFields.stock !== undefined ? updateFields.stock : existingProduct.stock;
    if (parsedSQ > effectiveStock) {
      throw new AppError("Surplus quantity cannot exceed total stock", 400);
    }
    updateFields.surplusQuantity = parsedSQ;
  }

  // 11. Surplus price
  if (updateData.surplusPrice !== undefined) {
    if (updateData.surplusPrice === null) {
      updateFields.surplusPrice = null;
    } else {
      try {
        const sp = new Prisma.Decimal(updateData.surplusPrice);
        if (sp.isNaN() || !sp.isPositive() || sp.isZero()) {
          throw new Error();
        }
        const effectivePrice =
          updateFields.price !== undefined
            ? updateFields.price
            : new Prisma.Decimal(existingProduct.price);
        if (sp.greaterThanOrEqualTo(effectivePrice)) {
          throw new AppError("Surplus price must be lower than the regular price", 400);
        }
        updateFields.surplusPrice = sp;
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError("Invalid surplus price: must be a positive decimal number", 400);
      }
    }
  }

  // 12. Surplus deadline
  if (updateData.surplusDeadline !== undefined) {
    if (updateData.surplusDeadline === null) {
      updateFields.surplusDeadline = null;
    } else {
      const deadline = new Date(updateData.surplusDeadline);
      if (isNaN(deadline.getTime())) {
        throw new AppError("Surplus deadline must be a valid date", 400);
      }
      updateFields.surplusDeadline = deadline;
    }
  }

  // 13. Category reference verification if supplied
  if (updateData.categoryId !== undefined) {
    if (typeof updateData.categoryId !== "string" || !updateData.categoryId.trim()) {
      throw new AppError("Category ID must be a non-empty string", 400);
    }
    const categoryId = updateData.categoryId.trim();
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    updateFields.categoryId = categoryId;
  }

  // 14. Business reference verification if supplied
  if (updateData.businessId !== undefined) {
    if (typeof updateData.businessId !== "string" || !updateData.businessId.trim()) {
      throw new AppError("Business ID must be a non-empty string", 400);
    }
    const businessId = updateData.businessId.trim();
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) {
      throw new AppError("Business not found", 404);
    }
    updateFields.businessId = businessId;
  }

  // 15. Bulk pricing replacement preparation
  let replaceBulkPricing = false;
  let newBulkPricingTiers = [];

  if (updateData.bulkPricing !== undefined) {
    replaceBulkPricing = true;
    if (updateData.bulkPricing !== null) {
      newBulkPricingTiers = parseBulkPricingTiers(updateData.bulkPricing);
    }
  }

  // 16. Execute transactional update
  try {
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Step A: Update product fields if any were supplied
      if (Object.keys(updateFields).length > 0) {
        await tx.product.update({
          where: { id: productId },
          data: updateFields,
        });
      }

      // Step B: Replace bulk pricing tiers if explicitly supplied
      if (replaceBulkPricing) {
        // Remove existing tiers
        await tx.bulkPricing.deleteMany({
          where: { productId },
        });

        // Insert new tiers if provided
        for (const tier of newBulkPricingTiers) {
          await tx.bulkPricing.create({
            data: {
              productId,
              minQuantity: tier.minQuantity,
              maxQuantity: tier.maxQuantity,
              pricePerUnit: tier.pricePerUnit,
            },
          });
        }
      }

      // Step C: Fetch and return the updated product with relations
      return await tx.product.findUnique({
        where: { id: productId },
        select: PRODUCT_DETAIL_SELECT,
      });
    });

    return updatedProduct;
  } catch (dbError) {
    if (dbError instanceof AppError) {
      throw dbError;
    }
    if (dbError.code === "P2003") {
      throw new AppError(
        "Foreign key constraint violation: referenced Category or Business does not exist",
        400
      );
    }
    if (dbError.code === "P2002") {
      throw new AppError("Unique constraint violation on Product", 409);
    }
    throw new AppError("Failed to update product in database", 500);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  AppError,
  PRODUCT_DETAIL_SELECT,
};
