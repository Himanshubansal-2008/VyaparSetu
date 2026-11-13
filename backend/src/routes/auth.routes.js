const express = require("express");
const router = express.Router();
const { getAuthStatus, getProfile } = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Public authentication health & foundation status
router.get("/status", getAuthStatus);

// Protected route to verify authentication middleware foundation
router.get("/profile", authenticate, getProfile);

// Foundation routes ready for Signup and Login in subsequent phases
// router.post("/signup", validateSignup, signup);
// router.post("/login", validateLogin, login);

module.exports = router;

