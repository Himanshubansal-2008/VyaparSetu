const userService = require("../services/user.service");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

// POST /api/users/init and POST /api/users - Initialize or retrieve a user
const initUser = async (req, res) => {
  try {
    const { userId, name, email, phone } = req.body || {};
    const headerUserId = req.headers["x-user-id"];

    const effectiveUserId = userId || headerUserId;

    const result = await userService.initOrGetUser({
      userId: effectiveUserId,
      name,
      email,
      phone,
    });

    return res.status(result.isNew ? 201 : 200).json({
      success: true,
      message: result.isNew ? "User initialized successfully" : "User session retrieved successfully",
      data: result.user,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email already registered to another user",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to initialize user session",
    });
  }
};

// GET /api/users/me - Retrieve current user profile from context
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      const headerUserId = req.headers["x-user-id"];
      if (headerUserId && UUID_REGEX.test(headerUserId.trim())) {
        const found = await userService.getUserById(headerUserId.trim());
        if (found) {
          return res.status(200).json({
            success: true,
            message: "User profile fetched successfully",
            data: found,
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: req.user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
    });
  }
};

// GET /api/users/:id - Retrieve user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !UUID_REGEX.test(id.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await userService.getUserById(id.trim());

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

module.exports = {
  initUser,
  getCurrentUser,
  getUserById,
};

