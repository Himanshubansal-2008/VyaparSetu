const jwt = require("jsonwebtoken");

/**
 * Retrieves and validates the JWT secret from environment variables.
 * Throws a descriptive error if the secret is missing.
 *
 * @returns {string} The JWT secret key
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== "string" || !secret.trim()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[Security] JWT_SECRET environment variable is strictly required in production."
      );
    }
    throw new Error(
      "[Config] JWT_SECRET environment variable is missing. Please define JWT_SECRET in your .env file."
    );
  }
  return secret.trim();
};

/**
 * Retrieves the token expiration duration from environment variables (defaults to 7d).
 *
 * @returns {string} Token expiration duration
 */
const getJwtExpiresIn = () => {
  return process.env.JWT_EXPIRES_IN ? String(process.env.JWT_EXPIRES_IN).trim() : "7d";
};

/**
 * Generates a signed JWT token for the specified user payload.
 *
 * @param {Object} payload - User claims to embed in the token (e.g. { id, email, role })
 * @param {Object} [options] - Additional JWT sign options (overrides expiresIn, etc.)
 * @returns {string} Signed JWT token string
 */
const generateToken = (payload, options = {}) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Token payload must be a non-empty object.");
  }

  const secret = getJwtSecret();
  const expiresIn = options.expiresIn || getJwtExpiresIn();

  return jwt.sign(payload, secret, {
    expiresIn,
    ...options,
  });
};

/**
 * Verifies and decodes a signed JWT token.
 * Throws an error if the token is invalid, tampered with, or expired.
 *
 * @param {string} token - JWT token string
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  if (!token || typeof token !== "string" || !token.trim()) {
    throw new Error("Token must be a non-empty string.");
  }

  const secret = getJwtSecret();
  return jwt.verify(token.trim(), secret);
};

/**
 * Extracts a Bearer token from an HTTP Authorization header.
 *
 * @param {string} authHeader - Content of Authorization header (e.g. "Bearer eyJhbGciOi...")
 * @returns {string|null} The raw JWT string, or null if missing or not Bearer format
 */
const extractBearerToken = (authHeader) => {
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const trimmed = authHeader.trim();
  if (!trimmed.startsWith("Bearer ") && !trimmed.startsWith("bearer ")) {
    return null;
  }

  const token = trimmed.slice(7).trim();
  return token || null;
};

module.exports = {
  getJwtSecret,
  getJwtExpiresIn,
  generateToken,
  verifyToken,
  extractBearerToken,
};

