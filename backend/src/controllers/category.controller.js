const prisma = require("../lib/prisma");

// GET /api/categories - Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
};

// GET /api/categories/:id - Get category by ID
const getCategoryById = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "getCategoryById controller placeholder - not implemented yet",
  });
};

// POST /api/categories - Create a category
const createCategory = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "createCategory controller placeholder - not implemented yet",
  });
};

// PUT /api/categories/:id - Update a category
const updateCategory = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "updateCategory controller placeholder - not implemented yet",
  });
};

// DELETE /api/categories/:id - Delete a category
const deleteCategory = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "deleteCategory controller placeholder - not implemented yet",
  });
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

