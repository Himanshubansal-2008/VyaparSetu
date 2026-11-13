const authService = require("../services/auth.service");

/**
 * GET /api/auth/profile
 * Returns the currently authenticated user's profile.
 * Protected by authenticate middleware.
 */
const getProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: req.user,
    });
  } catch (error) {
    console.error("[Auth Controller] Error in getProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile.",
    });
  }
};

/**
 * GET /api/auth/status
 * Authentication service health check / foundation status.
 */
const getAuthStatus = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "VyaparSetu Authentication module is ready",
    status: {
      passwordHashing: "bcryptjs (12 rounds) configured",
      jwt: "JWT authentication configured",
      middleware: "Bearer token verification ready",
    },
  });
};

module.exports = {
  getProfile,
  getAuthStatus,
};

