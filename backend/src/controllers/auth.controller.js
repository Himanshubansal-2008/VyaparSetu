const authService = require("../services/auth.service");
const { generateToken } = require("../utils/token.utils");

/**
 * POST /api/auth/signup
 * Registers a new user account with hashed password and BUYER role.
 */
const signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const user = await authService.registerUser({
      name,
      email,
      phone,
      password,
    });

    const token = generateToken({
      userId: user.id,
      id: user.id,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        field: error.field || null,
      });
    }

    console.error("[Auth Controller] Unexpected signup error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while creating your account.",
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticates user credentials and issues a signed JWT token.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.loginUser({
      email,
      password,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        field: error.field || null,
      });
    }

    console.error("[Auth Controller] Unexpected login error:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during login.",
    });
  }
};

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
  signup,
  login,
  getProfile,
  getAuthStatus,
};
