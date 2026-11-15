const express = require("express");
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  streamNotifications,
} = require("../controllers/notification.controller");

// Route mappings for /api/notifications
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/stream", streamNotifications);

// Bulk mark all read
router.patch("/mark-all-read", markAllAsRead);
router.put("/mark-all-read", markAllAsRead);
router.post("/mark-all-read", markAllAsRead);

// Single notification operations
router.patch("/:id/read", markAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
