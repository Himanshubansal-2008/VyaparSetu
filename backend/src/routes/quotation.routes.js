const express = require("express");
const router = express.Router();
const {
  createQuotation,
  getBuyerQuotations,
  getSellerQuotations,
  getQuotationById,
  respondToQuotation,
  submitBuyerCounter,
  acceptQuotation,
  rejectQuotation,
  convertToOrder,
} = require("../controllers/quotation.controller");

// Specific path routes first to prevent collision with parameterized :id
router.get("/buyer", getBuyerQuotations);
router.get("/seller", getSellerQuotations);

// Core CRUD and actions
router.post("/", createQuotation);
router.get("/:id", getQuotationById);
router.post("/:id/respond", respondToQuotation);
router.post("/:id/buyer-counter", submitBuyerCounter);
router.post("/:id/accept", acceptQuotation);
router.post("/:id/reject", rejectQuotation);
router.post("/:id/convert-to-order", convertToOrder);

module.exports = router;

