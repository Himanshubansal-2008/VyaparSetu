const express = require("express");
const router = express.Router();
const {
  initUser,
  getCurrentUser,
  getUserById,
} = require("../controllers/user.controller");

// Route mappings for /api/users
router.post("/init", initUser);
router.post("/", initUser);
router.get("/me", getCurrentUser);
router.get("/:id", getUserById);

module.exports = router;

