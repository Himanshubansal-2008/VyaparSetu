const notificationService = require("../services/notification.service");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

const getRequestUserId = (req) => {
  const id = req.user?.id || req.user?.userId || req.headers["x-user-id"];
  if (id && typeof id === "string" && UUID_REGEX.test(id.trim())) {
    return id.trim();
  }
  return null;
};

// GET /api/notifications - Fetch paginated notifications for current user
const getNotifications = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access notifications",
      });
    }

    const { page, limit, isRead } = req.query;
    const result = await notificationService.getUserNotifications(userId, {
      page,
      limit,
      isRead,
    });

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("[notification.controller] Fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

// GET /api/notifications/unread-count - Fetch total unread notifications count
const getUnreadCount = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access notification count",
      });
    }

    const unreadCount = await notificationService.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      message: "Unread notification count fetched successfully",
      data: { unreadCount },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("[notification.controller] Count error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch unread notification count",
    });
  }
};

// PATCH /api/notifications/:id/read - Mark single notification as read
const markAsRead = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to update notification",
      });
    }

    const { id } = req.params;
    const updated = await notificationService.markAsRead(id, userId);

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: updated,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("[notification.controller] Mark as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

// PATCH /api/notifications/mark-all-read - Mark all notifications as read for current user
const markAllAsRead = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to update notifications",
      });
    }

    const result = await notificationService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: `Marked ${result.updatedCount} notifications as read`,
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("[notification.controller] Mark all as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};

// DELETE /api/notifications/:id - Delete a notification
const deleteNotification = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to delete notification",
      });
    }

    const { id } = req.params;
    const result = await notificationService.deleteNotification(id, userId);

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("[notification.controller] Delete error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

// GET /api/notifications/stream - Server-Sent Events (SSE) for real-time notification push
const streamNotifications = async (req, res) => {
  const userId = getRequestUserId(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required for notification stream",
    });
  }

  // Set SSE response headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`data: ${JSON.stringify({ type: "CONNECTED", userId })}\n\n`);

  // Subscribe to real-time events for this user
  const unsubscribe = notificationService.subscribeUserNotifications(userId, (notification) => {
    try {
      res.write(`data: ${JSON.stringify({ type: "NEW_NOTIFICATION", notification })}\n\n`);
    } catch (err) {
      console.warn("[notification.controller] Stream write error:", err.message);
    }
  });

  // Keep connection alive with periodic ping every 30s
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(": keep-alive\n\n");
    } catch (e) {
      clearInterval(keepAliveInterval);
    }
  }, 30000);

  req.on("close", () => {
    clearInterval(keepAliveInterval);
    unsubscribe();
    res.end();
  });
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  streamNotifications,
};
