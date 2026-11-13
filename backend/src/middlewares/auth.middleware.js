const prisma = require("../lib/prisma");
const { verifyToken, extractBearerToken } = require("../utils/token.utils");

/**
 * Standard select definition for authenticated user context (strictly excludes passwordHash)
 */
const AUTH_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  business: {
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
    },
  },
  createdAt: true,
  updatedAt: true,
};

/**
 * Authentication middleware that verifies JWT Bearer tokens and attaches sanitized user to req.user.
 *
 * Responds with standard HTTP 401 on missing, expired, or invalid tokens.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Missing Authorization header.",
      });
    }

    const token = extractBearerToken(authHeader);
    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid authorization format. Format must be "Bearer <token>".',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Authentication token has expired. Please log in again.",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Malformed token: missing user identifier.",
      });
    }

    // Retrieve active user from database without passwordHash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists.",
      });
    }

    // Attach sanitized user context to request
    req.user = user;
    next();
  } catch (error) {
    console.error("[Auth Middleware] Unexpected error during authentication:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication verification.",
    });
  }
};

/**
 * Role-based authorization middleware.
 * Ensures the authenticated user possesses one of the allowed roles.
 * Supports BUYER, SELLER, BOTH, ADMIN.
 *
 * @param  {...string} allowedRoles - List of allowed roles (e.g. 'ADMIN', 'SELLER')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before checking permissions.",
      });
    }

    const userRole = req.user.role;

    // ADMIN has universal permission; BOTH acts as both BUYER and SELLER
    const hasRole =
      allowedRoles.includes(userRole) ||
      userRole === "ADMIN" ||
      (userRole === "BOTH" && (allowedRoles.includes("BUYER") || allowedRoles.includes("SELLER")));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission to access this resource.",
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware:
 * Attaches req.user if a valid token is provided, but continues without error if no token is present.
 */
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    const userId = decoded.id || decoded.userId;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: AUTH_USER_SELECT,
      });
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Gracefully ignore token errors for optional auth
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuthenticate,
  AUTH_USER_SELECT,
};

