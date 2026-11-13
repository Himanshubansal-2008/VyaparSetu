const prisma = require("../lib/prisma");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lightweight client identity extraction middleware.
 * Reads 'x-user-id' and 'x-business-id' from incoming request headers or query/body fallbacks.
 * Attaches resolved user and business to req.user and req.business.
 * 
 * NOTE: As noted in project architecture, client-supplied headers are for lightweight
 * routing and persistence matching, not cryptographic proof of identity.
 */
const extractClientIdentity = async (req, res, next) => {
  try {
    let rawUserId =
      req.headers["x-user-id"] ||
      req.query?.userId ||
      req.body?.userId ||
      req.body?.ownerId;

    if (!rawUserId && req.headers.authorization) {
      try {
        const { extractBearerToken, verifyToken } = require("../utils/token.utils");
        const token = extractBearerToken(req.headers.authorization);
        if (token) {
          const decoded = verifyToken(token);
          if (decoded && (decoded.userId || decoded.id)) {
            rawUserId = decoded.userId || decoded.id;
          }
        }
      } catch (tokenErr) {
        // Optional fallback: ignore invalid or expired tokens in passive identity extraction
      }
    }

    if (rawUserId && typeof rawUserId === "string" && UUID_REGEX.test(rawUserId.trim())) {
      const cleanUserId = rawUserId.trim();
      const user = await prisma.user.findUnique({
        where: { id: cleanUserId },
        include: { business: true },
      });
      if (user) {
        req.user = user;
        if (user.business) {
          req.business = user.business;
        }
      }
    }

    // Explicit business ID override if provided in header
    const rawBusinessId = req.headers["x-business-id"] || req.query?.businessId;
    if (rawBusinessId && typeof rawBusinessId === "string" && UUID_REGEX.test(rawBusinessId.trim())) {
      const cleanBizId = rawBusinessId.trim();
      if (!req.business || req.business.id !== cleanBizId) {
        const business = await prisma.business.findUnique({
          where: { id: cleanBizId },
        });
        if (business) {
          req.business = business;
        }
      }
    }

    next();
  } catch (err) {
    console.warn("[clientIdentity] Identity resolution warning:", err?.message);
    next();
  }
};

/**
 * Middleware ensuring a valid user exists in request context
 */
const requireUser = (req, res, next) => {
  if (!req.user) {
    return res.status(400).json({
      success: false,
      message: "Valid User ID (x-user-id header) is required for this operation",
    });
  }
  next();
};

/**
 * Middleware ensuring a valid business profile exists in request context
 */
const requireBusiness = (req, res, next) => {
  if (!req.business) {
    return res.status(403).json({
      success: false,
      message: "A valid Business Profile is required to access seller operations",
    });
  }
  next();
};

module.exports = {
  UUID_REGEX,
  extractClientIdentity,
  requireUser,
  requireBusiness,
};

