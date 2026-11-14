/**
 * Client-Side Validation Utilities for Authentication & Forms
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE_REGEX = /^(?:\+91|0)?[6-9]\d{9}$/;
const VALID_NAME_CHARS_REGEX = /^[a-zA-Z\s'.-]+$/;
const HAS_LETTER_REGEX = /[a-zA-Z]/;
const HAS_UPPERCASE_REGEX = /[A-Z]/;
const HAS_LOWERCASE_REGEX = /[a-z]/;
const HAS_NUMBER_REGEX = /[0-9]/;

/**
 * Validates full name.
 * - Required.
 * - Non-empty after trimming.
 * - Must contain letters and cannot consist of only numbers or special characters.
 */
export const validateFullName = (name) => {
  if (name === undefined || name === null) {
    return 'Full name is required.';
  }
  const trimmed = String(name).trim();
  if (trimmed.length === 0) {
    return 'Full name is required.';
  }
  if (!HAS_LETTER_REGEX.test(trimmed) || !VALID_NAME_CHARS_REGEX.test(trimmed)) {
    return 'Name must contain letters and cannot consist of only numbers or special characters.';
  }
  if (trimmed.length < 2) {
    return 'Full name must be at least 2 characters long.';
  }
  if (trimmed.length > 100) {
    return 'Full name cannot exceed 100 characters.';
  }
  return null;
};

/**
 * Validates email address.
 * - Required.
 * - Trimmed and checked for standard email format.
 */
export const validateEmail = (email) => {
  if (email === undefined || email === null) {
    return 'Email address is required.';
  }
  const trimmed = String(email).trim();
  if (trimmed.length === 0) {
    return 'Email address is required.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  if (trimmed.length > 255) {
    return 'Email address cannot exceed 255 characters.';
  }
  return null;
};

/**
 * Validates phone number.
 * - Required.
 * - Must match a valid 10-digit Indian mobile number (e.g. 9876543210 or +919876543210).
 */
export const validatePhone = (phone) => {
  if (phone === undefined || phone === null) {
    return 'Mobile number is required.';
  }
  const trimmed = String(phone).trim();
  if (trimmed.length === 0) {
    return 'Mobile number is required.';
  }
  const cleaned = trimmed.replace(/[\s-]/g, '');
  if (!INDIAN_PHONE_REGEX.test(cleaned)) {
    return 'Please enter a valid 10-digit Indian mobile number.';
  }
  return null;
};

/**
 * Validates password.
 * - Required.
 * - Minimum 8 characters.
 * - Must contain at least one uppercase letter, one lowercase letter, and one number.
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (password.length > 128) {
    return 'Password cannot exceed 128 characters.';
  }
  const hasUpper = HAS_UPPERCASE_REGEX.test(password);
  const hasLower = HAS_LOWERCASE_REGEX.test(password);
  const hasNum = HAS_NUMBER_REGEX.test(password);

  if (!hasUpper || !hasLower || !hasNum) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
  }
  return null;
};

/**
 * Validates confirm password.
 * - Required.
 * - Must exactly match password.
 */
export const validateConfirmPassword = (confirmPassword, password) => {
  if (!confirmPassword || typeof confirmPassword !== 'string') {
    return 'Confirm password is required.';
  }
  if (confirmPassword !== password) {
    return 'Passwords do not match.';
  }
  return null;
};

/**
 * Validates complete signup form data.
 * Returns an object containing error messages mapped by field name,
 * and a boolean isValid indicator.
 */
export const validateSignupForm = (formData) => {
  const { name, email, phone, password, confirmPassword } = formData || {};
  const errors = {};

  const nameError = validateFullName(name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(phone);
  if (phoneError) errors.phone = phoneError;

  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;

  const confirmPasswordError = validateConfirmPassword(confirmPassword, password);
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Prepares sanitized payload for signup submission.
 * - Trims name and email.
 * - Converts email to lowercase.
 * - Cleans phone or sets to null if omitted.
 * - Leaves password and confirmPassword untrimmed and unmodified.
 */
export const prepareSignupPayload = (formData) => {
  const { name, email, phone, password, confirmPassword } = formData || {};
  const trimmedPhone = phone ? String(phone).trim().replace(/[\s-]/g, '') : '';

  // Extract last 10 digits for Indian standard if prefixed with +91 or 0
  let normalizedPhone = null;
  if (trimmedPhone.length > 0) {
    const match = trimmedPhone.match(/([6-9]\d{9})$/);
    normalizedPhone = match ? match[1] : trimmedPhone;
  }

  return {
    name: name ? String(name).trim() : '',
    email: email ? String(email).trim().toLowerCase() : '',
    phone: normalizedPhone,
    password: password || '',
    confirmPassword: confirmPassword || '',
  };
};

export default {
  validateFullName,
  validateEmail,
  validatePhone,
  validatePassword,
  validateConfirmPassword,
  validateSignupForm,
  prepareSignupPayload,
};

