import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { useNotification } from '../context/NotificationContext';
import { useMode } from '../context/ModeContext';
import EmptyState from '../components/EmptyState';

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
};

const getNotificationMeta = (type) => {
  switch (type) {
    case 'ORDER_PLACED':
      return {
        icon: 'receipt-outline',
        color: colors.primary,
        bgColor: '#EFF6FF',
        badge: 'Order Placed',
      };
    case 'ORDER_ACCEPTED':
      return {
        icon: 'checkmark-circle-outline',
        color: colors.success,
        bgColor: colors.successLight,
        badge: 'Order Accepted',
      };
    case 'ORDER_DISPATCHED':
      return {
        icon: 'airplane-outline',
        color: colors.info,
        bgColor: colors.infoLight,
        badge: 'Dispatched',
      };
    case 'ORDER_DELIVERED':
      return {
        icon: 'checkmark-done-circle-outline',
        color: colors.success,
        bgColor: colors.successLight,
        badge: 'Delivered',
      };
    case 'ORDER_CANCELLED':
      return {
        icon: 'close-circle-outline',
        color: colors.error,
        bgColor: colors.errorLight,
        badge: 'Cancelled',
      };
    case 'ORDER_REJECTED':
      return {
        icon: 'alert-circle-outline',
        color: colors.error,
        bgColor: colors.errorLight,
        badge: 'Rejected',
      };
    case 'QUOTATION_REQUEST':
      return {
        icon: 'document-text-outline',
        color: colors.accent,
        bgColor: colors.accentLight,
        badge: 'New RFQ',
      };
    case 'QUOTATION_RESPONSE':
      return {
        icon: 'pricetag-outline',
        color: colors.primary,
        bgColor: '#EFF6FF',
        badge: 'Quoted',
      };
    case 'QUOTATION_COUNTER':
      return {
        icon: 'swap-horizontal-outline',
        color: colors.accent,
        bgColor: colors.accentLight,
        badge: 'Counter-Offer',
      };
    case 'QUOTATION_ACCEPTED':
      return {
        icon: 'checkmark-circle-outline',
        color: colors.success,
        bgColor: colors.successLight,
        badge: 'Quote Accepted',
      };
    case 'QUOTATION_REJECTED':
      return {
        icon: 'close-circle-outline',
        color: colors.textMuted,
        bgColor: colors.surfaceSubtle,
        badge: 'Quote Declined',
      };
    case 'LOW_STOCK':
      return {
        icon: 'warning-outline',
        color: colors.warning,
        bgColor: colors.warningLight,
        badge: 'Low Stock',
      };
    case 'CHAT_MESSAGE':
      return {
        icon: 'chatbubble-ellipses-outline',
        color: colors.primary,
        bgColor: '#EFF6FF',
        badge: 'Message',
      };
    default:
      return {
        icon: 'notifications-outline',
        color: colors.primary,
        bgColor: '#EFF6FF',
        badge: 'Notice',
      };
  }
};

export default function NotificationScreen({
  navigation,
  onBackPress,
  onNavigateToOrderDetails,
  onNavigateToSellerOrderDetails,
  onNavigateToBuyerQuotationDetails,
  onNavigateToSellerQuotationDetails,
  onNavigateToProductDetails,
  onNavigateToEditProduct,
}) {
  const { isSellerMode } = useMode();
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    refreshNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotification();

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD'

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'UNREAD') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, activeTab]);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  };

  const handlePressNotification = async (item) => {
    // 1. Mark as read
    if (!item.isRead) {
      markAsRead(item.id);
    }

    const { type, entityId } = item;

    // 2. Route according to notification type and entity
    if (!entityId) return;

    if (
      type === 'ORDER_PLACED' ||
      type === 'ORDER_ACCEPTED' ||
      type === 'ORDER_REJECTED' ||
      type === 'ORDER_DISPATCHED' ||
      type === 'ORDER_DELIVERED' ||
      type === 'ORDER_CANCELLED'
    ) {
      // If seller order event or currently in seller mode
      if (type === 'ORDER_PLACED' || isSellerMode) {
        if (onNavigateToSellerOrderDetails) {
          onNavigateToSellerOrderDetails({ orderId: entityId });
        } else if (navigation?.navigate) {
          navigation.navigate('SellerOrderDetails', { orderId: entityId });
        }
      } else {
        if (onNavigateToOrderDetails) {
          onNavigateToOrderDetails({ orderId: entityId });
        } else if (navigation?.navigate) {
          navigation.navigate('OrderDetails', { orderId: entityId });
        }
      }
    } else if (
      type === 'QUOTATION_REQUEST' ||
      type === 'QUOTATION_RESPONSE' ||
      type === 'QUOTATION_COUNTER' ||
      type === 'QUOTATION_ACCEPTED' ||
      type === 'QUOTATION_REJECTED'
    ) {
      if (type === 'QUOTATION_REQUEST' || isSellerMode) {
        if (onNavigateToSellerQuotationDetails) {
          onNavigateToSellerQuotationDetails({ quotationId: entityId });
        } else if (navigation?.navigate) {
          navigation.navigate('SellerQuotationDetails', { quotationId: entityId });
        }
      } else {
        if (onNavigateToBuyerQuotationDetails) {
          onNavigateToBuyerQuotationDetails({ quotationId: entityId });
        } else if (navigation?.navigate) {
          navigation.navigate('BuyerQuotationDetails', { quotationId: entityId });
        }
      }
    } else if (type === 'LOW_STOCK') {
      if (isSellerMode && onNavigateToEditProduct) {
        onNavigateToEditProduct({ productId: entityId, isEdit: true });
      } else if (navigation?.navigate) {
        if (isSellerMode) {
          navigation.navigate('EditProduct', { productId: entityId, isEdit: true });
        } else {
          navigation.navigate('ProductDetails', { productId: entityId });
        }
      }
    } else if (type === 'CHAT_MESSAGE') {
      Alert.alert(item.title, item.message);
    }
  };

  const renderNotificationItem = ({ item }) => {
    const meta = getNotificationMeta(item.type);
    const timeFormatted = formatTimeAgo(item.createdAt);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          !item.isRead && styles.cardUnread,
        ]}
        onPress={() => handlePressNotification(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconContainer, { backgroundColor: meta.bgColor }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.headerTextWrapper}>
            <View style={styles.badgeAndDotRow}>
              <View style={[styles.typeBadge, { backgroundColor: meta.bgColor }]}>
                <Text style={[styles.typeBadgeText, { color: meta.color }]}>
                  {meta.badge}
                </Text>
              </View>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.cardTimeText}>{timeFormatted}</Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.cardMessage}>{item.message}</Text>

        <View style={styles.cardFooterRow}>
          {!item.isRead ? (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={() => markAsRead(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="checkmark-done" size={14} color={colors.primary} />
              <Text style={styles.markReadText}>Mark as read</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.readIndicator}>
              <Ionicons name="checkmark-done" size={13} color={colors.textMuted} />
              <Text style={styles.readText}>Read</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteNotification(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllButtonText}>Mark All Read</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRightSpacer} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ALL' && styles.tabItemActive]}
          onPress={() => setActiveTab('ALL')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}
          >
            All ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'UNREAD' && styles.tabItemActive]}
          onPress={() => setActiveTab('UNREAD')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'UNREAD' && styles.tabTextActive,
            ]}
          >
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={activeTab === 'UNREAD' ? 'checkmark-done-circle-outline' : 'notifications-outline'}
          title={activeTab === 'UNREAD' ? 'All Caught Up!' : 'No Notifications Yet'}
          description={
            activeTab === 'UNREAD'
              ? 'You have read all your notifications. New trade, order, and quotation updates will appear here.'
              : 'You will receive notifications here for incoming orders, quotation negotiations, and delivery updates.'
          }
          actionText={activeTab === 'UNREAD' ? 'View All Notifications' : undefined}
          onActionPress={activeTab === 'UNREAD' ? () => setActiveTab('ALL') : undefined}
          style={{ flex: 1, justifyContent: 'center' }}
        />
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreNotifications}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshNotifications}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
  markAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  headerRightSpacer: {
    width: 36,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  tabItem: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      default: {},
    }),
  },
  cardUnread: {
    backgroundColor: '#FAF5FF', // Very subtle highlight
    borderColor: '#E9D5FF',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTextWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeAndDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  cardTimeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  cardTitleUnread: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  readIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  deleteButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
