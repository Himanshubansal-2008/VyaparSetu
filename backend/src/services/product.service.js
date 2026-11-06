const prisma = require("../lib/prisma");

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
      select: {
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
            city: true,
            state: true,
            phone: true,
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
      },
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
    select: {
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
    },
  });
};

module.exports = {
  getAllProducts,
  getProductById,
};

