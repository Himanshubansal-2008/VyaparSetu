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

/**
 * Registers a new user with hashed password and BUYER role.
 *
 * @param {Object} userData
 * @param {string} userData.name
 * @param {string} userData.email
 * @param {string} [userData.phone]
 * @param {string} userData.password
 * @returns {Promise<Object>} The created user (excluding passwordHash)
 */
const registerUser = async ({ name, email, phone, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();
  const normalizedPhone =
    phone !== undefined && phone !== null && String(phone).trim() !== ""
      ? String(phone).trim()
      : null;

  // 1. Check if an account already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash password with bcryptjs (12 salt rounds)
  const hashedPassword = await hashPassword(password);

  // 3. Create user in database with default BUYER role
  try {
    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash: hashedPassword,
        role: "BUYER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    // Handle race conditions on unique email constraint
    if (error.code === "P2002") {
      const conflictError = new Error("An account with this email already exists.");
      conflictError.statusCode = 409;
      throw conflictError;
    }
    throw error;
  }
};

/**
 * Authenticates a user with email and password, returning a signed JWT token and sanitized user.
 *
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{ token: string, user: Object }>}
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Find user by normalized email including passwordHash
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      passwordHash: true,
    },
  });

  // 2. Uniform error message to prevent user enumeration
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // 3. Verify password hash using bcryptjs
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // 4. Generate signed JWT token with minimal, secure claims
  const token = generateToken({
    userId: user.id,
    id: user.id,
    role: user.role,
  });

  // 5. Return token and strictly sanitized user object (passwordHash excluded)
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  };
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
  registerUser,
  loginUser,
};
