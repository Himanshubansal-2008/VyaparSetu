const prisma = require("../lib/prisma");

/**
 * Fetch all active categories ordered alphabetically by name
 */
const getAllCategories = async () => {
  return await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
    },
  });
};

/**
 * Fetch an active category by its unique ID
 */
const getActiveCategoryById = async (id) => {
  return await prisma.category.findFirst({
    where: {
      id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
    },
  });
};

/**
 * Fetch a category by its unique ID
 * @param {string} id - Category ID
 * @param {boolean} [activeOnly=false] - If true, only returns active category
 */
const getCategoryById = async (id, activeOnly = false) => {
  const where = { id };
  if (activeOnly) {
    where.isActive = true;
  }
  return await prisma.category.findFirst({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Find category by name (case-insensitive) for duplicate prevention
 */
const getCategoryByName = async (name) => {
  return await prisma.category.findFirst({
    where: {
      name: {
        equals: name.trim(),
        mode: "insensitive",
      },
    },
  });
};

/**
 * Create a new category record
 */
const createCategory = async ({ name, description, imageUrl, isActive }) => {
  return await prisma.category.create({
    data: {
      name: name.trim(),
      description: description !== undefined && description !== null ? String(description).trim() : null,
      imageUrl: imageUrl !== undefined && imageUrl !== null ? String(imageUrl).trim() : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Update an existing category by ID
 */
const updateCategory = async (id, data) => {
  const updateData = {};

  if (data.name !== undefined) {
    updateData.name = String(data.name).trim();
  }
  if (data.description !== undefined) {
    updateData.description = data.description !== null ? String(data.description).trim() : null;
  }
  if (data.imageUrl !== undefined) {
    updateData.imageUrl = data.imageUrl !== null ? String(data.imageUrl).trim() : null;
  }
  if (data.isActive !== undefined) {
    updateData.isActive = Boolean(data.isActive);
  }

  return await prisma.category.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

/**
 * Count products associated with a category
 */
const countCategoryProducts = async (categoryId) => {
  return await prisma.product.count({
    where: { categoryId },
  });
};

/**
 * Delete a category record by ID
 */
const deleteCategory = async (id) => {
  return await prisma.category.delete({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  });
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getActiveCategoryById,
  getCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  countCategoryProducts,
};

