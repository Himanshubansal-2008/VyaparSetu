const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

/**
 * Hashes a plain text password using bcrypt with 12 salt rounds.
 *
 * @param {string} plainTextPassword - Plain text password
 * @returns {Promise<string>} Securely hashed password
 */
const hashPassword = async (plainTextPassword) => {
  if (
    !plainTextPassword ||
    typeof plainTextPassword !== "string" ||
    plainTextPassword.length === 0
  ) {
    throw new Error("Password must be a non-empty string.");
  }

  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
};

/**
 * Compares a plain text candidate password with an existing bcrypt password hash.
 *
 * @param {string} plainTextPassword - Candidate plain text password
 * @param {string} hashedPassword - Stored bcrypt password hash
 * @returns {Promise<boolean>} True if match, false otherwise
 */
const comparePassword = async (plainTextPassword, hashedPassword) => {
  if (!plainTextPassword || typeof plainTextPassword !== "string") {
    return false;
  }
  if (!hashedPassword || typeof hashedPassword !== "string") {
    return false;
  }

  return bcrypt.compare(plainTextPassword, hashedPassword);
};

module.exports = {
  SALT_ROUNDS,
  hashPassword,
  comparePassword,
};

