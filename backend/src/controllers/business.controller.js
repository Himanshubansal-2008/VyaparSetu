
const businessService = require("../services/business.service");

const getBusinesses = async (req, res) => {
  try {
    const businesses = await businessService.getBusinesses();

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      data: businesses,
    });
  } catch (error) {
    console.error("Get businesses error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch businesses",
    });
  }
};

module.exports = {
  getBusinesses,
};
