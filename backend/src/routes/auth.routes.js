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
const {
  authenticateUser,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

// Public authentication health & foundation status
router.get("/status", getAuthStatus);

// Public User Registration
router.post("/signup", validateSignup, signup);

// Public User Login
router.post("/login", validateLogin, login);

// Protected User Profile
router.get("/profile", authenticateUser, getProfile);

// Role-Protected Demonstration Endpoints
router.get(
  "/seller-only",
  authenticateUser,
  authorizeRoles("SELLER"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Seller resource accessed successfully",
      user: req.user,
    });
  }
);

router.get(
  "/admin-only",
  authenticateUser,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin resource accessed successfully",
      user: req.user,
    });
  }
);

module.exports = router;
