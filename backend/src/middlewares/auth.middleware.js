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
 * Reusable JWT authentication middleware.
 * Verifies Bearer tokens, confirms user existence in PostgreSQL,
 * and attaches sanitized user information (id, userId, role, name, email) to req.user.
 *
 * Responses:
 * - Missing Authorization header / missing Bearer token -> HTTP 401 ("Authentication required")
 * - Expired, malformed, invalid signature, or deleted user -> HTTP 401 ("Invalid or expired token")
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = extractBearerToken(authHeader);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      // Discard specific internal JWT verification error details for security
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const userId = decoded.userId || decoded.id;
    if (!userId || typeof userId !== "string") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Verify user exists in database and retrieve active sanitized profile (no passwordHash)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: AUTH_USER_SELECT,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Attach verified user information to Express request
    req.user = {
      id: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      business: user.business,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    next();
  } catch (error) {
    // Unhandled system errors (e.g. database connection drop)
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication verification.",
    });
  }
};

/**
 * Reusable role-based authorization middleware.
 * Enforces role restrictions after authenticateUser runs.
 *
 * @param {...string} allowedRoles - Permitted roles (e.g. 'ADMIN', 'SELLER')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role;

    // ADMIN has universal permission; BOTH qualifies for both BUYER and SELLER
    const hasPermission =
      allowedRoles.includes(userRole) ||
      userRole === "ADMIN" ||
      (userRole === "BOTH" &&
        (allowedRoles.includes("BUYER") || allowedRoles.includes("SELLER")));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission to access this resource",
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware:
 * Attaches req.user if a valid token is present, but continues without error if omitted.
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
    const userId = decoded.userId || decoded.id;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: AUTH_USER_SELECT,
      });
      if (user) {
        req.user = {
          id: user.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          business: user.business,
        };
      }
    }
  } catch (err) {
    // Gracefully ignore token errors for optional auth
  }

  next();
};

module.exports = {
  authenticateUser,
  authorizeRoles,
  optionalAuthenticate,
  AUTH_USER_SELECT,
  // Backward compatibility aliases
  authenticate: authenticateUser,
  authorize: authorizeRoles,
};
