const categoryService = require("../services/category.service");

// GET /api/categories - Return all active categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// GET /api/categories/:id - Return a category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const category = await categoryService.getCategoryById(id.trim());

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

// POST /api/categories - Create a new category
const createCategory = async (req, res) => {
  try {
    const { name, description, imageUrl, isActive } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const trimmedName = name.trim();

    // Check for duplicate category name
    const existing = await categoryService.getCategoryByName(trimmedName);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const newCategory = await categoryService.createCategory({
      name: trimmedName,
      description,
      imageUrl,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

// PUT /api/categories/:id - Update an existing category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const categoryId = id.trim();
    const existing = await categoryService.getCategoryById(categoryId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const { name, description, imageUrl, isActive } = req.body || {};

    if (
      name === undefined &&
      description === undefined &&
      imageUrl === undefined &&
      isActive === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one valid field to update must be provided",
      });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty",
        });
      }

      const trimmedName = name.trim();
      if (trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
        const conflict = await categoryService.getCategoryByName(trimmedName);
        if (conflict && conflict.id !== categoryId) {
          return res.status(409).json({
            success: false,
            message: "Category with this name already exists",
          });
        }
      }
    }

    const updatedCategory = await categoryService.updateCategory(categoryId, {
      name,
      description,
      imageUrl,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Category with this name already exists",
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

// DELETE /api/categories/:id - Delete an existing category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const categoryId = id.trim();
    const existing = await categoryService.getCategoryById(categoryId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const deleted = await categoryService.deleteCategory(categoryId);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: deleted,
    });
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category associated with existing products",
      });
    }
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
