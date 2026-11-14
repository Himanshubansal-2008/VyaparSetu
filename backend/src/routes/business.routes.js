
const express = require("express");
const router = express.Router();

const {
  getBusinesses,
  createBusiness,
  getMyBusiness,
  getBusinessById,
  updateBusiness,
} = require("../controllers/business.controller");

// Route mappings for /api/businesses
router.get("/", getBusinesses);
router.post("/", createBusiness);
router.get("/me", getMyBusiness);
router.get("/:id", getBusinessById);
router.put("/:id", updateBusiness);

module.exports = router;
