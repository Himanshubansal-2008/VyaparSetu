import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  deleteNotification as apiDeleteNotification,
} from '../services/notificationService';

const storage = AsyncStorage.default || AsyncStorage;
const STORAGE_KEY_NOTIFICATIONS = '@vyaparsetu_notifications_cache';
const POLLING_INTERVAL_MS = 12000; // 12 seconds lightweight unread count check

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isRefreshing: false,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1, hasMore: false },
  loadNotifications: async () => {},
  refreshNotifications: async () => {},
  loadMoreNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  let auth = null;
  try {
    auth = useAuth();
  } catch (e) {
    // Graceful fallback for components rendered without AuthProvider
  }

  const isAuthenticated = auth?.isAuthenticated ?? false;
  const userId = auth?.user?.id || auth?.user?.userId;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  const pollingTimerRef = useRef(null);

  // Load cached notifications from AsyncStorage on cold boot
  useEffect(() => {
    let isMounted = true;
    async function loadCache() {
      try {
        const raw = await storage.getItem(STORAGE_KEY_NOTIFICATIONS);
        if (raw && isMounted) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setNotifications(parsed);
            const unread = parsed.filter((n) => !n.isRead).length;
            setUnreadCount(unread);
          }
        }
      } catch (err) {
        // Cache read warning ignored
      }
    }
    loadCache();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch full notification list
  const loadNotifications = useCallback(
    async (options = {}) => {
      if (!isAuthenticated && !userId) {
        return;
      }

      const { isRefresh = false, page = 1 } = options;
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (page === 1) {
        setIsLoading(true);
      }

      try {
        const res = await fetchNotifications({ page, limit: 20 });
        if (res && Array.isArray(res.notifications)) {
          if (page === 1) {
            setNotifications(res.notifications);
            // Save top page to offline storage
            storage.setItem(
              STORAGE_KEY_NOTIFICATIONS,
              JSON.stringify(res.notifications.slice(0, 30))
            ).catch(() => {});
          } else {
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n.id));
              const uniqueNew = res.notifications.filter((n) => !existingIds.has(n.id));
              return [...prev, ...uniqueNew];
            });
          }

          if (res.pagination) {
            setPagination(res.pagination);
          }
          if (typeof res.unreadCount === 'number') {
            setUnreadCount(res.unreadCount);
          }
        }
      } catch (err) {
        console.warn('[NotificationContext] Failed loading notifications:', err?.message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAuthenticated, userId]
  );

  // Pull-to-refresh
  const refreshNotifications = useCallback(async () => {
    await loadNotifications({ isRefresh: true, page: 1 });
  }, [loadNotifications]);

  // Load next page
  const loadMoreNotifications = useCallback(async () => {
    if (isLoading || isRefreshing || !pagination.hasMore) return;
    const nextPage = pagination.page + 1;
    await loadNotifications({ page: nextPage });
  }, [isLoading, isRefreshing, pagination, loadNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;

    // Optimistically update local state immediately
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await apiMarkAsRead(notificationId);
    } catch (err) {
      console.warn('[NotificationContext] Failed marking notification as read on server:', err?.message);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      await apiMarkAllAsRead();
    } catch (err) {
      console.warn('[NotificationContext] Failed marking all notifications as read on server:', err?.message);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    if (!notificationId) return;

    setNotifications((prev) => {
      const target = prev.find((n) => n.id === notificationId);
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      return prev.filter((n) => n.id !== notificationId);
    });

    try {
      await apiDeleteNotification(notificationId);
    } catch (err) {
      console.warn('[NotificationContext] Failed deleting notification on server:', err?.message);
    }
  }, []);

  // Polling for unread count & new notifications while authenticated
  useEffect(() => {
    if (!isAuthenticated && !userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Initial load
    loadNotifications({ page: 1 });

    const checkUpdates = async () => {
      try {
        const count = await fetchUnreadCount();
        setUnreadCount((prevCount) => {
          // If count increased, reload notifications list
          if (count > prevCount) {
            loadNotifications({ page: 1 });
          }
          return count;
        });
      } catch (e) {
        // Network drops / passive polling error ignored
      }
    };

    pollingTimerRef.current = setInterval(checkUpdates, POLLING_INTERVAL_MS);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [isAuthenticated, userId, loadNotifications]);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    pagination,
    loadNotifications,
    refreshNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
