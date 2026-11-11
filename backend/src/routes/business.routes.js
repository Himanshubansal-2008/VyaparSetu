
const express = require("express");
const businessController = require("../controllers/business.controller");

const router = express.Router();

router.get("/", businessController.getBusinesses);

module.exports = router;

