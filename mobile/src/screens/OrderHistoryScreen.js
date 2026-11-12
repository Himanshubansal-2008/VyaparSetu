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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  getOrders,
  subscribeOrders,
  loadPersistedOrders,
  getStatusColor,
} from '../data/orders';
import EmptyState from '../components/EmptyState';

const FILTER_TABS = [
  { key: 'All', label: 'All Orders' },
  { key: 'Active', label: 'In Progress' },
  { key: 'Delivered', label: 'Delivered' },
  { key: 'Cancelled', label: 'Cancelled' },
];

export default function OrderHistoryScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToOrderDetails,
  onNavigateToCatalog,
  onNavigateToHome,
  onCartPress,
}) {
  const [orders, setOrders] = useState(getOrders());
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to reactive order updates
  useEffect(() => {
    setOrders(getOrders());
    return subscribeOrders((updatedOrders) => {
      setOrders([...updatedOrders]);
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await loadPersistedOrders();
      setOrders([...refreshed]);
    } catch (e) {
      console.warn('[OrderHistoryScreen] Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleOrderPress = useCallback(
    (order) => {
      if (!order) return;
      if (onNavigateToOrderDetails) {
        onNavigateToOrderDetails({ order, orderId: order.id });
      } else if (navigation?.navigate) {
        navigation.navigate('OrderDetails', {
          order,
          orderId: order.id,
        });
      }
    },
    [onNavigateToOrderDetails, navigation]
  );

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    } else if (onNavigateToHome) {
      onNavigateToHome();
    }
  }, [onBackPress, navigation, onNavigateToHome]);

  const handleBrowseCatalog = useCallback(() => {
    if (onNavigateToCatalog) {
      onNavigateToCatalog();
    } else if (navigation?.navigate) {
      navigation.navigate('ProductListing');
    }
  }, [onNavigateToCatalog, navigation]);

  // Compute counts for tabs
  const counts = useMemo(() => {
    let active = 0;
    let delivered = 0;
    let cancelled = 0;

    orders.forEach((o) => {
      const st = String(o.status || '').toLowerCase();
      if (st === 'delivered') delivered += 1;
      else if (st === 'cancelled') cancelled += 1;
      else active += 1;
    });

    return {
      all: orders.length,
      active,
      delivered,
      cancelled,
    };
  }, [orders]);

  // Filter and search
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filter by tab
    if (activeFilter === 'Active') {
      result = result.filter((o) => {
        const st = String(o.status || '').toLowerCase();
        return st !== 'delivered' && st !== 'cancelled';
      });
    } else if (activeFilter === 'Delivered') {
      result = result.filter(
        (o) => String(o.status || '').toLowerCase() === 'delivered'
      );
    } else if (activeFilter === 'Cancelled') {
      result = result.filter(
        (o) => String(o.status || '').toLowerCase() === 'cancelled'
      );
    }

    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((o) => {
        const idMatch = String(o.id || o.orderNumber || '')
          .toLowerCase()
          .includes(q);
        const itemMatch = Array.isArray(o.items)
          ? o.items.some((item) =>
              String(item.title || item.name || '')
                .toLowerCase()
                .includes(q)
            )
          : false;
        const buyerMatch = String(
          o.deliveryAddress?.businessName ||
            o.deliveryAddress?.fullName ||
            ''
        )
          .toLowerCase()
          .includes(q);
        return idMatch || itemMatch || buyerMatch;
      });
    }

    return result;
  }, [orders, activeFilter, searchQuery]);

  // Overall analytics KPI summary
  const summaryKpis = useMemo(() => {
    const totalSpend = orders.reduce(
      (sum, o) => sum + (Number(o.totalAmount) || 0),
      0
    );
    return {
      totalOrders: orders.length,
      activeOrders: counts.active,
      totalSpend,
    };
  }, [orders, counts.active]);

  const renderOrderItem = ({ item }) => {
    const statusCfg = getStatusColor(item.status);
    const firstItem = item.items?.[0] || {};
    const moreItemsCount = (item.items?.length || 1) - 1;
    

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => handleOrderPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Order ${item.id}, Status: ${item.status}, Amount: ₹${item.totalAmount}`}
      >
        {/* Card Header: Order ID & Date */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdGroup}>
            <Ionicons
              name="receipt-outline"
              size={18}
              color={colors.primary}
              style={styles.orderIcon}
            />
            <View>
              <Text style={styles.orderIdText}>{item.id || item.orderNumber}</Text>
              <Text style={styles.orderDateText}>
                Placed on {item.orderDate || new Date(item.createdAt).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusCfg.bg,
                borderColor: statusCfg.border,
              },
            ]}
          >
            <Ionicons
              name={statusCfg.icon}
              size={13}
              color={statusCfg.text}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>
              {item.status || 'Confirmed'}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Middle: Product Thumbnail & Items info */}
        <View style={styles.cardBody}>
          <View style={styles.thumbnailWrapper}>
            {firstItem.image ? (
              <Image
                source={{ uri: firstItem.image }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailFallback}>
                <Ionicons
                  name="cube-outline"
                  size={24}
                  color={colors.textMuted}
                />
              </View>
            )}
          </View>

          <View style={styles.itemDetails}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {firstItem.title || firstItem.name || 'Wholesale Order Items'}
            </Text>

            {moreItemsCount > 0 && (
              <Text style={styles.moreItemsText}>
                + {moreItemsCount} more wholesale {moreItemsCount === 1 ? 'item' : 'items'}
              </Text>
            )}

            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons
                  name="layers-outline"
                  size={12}
                  color={colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.metaPillText}>
                  {item.totalUnits || firstItem.quantity || 1}{' '}
                  {firstItem.unit ? `${firstItem.unit}s` : 'units'}
                </Text>
              </View>

              {item.deliveryAddress?.city && (
                <View style={styles.metaPill}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.metaPillText} numberOfLines={1}>
                    {item.deliveryAddress.city}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>



        {/* Card Footer: Total Amount & Action CTA */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>Consignment Value</Text>
            <Text style={styles.totalValue}>
              ₹{(Number(item.totalAmount) || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.viewDetailsBtn}>
            <Text style={styles.viewDetailsText}>View & Track</Text>
            <Ionicons
              name="chevron-forward"
              size={15}
              color={colors.primary}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* 1. Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Order History</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length} wholesale {orders.length === 1 ? 'order' : 'orders'} placed
          </Text>
        </View>

        {onCartPress ? (
          <TouchableOpacity
            style={styles.cartButton}
            onPress={onCartPress}
            activeOpacity={0.7}
            accessibilityLabel="Shopping Cart"
          >
            <Ionicons
              name="cart-outline"
              size={22}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* 2. Top Summary KPI Row */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{summaryKpis.totalOrders}</Text>
          <Text style={styles.kpiLabel}>Total Orders</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.primary }]}>
            {summaryKpis.activeOrders}
          </Text>
          <Text style={styles.kpiLabel}>In Transit</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: colors.success }]}>
            ₹{summaryKpis.totalSpend > 99999 ? `${(summaryKpis.totalSpend / 100000).toFixed(1)}L` : summaryKpis.totalSpend.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.kpiLabel}>Total Spent</Text>
        </View>
      </View>

      {/* 3. Search Bar */}
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
            placeholder="Search by Order ID, item, or location..."
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
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 4. Filter Tabs */}
      <View style={styles.tabsContainer}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          let count = counts.all;
          if (tab.key === 'Active') count = counts.active;
          if (tab.key === 'Delivered') count = counts.delivered;
          if (tab.key === 'Cancelled') count = counts.cancelled;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
              >
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

      {/* 5. Orders List / Empty State */}
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
                name="receipt-outline"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim()
                ? 'No matching orders found'
                : activeFilter !== 'All'
                ? `No ${activeFilter.toLowerCase()} orders`
                : 'No wholesale orders yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery.trim()
                ? `We couldn't find any orders matching "${searchQuery}". Try searching with a different ID or keyword.`
                : 'Discover verified manufacturers and wholesalers to place bulk orders with tiered pricing.'}
            </Text>

            <TouchableOpacity
              style={styles.browseButton}
              onPress={handleBrowseCatalog}
              activeOpacity={0.8}
            >
              <Ionicons
                name="storefront-outline"
                size={18}
                color={colors.textInverse}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.browseButtonText}>
                Browse Wholesale Catalog
              </Text>
            </TouchableOpacity>
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
    color: colors.textSecondary,
    marginTop: 1,
  },
  cartButton: {
    padding: spacing.xs + 2,
  },
  headerSpacer: {
    width: 32,
  },
  kpiContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
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
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  kpiDivider: {
    width: 1,
    height: 28,
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
    height: 42,
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
    gap: spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.sm + 4,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabBadge: {
    marginLeft: 5,
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
  orderIcon: {
    marginRight: spacing.sm,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm + 2,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
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
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  moreItemsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
    gap: spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  metaPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressTrackContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm + 2,
  },
  progressTrackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  progressStageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressEtaText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  stepDotDone: {
    backgroundColor: colors.success,
  },
  stepDotCurrent: {
    backgroundColor: colors.primary,
  },
  stepDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
  stepConnector: {
    flex: 1,
    height: 2.5,
    backgroundColor: colors.borderDark,
    marginHorizontal: 2,
  },
  stepConnectorDone: {
    backgroundColor: colors.success,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 1,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '15',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  viewDetailsText: {
    fontSize: 13,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
});

