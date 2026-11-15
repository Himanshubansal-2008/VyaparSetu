import apiClient from './apiClient.js';
import { API_CONFIG } from '../config/api.js';

/**
 * Fetches notifications for the active user with optional pagination and filters.
 *
 * @param {Object} [params] - Query options ({ page, limit, isRead })
 * @param {Object} [options] - Additional request options
 * @returns {Promise<Object>} { notifications, pagination, unreadCount }
 */
export const fetchNotifications = async (params = {}, options = {}) => {
  const endpoint = API_CONFIG.ENDPOINTS.NOTIFICATIONS || '/notifications';
  const response = await apiClient.get(endpoint, {
    ...options,
    params,
  });
  return response?.data || response;
};

/**
 * Fetches the total count of unread notifications for the active user.
 *
 * @param {Object} [options]
 * @returns {Promise<number>} Unread count
 */
export const fetchUnreadCount = async (options = {}) => {
  const endpoint = `${API_CONFIG.ENDPOINTS.NOTIFICATIONS || '/notifications'}/unread-count`;
  const response = await apiClient.get(endpoint, options);
  const data = response?.data || response;
  return typeof data?.unreadCount === 'number' ? data.unreadCount : 0;
};

/**
 * Marks a single notification as read.
 *
 * @param {string} notificationId - Notification UUID
 * @param {Object} [options]
 * @returns {Promise<Object>} Updated notification
 */
export const markAsRead = async (notificationId, options = {}) => {
  if (!notificationId) return null;
  const endpoint = `${API_CONFIG.ENDPOINTS.NOTIFICATIONS || '/notifications'}/${notificationId}/read`;
  const response = await apiClient.patch(endpoint, {}, options);
  return response?.data || response;
};

/**
 * Marks all unread notifications for the active user as read.
 *
 * @param {Object} [options]
 * @returns {Promise<Object>} { updatedCount }
 */
export const markAllAsRead = async (options = {}) => {
  const endpoint = `${API_CONFIG.ENDPOINTS.NOTIFICATIONS || '/notifications'}/mark-all-read`;
  const response = await apiClient.patch(endpoint, {}, options);
  return response?.data || response;
};

/**
 * Deletes a notification from history.
 *
 * @param {string} notificationId - Notification UUID
 * @param {Object} [options]
 * @returns {Promise<Object>} Deletion result
 */
export const deleteNotification = async (notificationId, options = {}) => {
  if (!notificationId) return null;
  const endpoint = `${API_CONFIG.ENDPOINTS.NOTIFICATIONS || '/notifications'}/${notificationId}`;
  const response = await apiClient.delete(endpoint, options);
  return response?.data || response;
};

export default {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
