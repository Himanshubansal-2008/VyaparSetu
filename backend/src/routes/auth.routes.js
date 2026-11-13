const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  getAuthStatus,
  getProfile,
} = require("../controllers/auth.controller");
const {
  validateSignup,
  validateLogin,
} = require("../middlewares/auth.validator");
const { authenticate } = require("../middlewares/auth.middleware");

// Public authentication health & foundation status
router.get("/status", getAuthStatus);

// Public User Registration
router.post("/signup", validateSignup, signup);

// Public User Login
router.post("/login", validateLogin, login);

// Protected user profile
router.get("/profile", authenticate, getProfile);

module.exports = router;
