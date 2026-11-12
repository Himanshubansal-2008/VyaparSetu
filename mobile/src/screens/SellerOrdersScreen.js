import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  getOrders,
  subscribeOrders,
  loadPersistedOrders,
  getStatusColor,
  getSellerOrderItems,
  getOrdersForSeller,
  acceptOrder,
  rejectOrder,
} from '../data/orders';
import {
  getSessionBusinessProfile,
  getBusinessById,
  businesses,
} from '../data/businessProfileData';
import { products as defaultProducts } from '../data/products';

const FILTER_TABS = [
  { key: 'All', label: 'All Orders' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Active', label: 'In Progress' },
  { key: 'Completed', label: 'Delivered' },
  { key: 'Rejected', label: 'Rejected' },
];

export default function SellerOrdersScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToBusinessProfile,
}) {
  const sessionProfile = getSessionBusinessProfile();

  // Resolve target seller/business identity
  const businessId = useMemo(() => {
    return (
      route?.params?.businessId ||
      route?.params?.sellerId ||
      route?.params?.business?.id ||
      route?.params?.business?.sellerId ||
      sessionProfile?.id ||
      sessionProfile?.sellerId ||
      'biz-sharma-handicrafts'
    );
  }, [route?.params, sessionProfile]);

  const business = useMemo(() => {
    return (
      route?.params?.business ||
      sessionProfile ||
      getBusinessById(businessId) ||
      businesses[0]
    );
  }, [route?.params, sessionProfile, businessId]);

  const [allOrders, setAllOrders] = useState(getOrders());
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to reactive order changes
  useEffect(() => {
    setAllOrders(getOrders());
    return subscribeOrders((updatedOrders) => {
      setAllOrders([...updatedOrders]);
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await loadPersistedOrders();
      setAllOrders([...refreshed]);
    } catch (e) {
      console.warn('[SellerOrdersScreen] Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    } else if (onNavigateToBusinessProfile) {
      onNavigateToBusinessProfile({ businessId, business });
    }
  }, [onBackPress, navigation, onNavigateToBusinessProfile, businessId, business]);



  // Filter orders containing products belonging to this seller
  const sellerOrders = useMemo(() => {
    return getOrdersForSeller(businessId, defaultProducts);
  }, [allOrders, businessId]);

  // Tab counts
  const counts = useMemo(() => {
    let pending = 0;
    let active = 0;
    let completed = 0;
    let rejected = 0;

    sellerOrders.forEach((o) => {
      const st = String(o.status || '').toLowerCase();
      if (st === 'confirmed' || st === 'pending' || st === 'pending acceptance') {
        pending += 1;
      } else if (st === 'delivered') {
        completed += 1;
      } else if (st === 'rejected' || st === 'cancelled') {
        rejected += 1;
      } else {
        active += 1;
      }
    });

    return {
      all: sellerOrders.length,
      pending,
      active,
      completed,
      rejected,
    };
  }, [sellerOrders]);

  // Filter and search
  const filteredOrders = useMemo(() => {
    let result = sellerOrders;

    if (activeFilter === 'Pending') {
      result = result.filter((o) => {
        const st = String(o.status || '').toLowerCase();
        return st === 'confirmed' || st === 'pending' || st === 'pending acceptance';
      });
    } else if (activeFilter === 'Active') {
      result = result.filter((o) => {
        const st = String(o.status || '').toLowerCase();
        return (
          st !== 'confirmed' &&
          st !== 'pending' &&
          st !== 'pending acceptance' &&
          st !== 'delivered' &&
          st !== 'rejected' &&
          st !== 'cancelled'
        );
      });
    } else if (activeFilter === 'Completed') {
      result = result.filter(
        (o) => String(o.status || '').toLowerCase() === 'delivered'
      );
    } else if (activeFilter === 'Rejected') {
      result = result.filter((o) => {
        const st = String(o.status || '').toLowerCase();
        return st === 'rejected' || st === 'cancelled';
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((o) => {
        const idMatch = String(o.id || o.orderNumber || '')
          .toLowerCase()
          .includes(q);
        const buyerMatch = String(
          o.deliveryAddress?.businessName ||
            o.deliveryAddress?.fullName ||
            ''
        )
          .toLowerCase()
          .includes(q);
        const sellerItems = getSellerOrderItems(o, businessId, defaultProducts);
        const itemMatch = sellerItems.some((item) =>
          String(item.title || item.name || '')
            .toLowerCase()
            .includes(q)
        );
        return idMatch || buyerMatch || itemMatch;
      });
    }

    return result;
  }, [sellerOrders, activeFilter, searchQuery, businessId]);

  // Seller KPI Revenue Summary
  const kpis = useMemo(() => {
    let revenue = 0;
    sellerOrders.forEach((o) => {
      const st = String(o.status || '').toLowerCase();
      if (st !== 'rejected' && st !== 'cancelled') {
        const items = getSellerOrderItems(o, businessId, defaultProducts);
        const subtotal = items.reduce(
          (sum, it) =>
            sum +
            (Number(it.itemTotal) ||
              Number(it.unitPrice || it.price || 0) * (Number(it.quantity) || 1)),
          0
        );
        revenue += subtotal;
      }
    });

    return {
      total: sellerOrders.length,
      pending: counts.pending,
      active: counts.active,
      revenue,
    };
  }, [sellerOrders, counts.pending, counts.active, businessId]);

  // Handler: Reject Order
  const handleRejectOrder = useCallback(
    (order) => {
      Alert.alert(
        'Reject Wholesale Order',
        `Are you sure you want to reject order #${order.id}?\n\nThe buyer will be notified and this consignment will be marked as Rejected.`,
        [
          { text: 'Keep Order', style: 'cancel' },
          {
            text: 'Reject Order',
            style: 'destructive',
            onPress: async () => {
              setActionLoadingId(order.id);
              try {
                const res = await rejectOrder(
                  order.id,
                  businessId,
                  'Seller unable to fulfill consignment at this time'
                );
                if (res.success) {
                  Alert.alert(
                    'Order Rejected',
                    `Order #${order.id} has been marked as Rejected.`
                  );
                } else {
                  Alert.alert('Error', res.message || 'Failed to reject order.');
                }
              } catch (err) {
                console.warn('Reject order error:', err);
              } finally {
                setActionLoadingId(null);
              }
            },
          },
        ]
      );
    },
    [businessId]
  );

  const renderOrderItem = ({ item }) => {
    const statusCfg = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Order ${item.id}, Status ${item.status}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderIdGroup}>
            <Ionicons
              name="receipt-outline"
              size={18}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <View>
              <Text style={styles.orderIdText}>{item.id || item.orderNumber}</Text>
              <Text style={styles.orderDateText}>
                Received on {item.orderDate || new Date(item.createdAt).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusCfg.bg,
                borderColor: statusCfg.border,
              },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>
              {item.status || 'Confirmed'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Seller Orders</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {business?.businessName || 'My Wholesale Business'}
          </Text>
        </View>

        <View style={styles.verifiedPill}>
          <Ionicons name="shield-checkmark" size={13} color={colors.success} style={{ marginRight: 3 }} />
          <Text style={styles.verifiedPillText}>Seller Mode</Text>
        </View>
      </View>

      {/* KPI Overview Row */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{kpis.total}</Text>
          <Text style={styles.kpiLabel}>Received</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.warning }]}>
            {kpis.pending}
          </Text>
          <Text style={styles.kpiLabel}>Needs Action</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.primary }]}>
            {kpis.active}
          </Text>
          <Text style={styles.kpiLabel}>In Progress</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.success }]}>
            ₹{kpis.revenue > 99999 ? `${(kpis.revenue / 100000).toFixed(1)}L` : kpis.revenue.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.kpiLabel}>Revenue</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders, buyers, or items..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          let count = counts.all;
          if (tab.key === 'Pending') count = counts.pending;
          if (tab.key === 'Active') count = counts.active;
          if (tab.key === 'Completed') count = counts.completed;
          if (tab.key === 'Rejected') count = counts.rejected;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View
                style={[styles.tabBadge, isActive && styles.tabBadgeActive]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    isActive && styles.tabBadgeTextActive,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Orders List / Empty State */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id || item.orderNumber)}
        renderItem={renderOrderItem}
        contentContainerStyle={[
          styles.listContent,
          filteredOrders.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons
                name="cube-outline"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim()
                ? 'No matching orders found'
                : activeFilter !== 'All'
                ? `No ${activeFilter.toLowerCase()} orders`
                : 'No orders received yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery.trim()
                ? `No received orders match "${searchQuery}".`
                : 'When wholesale buyers order your products, their consignments and delivery requirements will appear here for you to accept and manage.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs + 2,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  kpiContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  kpiDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs + 2,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: colors.primaryLight + '15',
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabBadge: {
    marginLeft: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tabBadgeActive: {
    backgroundColor: colors.primary,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.05,
        shadowRadius: 3.5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orderDateText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  buyerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  buyerName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  buyerLocation: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm + 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailBox: {
    width: 54,
    height: 54,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 17,
  },
  moreItemsText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.xs,
  },
  metaBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  multiSellerBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  multiSellerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accent,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 1,
  },
  actionButtonsInline: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rejectBtnInline: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  acceptBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '15',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

