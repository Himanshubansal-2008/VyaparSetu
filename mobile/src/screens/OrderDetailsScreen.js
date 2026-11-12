import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Alert,
  Share,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  getOrderById,
  subscribeOrders,
  updateOrderStatus,
  ORDER_STAGES,
  getStatusProgress,
  getStatusColor,
} from '../data/orders';
import { useCart } from '../context/CartContext';
import EmptyState from '../components/EmptyState';

export default function OrderDetailsScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToProductDetails,
  onNavigateToOrderHistory,
  onNavigateToHome,
  onNavigateToCart,
}) {
  const initialOrderId =
    route?.params?.orderId ||
    route?.params?.order?.id ||
    route?.params?.order?.orderNumber;

  const [order, setOrder] = useState(() => {
    if (route?.params?.order && route.params.order.id) {
      return route.params.order;
    }
    return getOrderById(initialOrderId);
  });

  const { addToCart } = useCart();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Keep order synced with global state
  useEffect(() => {
    if (initialOrderId) {
      const found = getOrderById(initialOrderId);
      if (found) setOrder(found);
    }
    return subscribeOrders(() => {
      if (initialOrderId) {
        const found = getOrderById(initialOrderId);
        if (found) setOrder(found);
      }
    });
  }, [initialOrderId]);

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    } else if (onNavigateToOrderHistory) {
      onNavigateToOrderHistory();
    } else if (onNavigateToHome) {
      onNavigateToHome();
    }
  }, [onBackPress, navigation, onNavigateToOrderHistory, onNavigateToHome]);

  const handleShareOrder = useCallback(async () => {
    if (!order) return;
    try {
      await Share.share({
        message: `VyaparSetu Wholesale Order: ${order.id}\nStatus: ${order.status}\nItems: ${order.totalItems || order.items?.length || 1} (${order.totalUnits || 0} units)\nTotal: ₹${(Number(order.totalAmount) || 0).toLocaleString('en-IN')}\nPayment: ${order.paymentMethod || 'Trade Credit'}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  }, [order]);

  const handleProductPress = useCallback(
    (item) => {
      if (!item) return;
      const productId = item.productId || item.id;
      if (onNavigateToProductDetails) {
        onNavigateToProductDetails({
          productId,
          product: item,
        });
      } else if (navigation?.navigate) {
        navigation.navigate('ProductDetails', {
          productId,
          product: item,
        });
      }
    },
    [onNavigateToProductDetails, navigation]
  );

  const handleReorder = useCallback(() => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      return;
    }

    try {
      let addedCount = 0;
      order.items.forEach((item) => {
        const productPayload = {
          id: item.productId || item.id,
          name: item.title || item.name,
          title: item.title || item.name,
          price: item.unitPrice || item.price,
          unit: item.unit || 'piece',
          image: item.image,
          images: item.image ? [item.image] : [],
        };
        const res = addToCart(productPayload, item.quantity || item.moq || 1);
        if (res?.success) addedCount += 1;
      });

      Alert.alert(
        'Added to Cart',
        `Added ${order.items.length} wholesale ${order.items.length === 1 ? 'item' : 'items'} back to your cart.`,
        [
          {
            text: 'View Cart',
            onPress: () => {
              if (onNavigateToCart) {
                onNavigateToCart();
              } else if (navigation?.navigate) {
                navigation.navigate('Cart');
              }
            },
          },
          { text: 'Keep Browsing', style: 'cancel' },
        ]
      );
    } catch (e) {
      console.warn('[OrderDetailsScreen] Reorder error:', e);
    }
  }, [order, addToCart, onNavigateToCart, navigation]);

  // Demo status advancement trigger
  const handleAdvanceStatus = useCallback(async () => {
    if (!order) return;
    const stagesOrder = ['Confirmed', 'Processing', 'Dispatched', 'Out for Delivery', 'Delivered'];
    const currentIdx = stagesOrder.findIndex(
      (s) => s.toLowerCase() === String(order.status || '').toLowerCase()
    );

    const nextStatus =
      currentIdx >= 0 && currentIdx < stagesOrder.length - 1
        ? stagesOrder[currentIdx + 1]
        : stagesOrder[0]; // Loop back to Confirmed if at end

    setIsUpdatingStatus(true);
    try {
      const extra = {};
      if (nextStatus === 'Dispatched' && !order.carrierName) {
        extra.carrierName = 'Delhivery B2B Freight';
        extra.trackingNumber = `DELHIVERY-B2B-${Math.floor(100000 + Math.random() * 900000)}`;
        extra.estimatedDelivery = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN');
      } else if (nextStatus === 'Delivered') {
        extra.deliveredAt = new Date().toLocaleDateString('en-IN');
      }

      const updated = await updateOrderStatus(order.id, nextStatus, extra);
      if (updated) {
        setOrder(updated);
      }
    } catch (err) {
      console.warn('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [order]);

  // If order is invalid or not found
  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIconBox}>
            <Ionicons name="alert-circle-outline" size={54} color={colors.warning} />
          </View>
          <Text style={styles.notFoundTitle}>Order Not Found</Text>
          <Text style={styles.notFoundDesc}>
            We could not find order details for ID "{initialOrderId || 'Unknown'}". It may have been archived or removed.
          </Text>
          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => {
              if (onNavigateToOrderHistory) onNavigateToOrderHistory();
              else if (navigation?.navigate) navigation.navigate('OrderHistory');
              else handleBack();
            }}
          >
            <Ionicons name="receipt-outline" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
            <Text style={styles.returnButtonText}>Return to Order History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = getStatusColor(order.status);
  const currentStageIndex = getStatusProgress(order.status);
  const delivery = order.deliveryAddress || {};
  const items = Array.isArray(order.items) ? order.items : [];

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
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Order #{order.id || order.orderNumber}</Text>
          <Text style={styles.headerSubtitle}>
            Placed on {order.orderDate || new Date(order.createdAt).toLocaleDateString('en-IN')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={handleShareOrder}
          activeOpacity={0.7}
          accessibilityLabel="Share order"
        >
          <Ionicons name="share-social-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Hero Status Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.heroStatusBadge,
                {
                  backgroundColor: statusCfg.bg,
                  borderColor: statusCfg.border,
                },
              ]}
            >
              <Ionicons
                name={statusCfg.icon}
                size={16}
                color={statusCfg.text}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.heroStatusText, { color: statusCfg.text }]}>
                {order.status || 'Confirmed'}
              </Text>
            </View>

            <Text style={styles.heroOrderNumber}>
              {order.id || order.orderNumber}
            </Text>
          </View>

          <Text style={styles.heroStatusHeadline}>
            {order.status === 'Delivered'
              ? 'Wholesale Consignment Delivered'
              : order.status === 'Dispatched'
              ? 'Consignment In Transit with Carrier'
              : order.status === 'Out for Delivery'
              ? 'Out for Warehouse Dock Delivery'
              : order.status === 'Processing'
              ? 'Consignment Being Packed & Inspected'
              : order.status === 'Cancelled'
              ? 'Order Has Been Cancelled'
              : 'Order Confirmed by Supplier'}
          </Text>

          <Text style={styles.heroStatusDetail}>
            {order.status === 'Delivered'
              ? `Delivered on ${order.deliveredAt || order.orderDate || 'recent date'}. Signed off at destination dock.`
              : order.status === 'Dispatched'
              ? `Carrier: ${order.carrierName || 'Delhivery B2B Freight'} • Tracking: ${order.trackingNumber || 'DELHIVERY-B2B-894102'}`
              : order.status === 'Cancelled'
              ? 'This consignment has been cancelled and any paid amounts are reversed.'
              : `Estimated delivery by ${order.estimatedDelivery || '3-5 business days'} via freight transport.`}
          </Text>

          {/* Status Progression Demo Simulator Pill */}
          <TouchableOpacity
            style={styles.advanceStatusBtn}
            onPress={handleAdvanceStatus}
            disabled={isUpdatingStatus}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh-circle-outline"
              size={16}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.advanceStatusText}>
              {isUpdatingStatus ? 'Updating...' : 'Advance Status Stage (Demo)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Visual Tracking Timeline */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="trail-sign-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Consignment Progression</Text>
            </View>
            <Text style={styles.sectionBadge}>
              {currentStageIndex >= 0
                ? `Step ${currentStageIndex + 1} of 5`
                : 'Cancelled'}
            </Text>
          </View>

          <View style={styles.timelineContainer}>
            {ORDER_STAGES.map((stage, idx) => {
              const isPassed = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              const isPending = currentStageIndex < idx;
              const isLast = idx === ORDER_STAGES.length - 1;

              return (
                <View key={stage.key} style={styles.timelineRow}>
                  {/* Left Column: Icon node & connector line */}
                  <View style={styles.timelineNodeCol}>
                    <View
                      style={[
                        styles.timelineNode,
                        isPassed && styles.timelineNodePassed,
                        isCurrent && styles.timelineNodeCurrent,
                        isPending && styles.timelineNodePending,
                      ]}
                    >
                      {isPassed ? (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.textInverse}
                        />
                      ) : isCurrent ? (
                        <View style={styles.timelineNodePulse} />
                      ) : (
                        <Text style={styles.timelineNodePendingNumber}>
                          {idx + 1}
                        </Text>
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineConnectorLine,
                          isPassed && styles.timelineConnectorLineDone,
                        ]}
                      />
                    )}
                  </View>

                  {/* Right Column: Stage Details */}
                  <View style={styles.timelineTextCol}>
                    <View style={styles.timelineStageHeader}>
                      <Text
                        style={[
                          styles.timelineStageTitle,
                          (isPassed || isCurrent) && styles.timelineStageTitleActive,
                        ]}
                      >
                        {stage.label}
                      </Text>
                      {isCurrent && (
                        <View style={styles.currentStageTag}>
                          <Text style={styles.currentStageTagText}>CURRENT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.timelineStageDesc}>
                      {stage.description}
                    </Text>

                    {/* Metadata for specific active stage */}
                    {stage.key === 'Dispatched' && order.trackingNumber && (
                      <View style={styles.trackingInfoBox}>
                        <Ionicons
                          name="barcode-outline"
                          size={14}
                          color={colors.primary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.trackingInfoText}>
                          {order.carrierName || 'Freight Carrier'}: {order.trackingNumber}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 4. Ordered Wholesale Products */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="cube-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Wholesale Items</Text>
            </View>
            <Text style={styles.sectionMetaCount}>
              {order.totalItems || items.length} {items.length === 1 ? 'item' : 'items'} • {order.totalUnits || 0} units
            </Text>
          </View>

          <View style={styles.itemsList}>
            {items.map((item, index) => {
              const unitPrice = Number(item.unitPrice || item.price || 0);
              const originalPrice = Number(item.originalPrice || unitPrice);
              const lineTotal = Number(item.itemTotal || unitPrice * (item.quantity || 1));
              const hasDiscount = originalPrice > unitPrice;

              return (
                <TouchableOpacity
                  key={item.productId || item.id || `item-${index}`}
                  style={[
                    styles.orderItemCard,
                    index < items.length - 1 && styles.orderItemBorder,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleProductPress(item)}
                >
                  <View style={styles.itemImageWrapper}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.itemImageFallback}>
                        <Ionicons name="cube-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}
                  </View>

                  <View style={styles.itemContent}>
                    <Text style={styles.itemProductName} numberOfLines={2}>
                      {item.title || item.name || 'Product'}
                    </Text>

                    <View style={styles.itemPricingRow}>
                      <Text style={styles.itemPriceText}>
                        ₹{unitPrice.toLocaleString('en-IN')}/{item.unit || 'unit'}
                      </Text>
                      {hasDiscount && (
                        <Text style={styles.itemOriginalPriceText}>
                          ₹{originalPrice.toLocaleString('en-IN')}
                        </Text>
                      )}
                    </View>

                    <View style={styles.itemQuantityBadgeRow}>
                      <View style={styles.quantityTag}>
                        <Text style={styles.quantityTagText}>
                          Qty: {item.quantity || 1} {item.unit ? `${item.unit}s` : 'units'}
                        </Text>
                      </View>

                      {item.quotationId && (
                        <View style={[styles.bulkTierTag, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                          <Ionicons
                            name="document-text-outline"
                            size={10}
                            color={colors.primary}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={[styles.bulkTierTagText, { color: colors.primary }]}>
                            Agreed Price Request #{String(item.quotationId).slice(-6)}
                          </Text>
                        </View>
                      )}

                      {item.activeTier && (
                        <View style={styles.bulkTierTag}>
                          <Ionicons
                            name="pricetag-outline"
                            size={10}
                            color={colors.success}
                            style={{ marginRight: 3 }}
                          />
                          <Text style={styles.bulkTierTagText}>
                            Tier: {item.activeTier.minQuantity}+ units
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.itemTotalCol}>
                    <Text style={styles.itemTotalLabel}>Line Total</Text>
                    <Text style={styles.itemTotalAmount}>
                      ₹{lineTotal.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5. Delivery Destination Address */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Delivery Destination</Text>
            </View>
          </View>

          <View style={styles.addressBox}>
            <View style={styles.addressNameRow}>
              <Text style={styles.recipientName}>{delivery.fullName || 'Purchaser'}</Text>
              {delivery.businessName && (
                <View style={styles.bizNameBadge}>
                  <Text style={styles.bizNameText}>{delivery.businessName}</Text>
                </View>
              )}
            </View>

            <Text style={styles.addressStreet}>
              {delivery.streetAddress || 'Warehouse Dock / Delivery Address'}
            </Text>
            <Text style={styles.addressCityState}>
              {[delivery.city, delivery.state, delivery.pincode]
                .filter(Boolean)
                .join(', ')}
            </Text>

            <View style={styles.phoneGstinRow}>
              {delivery.phone && (
                <View style={styles.contactItem}>
                  <Ionicons
                    name="call-outline"
                    size={14}
                    color={colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.contactText}>+91 {delivery.phone}</Text>
                </View>
              )}
              {delivery.gstin && (
                <View style={styles.contactItem}>
                  <Ionicons
                    name="document-text-outline"
                    size={14}
                    color={colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.contactText}>GSTIN: {delivery.gstin}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 6. Payment & Order Terms */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="wallet-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Payment & Terms</Text>
            </View>
          </View>

          <View style={styles.paymentTermsRow}>
            <View style={styles.paymentMethodBox}>
              <Ionicons
                name="card-outline"
                size={20}
                color={colors.primary}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentMethodTitle}>
                  {order.paymentMethod || 'Trade Credit / RTGS / NEFT'}
                </Text>
                <Text style={styles.paymentMethodSubtitle}>
                  Wholesale Settlement Terms: Net 30 Order Terms Invoice
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.assuranceNote}>
            <Ionicons
              name="shield-checkmark"
              size={18}
              color={colors.success}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.assuranceNoteText}>
              Protected by VyaparSetu Wholesale Buyer Assurance. Funds released after dock inspection sign-off.
            </Text>
          </View>
        </View>

        {/* 7. Price Breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="calculator-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Price Breakdown</Text>
            </View>
          </View>

          <View style={styles.breakdownTable}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Wholesale Subtotal</Text>
              <Text style={styles.breakdownValue}>
                ₹{(Number(order.subtotal) || Number(order.totalAmount) || 0).toLocaleString('en-IN')}
              </Text>
            </View>

            {(Number(order.totalSavings) || 0) > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.success }]}>
                  Wholesale Tier Savings
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.success }]}>
                  - ₹{(Number(order.totalSavings) || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Freight & Dock Handling</Text>
              <Text style={[styles.breakdownValue, { color: colors.success }]}>
                FREE
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Estimated GST / Tax</Text>
              <Text style={styles.breakdownValue}>Included in Wholesale Price</Text>
            </View>

            <View style={styles.grandTotalDivider} />

            <View style={styles.breakdownRow}>
              <Text style={styles.grandTotalLabel}>Grand Total Amount</Text>
              <Text style={styles.grandTotalValue}>
                ₹{(Number(order.totalAmount) || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* 8. Bottom Action Buttons */}
        <View style={styles.actionButtonGroup}>
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={handleReorder}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Order again to cart"
          >
            <Ionicons
              name="repeat-outline"
              size={18}
              color={colors.textInverse}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.reorderButtonText}>Order Again to Cart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => {
              if (onNavigateToOrderHistory) onNavigateToOrderHistory();
              else if (navigation?.navigate) navigation.navigate('OrderHistory');
              else handleBack();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View All Orders"
          >
            <Ionicons
              name="receipt-outline"
              size={18}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.historyButtonText}>All Orders</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerActionBtn: {
    padding: spacing.xs + 2,
  },
  headerSpacer: {
    width: 32,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  heroStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroOrderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  heroStatusHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  heroStatusDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  advanceStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight + '15',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight + '30',
  },
  advanceStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  sectionMetaCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timelineContainer: {
    paddingLeft: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineNodeCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 2,
    borderColor: colors.borderDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineNodePassed: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  timelineNodeCurrent: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 2.5,
  },
  timelineNodePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  timelineNodePending: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  timelineNodePendingNumber: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
  },
  timelineConnectorLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: colors.borderDark,
    marginVertical: 2,
  },
  timelineConnectorLineDone: {
    backgroundColor: colors.success,
  },
  timelineTextCol: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.md,
  },
  timelineStageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineStageTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timelineStageTitleActive: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  currentStageTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  currentStageTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  timelineStageDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  trackingInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackingInfoText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  itemsList: {
    marginTop: spacing.xs,
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  orderItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImageWrapper: {
    width: 54,
    height: 54,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImageFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemProductName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 17,
  },
  itemPricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: spacing.sm,
  },
  itemPriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemOriginalPriceText: {
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemQuantityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.xs,
  },
  quantityTag: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  quantityTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bulkTierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  bulkTierTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  itemTotalCol: {
    alignItems: 'flex-end',
  },
  itemTotalLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  itemTotalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  addressBox: {
    paddingVertical: spacing.xs,
  },
  addressNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bizNameBadge: {
    backgroundColor: colors.primaryLight + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  bizNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  addressStreet: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  addressCityState: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  phoneGstinRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  paymentTermsRow: {
    paddingVertical: spacing.xs,
  },
  paymentMethodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentMethodSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  assuranceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  assuranceNoteText: {
    flex: 1,
    fontSize: 11,
    color: colors.textPrimary,
    lineHeight: 16,
    fontWeight: '500',
  },
  breakdownTable: {
    paddingVertical: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  grandTotalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  reorderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  reorderButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
  historyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingVertical: spacing.sm + 4,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  notFoundIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  notFoundDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  returnButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
});

