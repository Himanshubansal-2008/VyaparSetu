
const prisma = require("../lib/prisma");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

// Fetch all businesses for the inventory module
const getBusinesses = async () => {
  return await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      city: true,
      state: true,
    },
    orderBy: {
      name: "asc",
    },
  });
};

const createBusiness = async (businessData) => {
  const {
    name,
    ownerId,
    description,
    category,
    address,
    city,
    state,
    pincode,
    phone,
    email,
  } = businessData || {};

  // 1. Validate ownerId
  if (!ownerId || typeof ownerId !== "string" || !UUID_REGEX.test(ownerId.trim())) {
    const error = new Error("Valid owner ID (User UUID) is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanOwnerId = ownerId.trim();

  // 2. Validate Business Name
  if (!name || typeof name !== "string" || !name.trim()) {
    const error = new Error("Business name is required");
    error.statusCode = 400;
    throw error;
  }
  const cleanName = name.trim();

  // 3. Confirm owner User exists in PostgreSQL
  const owner = await prisma.user.findUnique({
    where: { id: cleanOwnerId },
    include: { business: true },
  });

  if (!owner) {
    const error = new Error("Owner user not found");
    error.statusCode = 404;
    throw error;
  }

  // 4. Prevent duplicate business profiles for the same owner
  if (owner.business) {
    const error = new Error("User already has an existing business profile");
    error.statusCode = 409;
    error.business = owner.business;
    throw error;
  }

  // Double check in Business table by ownerId
  const existingBiz = await prisma.business.findUnique({
    where: { ownerId: cleanOwnerId },
  });

  if (existingBiz) {
    const error = new Error("User already has an existing business profile");
    error.statusCode = 409;
    error.business = existingBiz;
    throw error;
  }

  // 5. Persist Business in PostgreSQL and update User role to SELLER
  const [createdBusiness] = await prisma.$transaction([
    prisma.business.create({
      data: {
        name: cleanName,
        description: typeof description === "string" && description.trim() ? description.trim() : null,
        category: typeof category === "string" && category.trim() ? category.trim() : null,
        address: typeof address === "string" && address.trim() ? address.trim() : null,
        city: typeof city === "string" && city.trim() ? city.trim() : null,
        state: typeof state === "string" && state.trim() ? state.trim() : null,
        pincode: typeof pincode === "string" && pincode.trim() ? pincode.trim() : null,
        phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
        email: typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null,
        ownerId: cleanOwnerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.user.update({
      where: { id: cleanOwnerId },
      data: { role: "SELLER" },
    }),
  ]);

  return createdBusiness;
};

/**
 * Fetch a business by its UUID
 * @param {string} id - Business UUID
 * @returns {Promise<Object|null>}
 */
const getBusinessById = async (id) => {
  if (!id || typeof id !== "string" || !UUID_REGEX.test(id.trim())) {
    return null;
  }

  return await prisma.business.findUnique({
    where: { id: id.trim() },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      products: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
          isFeatured: true,
        },
      },
    },
  });
};

/**
 * Fetch a business by its owner's User UUID
 * @param {string} ownerId - Owner User UUID
 * @returns {Promise<Object|null>}
 */
const getBusinessByOwnerId = async (ownerId) => {
  if (!ownerId || typeof ownerId !== "string" || !UUID_REGEX.test(ownerId.trim())) {
    return null;
  }

  return await prisma.business.findUnique({
    where: { ownerId: ownerId.trim() },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
};

/**
 * Update an existing business profile
 * @param {string} id - Business UUID
 * @param {Object} updateData - Updated fields
 * @param {string} [requesterId] - Optional User UUID requesting the update (for ownership verification)
 * @returns {Promise<Object>} Updated business record
 */
const updateBusiness = async (id, updateData = {}, requesterId = null) => {
  if (!id || typeof id !== "string" || !UUID_REGEX.test(id.trim())) {
    const error = new Error("Invalid business ID format");
    error.statusCode = 400;
    throw error;
  }
  const cleanId = id.trim();

  // 1. Verify existence
  const existing = await prisma.business.findUnique({
    where: { id: cleanId },
  });

  if (!existing) {
    const error = new Error("Business not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Ownership check if requesterId provided
  if (requesterId && typeof requesterId === "string" && UUID_REGEX.test(requesterId.trim())) {
    if (existing.ownerId !== requesterId.trim()) {
      const error = new Error("Unauthorized: You do not own this business profile");
      error.statusCode = 403;
      throw error;
    }
  }

  // 3. Prepare updated data
  const data = {};

  if (updateData.name !== undefined) {
    if (typeof updateData.name !== "string" || !updateData.name.trim()) {
      const error = new Error("Business name cannot be empty");
      error.statusCode = 400;
      throw error;
    }
    data.name = updateData.name.trim();
  }

  if (updateData.description !== undefined) {
    data.description = updateData.description !== null ? String(updateData.description).trim() : null;
  }

  if (updateData.category !== undefined) {
    data.category = updateData.category !== null ? String(updateData.category).trim() : null;
  }

  if (updateData.address !== undefined) {
    data.address = updateData.address !== null ? String(updateData.address).trim() : null;
  }

  if (updateData.city !== undefined) {
    data.city = updateData.city !== null ? String(updateData.city).trim() : null;
  }

  if (updateData.state !== undefined) {
    data.state = updateData.state !== null ? String(updateData.state).trim() : null;
  }

  if (updateData.pincode !== undefined) {
    data.pincode = updateData.pincode !== null ? String(updateData.pincode).trim() : null;
  }

  if (updateData.phone !== undefined) {
    data.phone = updateData.phone !== null ? String(updateData.phone).trim() : null;
  }

  if (updateData.email !== undefined) {
    data.email = updateData.email !== null ? String(updateData.email).trim().toLowerCase() : null;
  }

  return await prisma.business.update({
    where: { id: cleanId },
    data,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
};

module.exports = {
  getBusinesses,
  createBusiness,
  getMyBusiness,
  getBusinessById,
  getBusinessByOwnerId,
  updateBusiness,
};

