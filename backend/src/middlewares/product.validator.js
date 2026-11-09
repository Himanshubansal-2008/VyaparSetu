/**
 * Product Input Validation Middleware
 * Reusable validation rules for Product Create (POST) and Product Update (PUT) APIs.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PERMITTED_UPDATE_FIELDS = new Set([
  "name",
  "description",
  "price",
  "stock",
  "minOrderQuantity",
  "unit",
  "imageUrl",
  "isActive",
  "isFeatured",
  "isSurplus",
  "surplusQuantity",
  "surplusPrice",
  "surplusDeadline",
  "categoryId",
  "businessId",
  "bulkPricing",
]);

/**
 * Helper to validate HTTP/HTTPS URLs
 */
const isValidUrl = (str) => {
  if (typeof str !== "string") return false;
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Reusable bulk pricing tiers validation
 * @param {Array} tiers
 * @returns {Array<{ field: string, message: string }>} Validation errors
 */
const validateBulkPricingTiers = (tiers) => {
  const errors = [];

  if (!Array.isArray(tiers)) {
    errors.push({
      field: "bulkPricing",
      message: "Bulk pricing tiers must be provided as an array",
    });
    return errors;
  }

  const validTiers = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    let tierValid = true;

    if (!tier || typeof tier !== "object") {
      errors.push({
        field: `bulkPricing[${i}]`,
        message: "Tier must be a valid object",
      });
      continue;
    }

    // 1. minQuantity: positive integer
    if (
      tier.minQuantity === undefined ||
      tier.minQuantity === null ||
      typeof tier.minQuantity !== "number" ||
      !Number.isInteger(tier.minQuantity) ||
      tier.minQuantity <= 0
    ) {
      errors.push({
        field: `bulkPricing[${i}].minQuantity`,
        message: "Tier minimum quantity must be a positive integer greater than zero",
      });
      tierValid = false;
    }

    // 2. maxQuantity: null or integer >= minQuantity
    if (tier.maxQuantity !== null && tier.maxQuantity !== undefined) {
      if (
        typeof tier.maxQuantity !== "number" ||
        !Number.isInteger(tier.maxQuantity) ||
        (Number.isInteger(tier.minQuantity) && tier.maxQuantity < tier.minQuantity)
      ) {
        errors.push({
          field: `bulkPricing[${i}].maxQuantity`,
          message: "Tier maximum quantity must be null or an integer greater than or equal to minimum quantity",
        });
        tierValid = false;
      }
    }

    // 3. pricePerUnit: positive decimal
    if (
      tier.pricePerUnit === undefined ||
      tier.pricePerUnit === null ||
      typeof tier.pricePerUnit !== "number" ||
      isNaN(tier.pricePerUnit) ||
      !isFinite(tier.pricePerUnit) ||
      tier.pricePerUnit <= 0
    ) {
      errors.push({
        field: `bulkPricing[${i}].pricePerUnit`,
        message: "Tier price per unit must be a positive number greater than zero",
      });
      tierValid = false;
    }

    if (tierValid) {
      validTiers.push({
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity !== undefined ? tier.maxQuantity : null,
        pricePerUnit: tier.pricePerUnit,
      });
    }
  }

  // 4. Overlap and range consistency check
  if (validTiers.length > 1) {
    validTiers.sort((a, b) => a.minQuantity - b.minQuantity);

    for (let j = 0; j < validTiers.length - 1; j++) {
      const current = validTiers[j];
      const next = validTiers[j + 1];

      if (current.minQuantity === next.minQuantity) {
        errors.push({
          field: "bulkPricing",
          message: "Bulk pricing quantity ranges must not overlap",
        });
        break;
      }

      if (current.maxQuantity === null) {
        errors.push({
          field: "bulkPricing",
          message: "An open-ended bulk pricing tier cannot be followed by another tier",
        });
        break;
      }

      if (current.maxQuantity >= next.minQuantity) {
        errors.push({
          field: "bulkPricing",
          message: "Bulk pricing quantity ranges must not overlap",
        });
        break;
      }
    }
  }

  return errors;
};

/**
 * Validation Middleware for POST /api/products (Product Creation)
 */
const validateProductCreate = (req, res, next) => {
  const errors = [];
  const body = req.body || {};

  // Reject unknown or restricted fields (id, createdAt, updatedAt, relations)
  const incomingKeys = Object.keys(body);
  for (const key of incomingKeys) {
    if (!PERMITTED_UPDATE_FIELDS.has(key)) {
      errors.push({
        field: key,
        message: `Field '${key}' is not allowed or is unknown`,
      });
    }
  }

  // 1. name: Required, non-empty string
  if (body.name === undefined || body.name === null) {
    errors.push({ field: "name", message: "Product name is required" });
  } else if (typeof body.name !== "string" || body.name.trim().length === 0) {
    errors.push({ field: "name", message: "Product name cannot be empty" });
  } else {
    body.name = body.name.trim();
  }

  // 2. description: Optional string
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") {
      errors.push({ field: "description", message: "Description must be a string or null" });
    } else {
      body.description = body.description.trim();
    }
  }

  // 3. price: Required, valid positive decimal
  if (body.price === undefined || body.price === null) {
    errors.push({ field: "price", message: "Price is required" });
  } else if (typeof body.price !== "number" || isNaN(body.price) || !isFinite(body.price) || body.price <= 0) {
    errors.push({ field: "price", message: "Price must be a positive number greater than zero" });
  }

  // 4. stock: Non-negative integer (default 0)
  if (body.stock !== undefined && body.stock !== null) {
    if (typeof body.stock !== "number" || !Number.isInteger(body.stock) || body.stock < 0) {
      errors.push({ field: "stock", message: "Stock must be a non-negative integer" });
    }
  }

  // 5. minOrderQuantity: Positive integer (default 1)
  if (body.minOrderQuantity !== undefined && body.minOrderQuantity !== null) {
    if (
      typeof body.minOrderQuantity !== "number" ||
      !Number.isInteger(body.minOrderQuantity) ||
      body.minOrderQuantity <= 0
    ) {
      errors.push({
        field: "minOrderQuantity",
        message: "Minimum order quantity must be a positive integer greater than zero",
      });
    }
  }

  // 6. unit: Non-empty string (default "piece")
  if (body.unit !== undefined && body.unit !== null) {
    if (typeof body.unit !== "string" || body.unit.trim().length === 0) {
      errors.push({ field: "unit", message: "Unit cannot be empty" });
    } else {
      body.unit = body.unit.trim();
    }
  }

  // 7. imageUrl: Optional valid URL or null
  if (body.imageUrl !== undefined && body.imageUrl !== null) {
    if (!isValidUrl(body.imageUrl)) {
      errors.push({ field: "imageUrl", message: "Image URL must be a valid HTTP or HTTPS URL or null" });
    }
  }

  // 8. isActive: Optional boolean (default true)
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    errors.push({ field: "isActive", message: "isActive must be a boolean" });
  }

  // 9. isFeatured: Optional boolean (default false)
  if (body.isFeatured !== undefined && typeof body.isFeatured !== "boolean") {
    errors.push({ field: "isFeatured", message: "isFeatured must be a boolean" });
  }

  // 10. isSurplus: Optional boolean (default false)
  if (body.isSurplus !== undefined && typeof body.isSurplus !== "boolean") {
    errors.push({ field: "isSurplus", message: "isSurplus must be a boolean" });
  }

  // 11. surplusQuantity: Non-negative integer
  if (body.surplusQuantity !== undefined && body.surplusQuantity !== null) {
    if (
      typeof body.surplusQuantity !== "number" ||
      !Number.isInteger(body.surplusQuantity) ||
      body.surplusQuantity < 0
    ) {
      errors.push({ field: "surplusQuantity", message: "Surplus quantity must be a non-negative integer" });
    }
  }

  // 12. surplusPrice: Optional positive decimal or null
  if (body.surplusPrice !== undefined && body.surplusPrice !== null) {
    if (
      typeof body.surplusPrice !== "number" ||
      isNaN(body.surplusPrice) ||
      !isFinite(body.surplusPrice) ||
      body.surplusPrice <= 0
    ) {
      errors.push({ field: "surplusPrice", message: "Surplus price must be a positive number greater than zero" });
    } else if (
      body.price !== undefined &&
      typeof body.price === "number" &&
      body.surplusPrice >= body.price
    ) {
      errors.push({ field: "surplusPrice", message: "Surplus price must be lower than the regular price" });
    }
  }

  // 13. surplusDeadline: Optional valid date or null
  if (body.surplusDeadline !== undefined && body.surplusDeadline !== null) {
    const parsedDate = new Date(body.surplusDeadline);
    if (isNaN(parsedDate.getTime())) {
      errors.push({ field: "surplusDeadline", message: "Surplus deadline must be a valid date or null" });
    }
  }

  // Logical consistency for surplus
  if (body.isSurplus === true) {
    if (body.surplusQuantity !== undefined && body.surplusQuantity <= 0) {
      errors.push({
        field: "surplusQuantity",
        message: "Surplus quantity must be greater than zero when isSurplus is true",
      });
    }
  }
  if (
    body.surplusQuantity !== undefined &&
    body.stock !== undefined &&
    typeof body.surplusQuantity === "number" &&
    typeof body.stock === "number" &&
    body.surplusQuantity > body.stock
  ) {
    errors.push({
      field: "surplusQuantity",
      message: "Surplus quantity cannot exceed available stock",
    });
  }

  // 14. categoryId: Required, non-empty string, valid UUID
  if (body.categoryId === undefined || body.categoryId === null) {
    errors.push({ field: "categoryId", message: "Category ID is required" });
  } else if (typeof body.categoryId !== "string" || !UUID_REGEX.test(body.categoryId.trim())) {
    errors.push({ field: "categoryId", message: "Category ID must be a valid UUID" });
  } else {
    body.categoryId = body.categoryId.trim();
  }

  // 15. businessId: Required, non-empty string, valid UUID
  if (body.businessId === undefined || body.businessId === null) {
    errors.push({ field: "businessId", message: "Business ID is required" });
  } else if (typeof body.businessId !== "string" || !UUID_REGEX.test(body.businessId.trim())) {
    errors.push({ field: "businessId", message: "Business ID must be a valid UUID" });
  } else {
    body.businessId = body.businessId.trim();
  }

  // 16. bulkPricing: Optional array of tiers
  if (body.bulkPricing !== undefined) {
    const bulkErrors = validateBulkPricingTiers(body.bulkPricing);
    errors.push(...bulkErrors);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

/**
 * Validation Middleware for PUT /api/products/:id (Product Update)
 */
const validateProductUpdate = (req, res, next) => {
  const errors = [];
  const { id } = req.params;

  // 1. Validate Product ID parameter
  if (!id || typeof id !== "string" || !UUID_REGEX.test(id.trim())) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: [{ field: "id", message: "Invalid product ID format" }],
    });
  }

  const body = req.body;

  // 2. Reject empty update body
  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: [{ field: "body", message: "Update payload cannot be empty" }],
    });
  }

  // 3. Reject unknown or restricted fields (id, createdAt, updatedAt, relations)
  const incomingKeys = Object.keys(body);
  for (const key of incomingKeys) {
    if (!PERMITTED_UPDATE_FIELDS.has(key)) {
      errors.push({
        field: key,
        message: `Field '${key}' is not allowed to be modified or is unknown`,
      });
    }
  }

  // If restricted fields exist, stop early or include in errors
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  // 4. Validate supplied fields
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      errors.push({ field: "name", message: "Product name cannot be empty" });
    } else {
      body.name = body.name.trim();
    }
  }

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string") {
      errors.push({ field: "description", message: "Description must be a string or null" });
    } else {
      body.description = body.description.trim();
    }
  }

  if (body.price !== undefined) {
    if (typeof body.price !== "number" || isNaN(body.price) || !isFinite(body.price) || body.price <= 0) {
      errors.push({ field: "price", message: "Price must be a positive number greater than zero" });
    }
  }

  if (body.stock !== undefined && body.stock !== null) {
    if (typeof body.stock !== "number" || !Number.isInteger(body.stock) || body.stock < 0) {
      errors.push({ field: "stock", message: "Stock must be a non-negative integer" });
    }
  }

  if (body.minOrderQuantity !== undefined && body.minOrderQuantity !== null) {
    if (
      typeof body.minOrderQuantity !== "number" ||
      !Number.isInteger(body.minOrderQuantity) ||
      body.minOrderQuantity <= 0
    ) {
      errors.push({
        field: "minOrderQuantity",
        message: "Minimum order quantity must be a positive integer greater than zero",
      });
    }
  }

  if (body.unit !== undefined && body.unit !== null) {
    if (typeof body.unit !== "string" || body.unit.trim().length === 0) {
      errors.push({ field: "unit", message: "Unit cannot be empty" });
    } else {
      body.unit = body.unit.trim();
    }
  }

  if (body.imageUrl !== undefined && body.imageUrl !== null) {
    if (!isValidUrl(body.imageUrl)) {
      errors.push({ field: "imageUrl", message: "Image URL must be a valid HTTP or HTTPS URL or null" });
    }
  }

  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    errors.push({ field: "isActive", message: "isActive must be a boolean" });
  }

  if (body.isFeatured !== undefined && typeof body.isFeatured !== "boolean") {
    errors.push({ field: "isFeatured", message: "isFeatured must be a boolean" });
  }

  if (body.isSurplus !== undefined && typeof body.isSurplus !== "boolean") {
    errors.push({ field: "isSurplus", message: "isSurplus must be a boolean" });
  }

  if (body.surplusQuantity !== undefined && body.surplusQuantity !== null) {
    if (
      typeof body.surplusQuantity !== "number" ||
      !Number.isInteger(body.surplusQuantity) ||
      body.surplusQuantity < 0
    ) {
      errors.push({ field: "surplusQuantity", message: "Surplus quantity must be a non-negative integer" });
    }
  }

  if (body.surplusPrice !== undefined && body.surplusPrice !== null) {
    if (
      typeof body.surplusPrice !== "number" ||
      isNaN(body.surplusPrice) ||
      !isFinite(body.surplusPrice) ||
      body.surplusPrice <= 0
    ) {
      errors.push({ field: "surplusPrice", message: "Surplus price must be a positive number greater than zero" });
    } else if (
      body.price !== undefined &&
      typeof body.price === "number" &&
      body.surplusPrice >= body.price
    ) {
      errors.push({ field: "surplusPrice", message: "Surplus price must be lower than the regular price" });
    }
  }

  if (body.surplusDeadline !== undefined && body.surplusDeadline !== null) {
    const parsedDate = new Date(body.surplusDeadline);
    if (isNaN(parsedDate.getTime())) {
      errors.push({ field: "surplusDeadline", message: "Surplus deadline must be a valid date or null" });
    }
  }

  if (body.categoryId !== undefined) {
    if (typeof body.categoryId !== "string" || !UUID_REGEX.test(body.categoryId.trim())) {
      errors.push({ field: "categoryId", message: "Category ID must be a valid UUID" });
    } else {
      body.categoryId = body.categoryId.trim();
    }
  }

  if (body.businessId !== undefined) {
    if (typeof body.businessId !== "string" || !UUID_REGEX.test(body.businessId.trim())) {
      errors.push({ field: "businessId", message: "Business ID must be a valid UUID" });
    } else {
      body.businessId = body.businessId.trim();
    }
  }

  if (body.bulkPricing !== undefined) {
    const bulkErrors = validateBulkPricingTiers(body.bulkPricing);
    errors.push(...bulkErrors);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

/**
 * Product Query Validation Middleware for GET /api/products
 * Validates query parameters:
 * - search: optional string, handles empty/whitespace gracefully, max 100 characters, trims whitespace, rejects multiple values
 */
const validateProductQuery = (req, res, next) => {
  const { search } = req.query;

  // 1. Optional parameter: requests without search remain valid
  if (search === undefined) {
    return next();
  }

  // 2. Reject multiple search parameters (e.g. ?search=a&search=b parsed as array)
  if (Array.isArray(search)) {
    return res.status(400).json({
      success: false,
      message: "Multiple search values are not allowed",
    });
  }

  // 3. Data type must be a string
  if (typeof search !== "string") {
    return res.status(400).json({
      success: false,
      message: "Search query must be a string",
    });
  }

  // 4. Empty or whitespace-only values: handle gracefully (treat as no search)
  const trimmed = search.trim();
  if (!trimmed) {
    delete req.query.search;
    return next();
  }

  // 5. Maximum length: 100 characters
  if (trimmed.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Search query cannot exceed 100 characters",
    });
  }

  // 6. Trim leading and trailing whitespace
  req.query.search = trimmed;
  next();
};

module.exports = {
  validateProductCreate,
  validateProductUpdate,
  validateProductQuery,
  validateProductSearchQuery: validateProductQuery,
  validateBulkPricingTiers,
  UUID_REGEX,
  isValidUrl,
};

