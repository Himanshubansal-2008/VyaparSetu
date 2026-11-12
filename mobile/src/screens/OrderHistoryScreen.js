import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  getOrders,
  subscribeOrders,
  loadPersistedOrders,
} from '../data/orders';

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
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const renderOrderItem = ({ item }) => {
    const firstItem = item.items?.[0] || {};
    const moreItemsCount = (item.items?.length || 1) - 1;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => onNavigateToOrderDetails && onNavigateToOrderDetails({ order: item, orderId: item.id })}
        accessibilityRole="button"
        accessibilityLabel={`Order ${item.id}, Amount: ₹${item.totalAmount}`}
      >
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
        </View>

        <View style={styles.divider} />

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

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>Consignment Value</Text>
            <Text style={styles.totalValue}>
              ₹{(Number(item.totalAmount) || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.viewDetailsBtn}>
            <Text style={styles.viewDetailsText}>View Details</Text>
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

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id || item.orderNumber)}
        renderItem={renderOrderItem}
        contentContainerStyle={[
          styles.listContent,
          orders.length === 0 && styles.emptyListContent,
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
            <Text style={styles.emptyTitle}>No wholesale orders yet</Text>
            <Text style={styles.emptyDescription}>
              Discover verified manufacturers and wholesalers to place bulk orders with tiered pricing.
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
