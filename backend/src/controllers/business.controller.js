const businessService = require("../services/business.service");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

// POST /api/businesses - Create a new business profile
const createBusiness = async (req, res) => {
  try {
    const body = req.body || {};
    const headerUserId = req.headers["x-user-id"];

    const ownerId = body.ownerId || body.userId || headerUserId || req.user?.id;

    if (!ownerId || typeof ownerId !== "string" || !UUID_REGEX.test(ownerId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid owner ID (x-user-id header or ownerId field) is required to register a business",
      });
    }

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Business name is required",
      });
    }

    const business = await businessService.createBusiness({
      name: body.name,
      ownerId: ownerId.trim(),
      description: body.description,
      category: body.category,
      address: body.address || body.streetAddress,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      phone: body.phone || body.contactNumber,
      email: body.email,
    });

    return res.status(201).json({
      success: true,
      message: "Business profile created successfully",
      data: business,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        ...(error.business ? { data: error.business } : {}),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create business profile",
    });
  }
};

// GET /api/businesses/me - Retrieve current seller's business profile
const getMyBusiness = async (req, res) => {
  try {
    const headerUserId = req.headers["x-user-id"];
    const queryUserId = req.query?.userId;
    const ownerId = req.user?.id || headerUserId || queryUserId;

    if (!ownerId || typeof ownerId !== "string" || !UUID_REGEX.test(ownerId.trim())) {
      return res.status(400).json({
        success: false,
        message: "Valid User ID (x-user-id header) is required to retrieve your business profile",
      });
    }

    const business = await businessService.getBusinessByOwnerId(ownerId.trim());

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "No business profile found for this user",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Business profile fetched successfully",
      data: business,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch business profile",
    });
  }
};

// GET /api/businesses/:id - Retrieve public business profile by ID
const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !UUID_REGEX.test(id.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid business ID format",
      });
    }

    const business = await businessService.getBusinessById(id.trim());

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Business fetched successfully",
      data: business,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch business",
    });
  }
};

// PUT /api/businesses/:id - Update business profile
const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !UUID_REGEX.test(id.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid business ID format",
      });
    }

    const body = req.body || {};
    const headerUserId = req.headers["x-user-id"];
    const requesterId = req.user?.id || headerUserId || body.ownerId || body.userId;

    const updated = await businessService.updateBusiness(
      id.trim(),
      {
        name: body.name,
        description: body.description,
        category: body.category,
        address: body.address || body.streetAddress,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        phone: body.phone || body.contactNumber,
        email: body.email,
      },
      requesterId
    );

    return res.status(200).json({
      success: true,
      message: "Business profile updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update business profile",
    });
  }
};

module.exports = {
  createBusiness,
  getMyBusiness,
  getBusinessById,
  updateBusiness,
};

