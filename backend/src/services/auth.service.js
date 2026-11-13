const prisma = require("../lib/prisma");
const { hashPassword, comparePassword } = require("../utils/password.utils");
const { generateToken, verifyToken } = require("../utils/token.utils");

/**
 * Sanitizes a User entity by removing sensitive fields (passwordHash).
 *
 * @param {Object} user - User record from Prisma
 * @returns {Object} Sanitized user record
 */
const sanitizeUser = (user) => {
  if (!user || typeof user !== "object") return null;
  const { passwordHash, ...sanitized } = user;
  return sanitized;
};

/**
 * Validates whether an email format is syntactically sound.
 *
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Finds an active user by email address.
 *
 * @param {string} email - User email
 * @param {boolean} [includeHash=false] - Whether to include passwordHash (internal authentication only)
 * @returns {Promise<Object|null>}
 */
const findUserByEmail = async (email, includeHash = false) => {
  if (!email || typeof email !== "string") return null;

  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      passwordHash: includeHash,
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
    },
  });
};

/**
 * Finds a user by ID.
 *
 * @param {string} id - User UUID
 * @returns {Promise<Object|null>}
 */
const findUserById = async (id) => {
  if (!id || typeof id !== "string") return null;

  return prisma.user.findUnique({
    where: { id: id.trim() },
    select: {
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
    },
  });
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  sanitizeUser,
  isValidEmail,
  findUserByEmail,
  findUserById,
};

