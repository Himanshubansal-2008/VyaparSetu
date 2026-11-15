const { EventEmitter } = require("events");
const prisma = require("../lib/prisma");
const { UUID_REGEX } = require("../middlewares/clientIdentity");

const notificationEmitter = new EventEmitter();
// Increase listener limit to support multiple concurrent clients/SSE connections
notificationEmitter.setMaxListeners(100);

class NotificationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "NotificationError";
    this.statusCode = statusCode;
  }
}

/**
 * Standard notification types supported across VyaparSetu
 */
const NOTIFICATION_TYPES = {
  ORDER_PLACED: "ORDER_PLACED",
  ORDER_ACCEPTED: "ORDER_ACCEPTED",
  ORDER_REJECTED: "ORDER_REJECTED",
  ORDER_DISPATCHED: "ORDER_DISPATCHED",
  ORDER_DELIVERED: "ORDER_DELIVERED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  QUOTATION_REQUEST: "QUOTATION_REQUEST",
  QUOTATION_RESPONSE: "QUOTATION_RESPONSE",
  QUOTATION_COUNTER: "QUOTATION_COUNTER",
  QUOTATION_ACCEPTED: "QUOTATION_ACCEPTED",
  QUOTATION_REJECTED: "QUOTATION_REJECTED",
  CHAT_MESSAGE: "CHAT_MESSAGE",
  LOW_STOCK: "LOW_STOCK",
};

/**
 * Creates a notification in PostgreSQL and emits a real-time event.
 * Can participate in an outer Prisma transaction when `tx` is provided.
 *
 * @param {Object} data - Notification fields
 * @param {string} data.userId - Recipient user UUID
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification message
 * @param {string} data.type - Notification type
 * @param {string} [data.entityId] - Related entity ID (orderId, quotationId, productId, conversationId)
 * @param {string} [data.entityType] - Related entity type (ORDER, QUOTATION, PRODUCT, CHAT)
 * @param {Object} [data.metadata] - Optional additional JSON details
 * @param {Object} [tx] - Optional Prisma transaction client
 * @returns {Promise<Object>} Created notification record
 */
const createNotification = async (data, tx = null) => {
  if (!data || typeof data !== "object") {
    throw new NotificationError("Notification data object is required", 400);
  }

  const { userId, title, message, type, entityId, entityType, metadata } = data;

  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new NotificationError("Valid recipient user ID (UUID) is required", 400);
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new NotificationError("Notification title is required", 400);
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new NotificationError("Notification message is required", 400);
  }
  if (!type || typeof type !== "string" || !type.trim()) {
    throw new NotificationError("Notification type is required", 400);
  }

  const client = tx || prisma;

  const notification = await client.notification.create({
    data: {
      userId: userId.trim(),
      title: title.trim(),
      message: message.trim(),
      type: type.trim(),
      entityId: entityId ? String(entityId).trim() : null,
      entityType: entityType ? String(entityType).trim().toUpperCase() : null,
      metadata: metadata && typeof metadata === "object" ? metadata : null,
      isRead: false,
    },
  });

  // Emit event asynchronously to active subscribers
  setImmediate(() => {
    try {
      notificationEmitter.emit(`notification:${userId.trim()}`, notification);
      notificationEmitter.emit("notification", notification);
    } catch (e) {
      console.warn("[notification.service] Real-time event emission warning:", e.message);
    }
  });

  return notification;
};

/**
 * Creates multiple notifications in a batch.
 *
 * @param {Array<Object>} notificationsList
 * @param {Object} [tx] - Optional Prisma transaction client
 * @returns {Promise<Array<Object>>} Created notifications
 */
const createNotificationBatch = async (notificationsList, tx = null) => {
  if (!Array.isArray(notificationsList) || notificationsList.length === 0) {
    return [];
  }

  const results = [];
  for (const item of notificationsList) {
    try {
      const created = await createNotification(item, tx);
      results.push(created);
    } catch (err) {
      console.warn("[notification.service] Failed creating batch notification:", err.message);
    }
  }
  return results;
};

/**
 * Retrieves notifications for an authenticated user with pagination and unread counts.
 *
 * @param {string} userId - Requesting user UUID
 * @param {Object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=20]
 * @param {boolean|string} [options.isRead] - Filter by read status
 * @returns {Promise<Object>} Notifications list with pagination and unread count
 */
const getUserNotifications = async (userId, options = {}) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new NotificationError("Valid user ID is required to fetch notifications", 400);
  }

  const cleanUserId = userId.trim();

  const rawPage = parseInt(options.page, 10);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = parseInt(options.limit, 10);
  let limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 20;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;

  const where = {
    userId: cleanUserId,
  };

  if (options.isRead !== undefined && options.isRead !== null && options.isRead !== "all") {
    if (typeof options.isRead === "boolean") {
      where.isRead = options.isRead;
    } else if (typeof options.isRead === "string") {
      const val = options.isRead.trim().toLowerCase();
      if (val === "true") where.isRead = true;
      if (val === "false") where.isRead = false;
    }
  }

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: cleanUserId, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
    unreadCount,
  };
};

/**
 * Returns the unread notification count for a specific user.
 *
 * @param {string} userId - Requesting user UUID
 * @returns {Promise<number>} Unread count
 */
const getUnreadCount = async (userId) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new NotificationError("Valid user ID is required", 400);
  }

  return await prisma.notification.count({
    where: {
      userId: userId.trim(),
      isRead: false,
    },
  });
};

/**
 * Marks a specific notification as read, enforcing user ownership.
 *
 * @param {string} notificationId - Notification UUID
 * @param {string} userId - Requesting user UUID
 * @returns {Promise<Object>} Updated notification
 */
const markAsRead = async (notificationId, userId) => {
  if (!notificationId || typeof notificationId !== "string" || !UUID_REGEX.test(notificationId.trim())) {
    throw new NotificationError("Valid notification ID is required", 400);
  }
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new NotificationError("Valid user ID is required", 400);
  }

  const cleanId = notificationId.trim();
  const cleanUserId = userId.trim();

  const existing = await prisma.notification.findUnique({
    where: { id: cleanId },
  });

  if (!existing) {
    throw new NotificationError("Notification not found", 404);
  }

  if (existing.userId !== cleanUserId) {
    throw new NotificationError("Access denied: You do not have permission to modify this notification", 403);
  }

  if (existing.isRead) {
    return existing;
  }

  const updated = await prisma.notification.update({
    where: { id: cleanId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updated;
};

/**
 * Marks all unread notifications for a user as read.
 *
 * @param {string} userId - Requesting user UUID
 * @returns {Promise<Object>} { updatedCount: number }
 */
const markAllAsRead = async (userId) => {
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new NotificationError("Valid user ID is required", 400);
  }

  const cleanUserId = userId.trim();

  const result = await prisma.notification.updateMany({
    where: {
      userId: cleanUserId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    updatedCount: result.count,
  };
};

/**
 * Deletes a notification, enforcing user ownership.
 *
 * @param {string} notificationId - Notification UUID
 * @param {string} userId - Requesting user UUID
 * @returns {Promise<Object>} Deletion result
 */
const deleteNotification = async (notificationId, userId) => {
  if (!notificationId || typeof notificationId !== "string" || !UUID_REGEX.test(notificationId.trim())) {
    throw new NotificationError("Valid notification ID is required", 400);
  }
  if (!userId || typeof userId !== "string" || !UUID_REGEX.test(userId.trim())) {
    throw new NotificationError("Valid user ID is required", 400);
  }

  const cleanId = notificationId.trim();
  const cleanUserId = userId.trim();

  const existing = await prisma.notification.findUnique({
    where: { id: cleanId },
  });

  if (!existing) {
    throw new NotificationError("Notification not found", 404);
  }

  if (existing.userId !== cleanUserId) {
    throw new NotificationError("Access denied: You do not have permission to delete this notification", 403);
  }

  await prisma.notification.delete({
    where: { id: cleanId },
  });

  return {
    success: true,
    message: "Notification deleted successfully",
    id: cleanId,
  };
};

/**
 * Subscribes to real-time notification events for a user.
 *
 * @param {string} userId - User UUID
 * @param {Function} listener - Callback receiving the notification object
 * @returns {Function} Unsubscribe cleanup function
 */
const subscribeUserNotifications = (userId, listener) => {
  if (!userId || typeof listener !== "function") return () => {};
  const channel = `notification:${userId.trim()}`;
  notificationEmitter.on(channel, listener);
  return () => {
    notificationEmitter.off(channel, listener);
  };
};

module.exports = {
  createNotification,
  createNotificationBatch,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeUserNotifications,
  notificationEmitter,
  NOTIFICATION_TYPES,
  NotificationError,
};
