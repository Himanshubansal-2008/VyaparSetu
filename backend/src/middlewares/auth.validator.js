/**
 * Input Validation Middleware for Authentication APIs
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

/**
 * Validates request payload for POST /api/auth/signup
 */
const validateSignup = (req, res, next) => {
  const body = req.body;
  const errors = [];

  if (!body || typeof body !== "object") {
    return res.status(400).json({
      success: false,
      message: "Request body must be a valid JSON object.",
      errors: [{ field: "body", message: "Request body cannot be empty" }],
    });
  }

  // 1. Never accept passwordHash from client
  if (body.passwordHash !== undefined) {
    return res.status(400).json({
      success: false,
      message: "Directly specifying passwordHash is not permitted.",
      errors: [
        {
          field: "passwordHash",
          message: "passwordHash cannot be submitted by the client",
        },
      ],
    });
  }

  // 2. Reject attempts to assign ADMIN role or arbitrary roles via public signup
  if (body.role !== undefined) {
    const requestedRole = String(body.role).trim().toUpperCase();
    if (requestedRole === "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Assigning the ADMIN role during public signup is strictly prohibited.",
        errors: [
          {
            field: "role",
            message: "Cannot register as ADMIN via public signup",
          },
        ],
      });
    }
  }

  // 3. Name validation
  if (body.name === undefined || body.name === null || typeof body.name !== "string") {
    errors.push({ field: "name", message: "Name is required and must be a string." });
  } else {
    const trimmedName = body.name.trim();
    if (trimmedName.length === 0) {
      errors.push({ field: "name", message: "Name cannot be empty." });
    } else if (trimmedName.length > 100) {
      errors.push({ field: "name", message: "Name cannot exceed 100 characters." });
    }
  }

  // 4. Email validation
  if (body.email === undefined || body.email === null || typeof body.email !== "string") {
    errors.push({ field: "email", message: "Email is required and must be a string." });
  } else {
    const trimmedEmail = body.email.trim();
    if (trimmedEmail.length === 0) {
      errors.push({ field: "email", message: "Email cannot be empty." });
    } else if (trimmedEmail.length > 255) {
      errors.push({ field: "email", message: "Email cannot exceed 255 characters." });
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.push({ field: "email", message: "Please enter a valid email address." });
    }
  }

  // 5. Password validation
  if (body.password === undefined || body.password === null || typeof body.password !== "string") {
    errors.push({ field: "password", message: "Password is required." });
  } else {
    if (body.password.length < 8) {
      errors.push({
        field: "password",
        message: "Password must be at least 8 characters long.",
      });
    } else if (body.password.length > 128) {
      errors.push({
        field: "password",
        message: "Password cannot exceed 128 characters.",
      });
    }
  }

  // 6. Confirm Password validation
  if (
    body.confirmPassword === undefined ||
    body.confirmPassword === null ||
    typeof body.confirmPassword !== "string"
  ) {
    errors.push({
      field: "confirmPassword",
      message: "Confirm password is required.",
    });
  } else if (body.password && body.password !== body.confirmPassword) {
    errors.push({
      field: "confirmPassword",
      message: "Passwords do not match.",
    });
  }

  // 7. Phone validation (required and unique mobile number)
  if (body.phone === undefined || body.phone === null || String(body.phone).trim() === "") {
    errors.push({ field: "phone", message: "Mobile number is required." });
  } else if (typeof body.phone !== "string") {
    errors.push({ field: "phone", message: "Mobile number must be a string." });
  } else {
    const trimmedPhone = body.phone.trim().replace(/[\s-]/g, "");
    if (!PHONE_REGEX.test(trimmedPhone)) {
      errors.push({
        field: "phone",
        message: "Mobile number must be a valid 10 to 15 digit number.",
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0].message,
      errors,
    });
  }

  next();
};

/**
 * Validates request payload for POST /api/auth/login
 */
const validateLogin = (req, res, next) => {
  const body = req.body;
  const errors = [];

  if (!body || typeof body !== "object") {
    return res.status(400).json({
      success: false,
      message: "Request body must be a valid JSON object.",
      errors: [{ field: "body", message: "Request body cannot be empty" }],
    });
  }

  // Reject unauthorized security parameters
  if (body.passwordHash !== undefined) {
    return res.status(400).json({
      success: false,
      message: "Directly specifying passwordHash is not permitted.",
      errors: [{ field: "passwordHash", message: "Invalid field in login request" }],
    });
  }

  if (body.role !== undefined) {
    return res.status(400).json({
      success: false,
      message: "Specifying role during login is not permitted.",
      errors: [{ field: "role", message: "Invalid field in login request" }],
    });
  }

  // 1. Email validation
  if (body.email === undefined || body.email === null || typeof body.email !== "string") {
    errors.push({ field: "email", message: "Email is required." });
  } else {
    const trimmedEmail = body.email.trim();
    if (trimmedEmail.length === 0) {
      errors.push({ field: "email", message: "Email cannot be empty." });
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.push({ field: "email", message: "Please enter a valid email address." });
    } else {
      // Normalize email in request body
      req.body.email = trimmedEmail.toLowerCase();
    }
  }

  // 2. Password validation
  if (body.password === undefined || body.password === null || typeof body.password !== "string") {
    errors.push({ field: "password", message: "Password is required." });
  } else if (body.password.length === 0) {
    errors.push({ field: "password", message: "Password cannot be empty." });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors[0].message,
      errors,
    });
  }

  next();
};

module.exports = {
  validateSignup,
  validateLogin,
};
