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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  getOrderById,
  subscribeOrders,
  getStatusColor,
  getStatusProgress,
  ORDER_STAGES,
  getSellerOrderDetails,
  acceptOrder,
  rejectOrder,
  updateSellerOrderStatus,
  canTransitionStatus,
} from '../data/orders';
import {
  getSessionBusinessProfile,
  getBusinessById,
  businesses,
} from '../data/businessProfileData';
import { products as defaultProducts } from '../data/products';
import orderService from '../services/orderService';

export default function SellerOrderDetailsScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToSellerOrders,
  onNavigateToProductDetails,
  onNavigateToBusinessProfile,
}) {
  const sessionProfile = getSessionBusinessProfile();

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

  const [actionLoading, setActionLoading] = useState(false);

  // Sync with global orders state
  useEffect(() => {
    let isMounted = true;
    if (initialOrderId) {
      const found = getOrderById(initialOrderId);
      if (found) {
        setOrder(found);
      } else {
        orderService
          .fetchOrderDetails(initialOrderId)
          .then((res) => {
            const remote = res?.data || res;
            if (isMounted && remote && remote.id) {
              setOrder(remote);
            }
          })
          .catch(() => {});
      }
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
    } else if (onNavigateToSellerOrders) {
      onNavigateToSellerOrders({ businessId });
    }
  }, [onBackPress, navigation, onNavigateToSellerOrders, businessId]);

  const handleShareOrder = useCallback(async () => {
    if (!order) return;
    try {
      await Share.share({
        message: `VyaparSetu Consignment #${order.id}\nStatus: ${order.status}\nBuyer: ${order.deliveryAddress?.businessName || order.deliveryAddress?.fullName || 'Buyer'}\nAmount: ₹${(Number(order.totalAmount) || 0).toLocaleString('en-IN')}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  }, [order]);

  const handleCallBuyer = useCallback((phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch((err) => {
      console.warn('Could not open phone dialer:', err);
    });
  }, []);

  const handleProductPress = useCallback(
    (item) => {
      if (!item) return;
      const productId = item.productId || item.id;
      if (onNavigateToProductDetails) {
        onNavigateToProductDetails({ productId, product: item });
      } else if (navigation?.navigate) {
        navigation.navigate('ProductDetails', {
          productId,
          product: item,
        });
      }
    },
    [onNavigateToProductDetails, navigation]
  );

  // Handler: Accept Order
  const handleAccept = useCallback(() => {
    if (!order) return;
    Alert.alert(
      'Accept Wholesale Order',
      `Accept order #${order.id}?\n\nThis confirms you can fulfill your products for this consignment and moves the status to Processing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Order',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await acceptOrder(
                order.id,
                businessId,
                'Accepted by supplier'
              );
              if (res.success) {
                setOrder(res.order);
                Alert.alert(
                  'Order Accepted',
                  `Order #${order.id} is now in Processing & Packing stage.`
                );
              } else {
                Alert.alert('Error', res.message || 'Failed to accept order.');
              }
            } catch (err) {
              console.warn('Failed to accept:', err);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [order, businessId]);

  // Handler: Reject Order
  const handleReject = useCallback(() => {
    if (!order) return;
    Alert.alert(
      'Reject Wholesale Order',
      `Reject order #${order.id}?\n\nThe buyer will be notified and this order will be cancelled. This cannot be undone.`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Reject Order',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await rejectOrder(
                order.id,
                businessId,
                'Supplier unable to fulfill stock requirements'
              );
              if (res.success) {
                setOrder(res.order);
                Alert.alert(
                  'Order Rejected',
                  `Order #${order.id} has been marked as Rejected.`
                );
              } else {
                Alert.alert('Error', res.message || 'Failed to reject order.');
              }
            } catch (err) {
              console.warn('Failed to reject:', err);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [order, businessId]);

  // Handler: Advance / Update Status through valid stages
  const handleUpdateStatus = useCallback(
    (targetStatus, promptTitle, promptMessage) => {
      if (!order) return;
      if (!canTransitionStatus(order.status, targetStatus)) {
        Alert.alert(
          'Invalid Status Update',
          `Cannot transition order from "${order.status}" to "${targetStatus}".`
        );
        return;
      }

      Alert.alert(
        promptTitle,
        promptMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm Update',
            style: 'default',
            onPress: async () => {
              setActionLoading(true);
              try {
                const res = await updateSellerOrderStatus(
                  order.id,
                  targetStatus,
                  {
                    carrierName: 'Delhivery B2B Freight',
                    trackingNumber: `DELHIVERY-B2B-${Math.floor(
                      100000 + Math.random() * 900000
                    )}`,
                  }
                );
                if (res.success) {
                  setOrder(res.order);
                  Alert.alert(
                    'Status Updated',
                    `Order status updated to "${targetStatus}".`
                  );
                } else {
                  Alert.alert('Error', res.message || 'Failed to update status.');
                }
              } catch (err) {
                console.warn('Update status error:', err);
              } finally {
                setActionLoading(false);
              }
            },
          },
        ]
      );
    },
    [order]
  );

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
          <Text style={styles.headerTitle}>Seller Order Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIconBox}>
            <Ionicons name="alert-circle-outline" size={54} color={colors.warning} />
          </View>
          <Text style={styles.notFoundTitle}>Order Not Found</Text>
          <Text style={styles.notFoundDesc}>
            We could not find order details for ID "{initialOrderId || 'Unknown'}".
          </Text>
          <TouchableOpacity
            style={styles.returnButton}
            onPress={handleBack}
          >
            <Ionicons name="receipt-outline" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
            <Text style={styles.returnButtonText}>Return to Customer Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sellerDetails = getSellerOrderDetails(order.id, businessId, defaultProducts);
  const sellerItems = sellerDetails?.sellerItems || [];
  const statusCfg = getStatusColor(order.status);
  const currentStageIndex = getStatusProgress(order.status);
  const delivery = order.deliveryAddress || {};

  const currentStatusClean = String(order.status || '').toLowerCase();
  const isPending =
    currentStatusClean === 'confirmed' ||
    currentStatusClean === 'pending' ||
    currentStatusClean === 'pending acceptance';

  const isProcessing =
    currentStatusClean === 'processing' || currentStatusClean === 'accepted';

  const isDispatched =
    currentStatusClean === 'dispatched' || currentStatusClean === 'in transit';

  const isOutForDelivery = currentStatusClean === 'out for delivery';
  const isDelivered = currentStatusClean === 'delivered';
  const isRejected = currentStatusClean === 'rejected' || currentStatusClean === 'cancelled';

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
          <Text style={styles.headerTitle}>Order #{order.id || order.orderNumber}</Text>
          <Text style={styles.headerSubtitle}>
            Received {order.orderDate || new Date(order.createdAt).toLocaleDateString('en-IN')}
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
        {/* 1. Hero Status & Seller Actions Card */}
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

          <Text style={styles.heroHeadline}>
            {isPending
              ? 'New Incoming Order Needs Your Action'
              : isProcessing
              ? 'Order Accepted — In Processing & Packing'
              : isDispatched
              ? 'Consignment Dispatched with Freight Carrier'
              : isOutForDelivery
              ? 'Consignment Out for Buyer Dock Delivery'
              : isDelivered
              ? 'Consignment Successfully Delivered'
              : 'Order Rejected / Cancelled'}
          </Text>

          <Text style={styles.heroSubtext}>
            {isPending
              ? 'Review the quantities and delivery terms below. Accept this order to start packing, or reject if unable to fulfill.'
              : isProcessing
              ? 'Pack the consignment and conduct dock inspection. When ready, mark as Dispatched.'
              : isDispatched
              ? `Carrier: ${order.carrierName || 'Delhivery B2B Freight'} • Tracking: ${order.trackingNumber || 'DELHIVERY-B2B-894102'}`
              : isOutForDelivery
              ? 'Transport driver is out for warehouse delivery at destination.'
              : isDelivered
              ? `Consignment completed on ${order.deliveredAt || order.orderDate || 'recent date'}.`
              : 'This order was rejected/cancelled and cannot be modified further.'}
          </Text>

          {/* Action Buttons for Current Status */}
          {isPending && (
            <View style={styles.heroActionsRow}>
              <TouchableOpacity
                style={styles.rejectHeroBtn}
                onPress={handleReject}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.rejectHeroBtnText}>Reject Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptHeroBtn}
                onPress={handleAccept}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
                <Text style={styles.acceptHeroBtnText}>Accept Order</Text>
              </TouchableOpacity>
            </View>
          )}

          {isProcessing && (
            <TouchableOpacity
              style={styles.advanceStatusBtn}
              onPress={() =>
                handleUpdateStatus(
                  'Dispatched',
                  'Dispatch Consignment',
                  'Confirm that the consignment has been handed over to the freight logistics carrier?'
                )
              }
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="airplane-outline" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
              <Text style={styles.advanceStatusBtnText}>
                {actionLoading ? 'Updating...' : 'Dispatch Consignment'}
              </Text>
            </TouchableOpacity>
          )}

          {isDispatched && (
            <TouchableOpacity
              style={styles.advanceStatusBtn}
              onPress={() =>
                handleUpdateStatus(
                  'Out for Delivery',
                  'Mark Out for Delivery',
                  'Confirm vehicle is out for destination warehouse dock delivery?'
                )
              }
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="car-outline" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
              <Text style={styles.advanceStatusBtnText}>
                {actionLoading ? 'Updating...' : 'Mark Out for Delivery'}
              </Text>
            </TouchableOpacity>
          )}

          {isOutForDelivery && (
            <TouchableOpacity
              style={[styles.advanceStatusBtn, { backgroundColor: colors.success }]}
              onPress={() =>
                handleUpdateStatus(
                  'Delivered',
                  'Confirm Final Delivery',
                  'Confirm the buyer has received and signed off on the consignment?'
                )
              }
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done-circle-outline" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
              <Text style={styles.advanceStatusBtnText}>
                {actionLoading ? 'Updating...' : 'Mark as Delivered'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Buyer Information Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="person-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Buyer Information</Text>
            </View>
          </View>

          <View style={styles.buyerDetailsBox}>
            <View style={styles.buyerNameRow}>
              <Text style={styles.buyerFullName}>{delivery.fullName || 'Purchaser'}</Text>
              {delivery.businessName && (
                <View style={styles.buyerBizBadge}>
                  <Text style={styles.buyerBizText}>{delivery.businessName}</Text>
                </View>
              )}
            </View>

            <Text style={styles.buyerStreet}>
              {delivery.streetAddress || 'Warehouse Dock / Delivery Address'}
            </Text>
            <Text style={styles.buyerCityState}>
              {[delivery.city, delivery.state, delivery.pincode]
                .filter(Boolean)
                .join(', ')}
            </Text>

            <View style={styles.contactBar}>
              {delivery.phone ? (
                <TouchableOpacity
                  style={styles.callBuyerBtn}
                  onPress={() => handleCallBuyer(delivery.phone)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.callBuyerText}>Call +91 {delivery.phone}</Text>
                </TouchableOpacity>
              ) : null}

              {delivery.gstin ? (
                <View style={styles.gstinPill}>
                  <Text style={styles.gstinText}>GSTIN: {delivery.gstin}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* 3. Products Belonging to This Seller */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="cube-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Your Products in this Order</Text>
            </View>
            <Text style={styles.sectionMetaCount}>
              {sellerDetails?.sellerItemCount || 0} {sellerDetails?.sellerItemCount === 1 ? 'item' : 'items'} • {sellerDetails?.sellerUnits || 0} units
            </Text>
          </View>

          {sellerDetails?.hasOtherSellerItems && (
            <View style={styles.multiSellerNotice}>
              <Ionicons name="information-circle-outline" size={16} color={colors.info} style={{ marginRight: 6 }} />
              <Text style={styles.multiSellerNoticeText}>
                This buyer's cart included items from multiple sellers. You are only fulfilling the {sellerDetails.sellerItemCount} {sellerDetails.sellerItemCount === 1 ? 'product' : 'products'} listed below.
              </Text>
            </View>
          )}

          <View style={styles.itemsList}>
            {sellerItems.map((item, index) => {
              const unitPrice = Number(item.unitPrice || item.price || 0);
              const originalPrice = Number(item.originalPrice || unitPrice);
              const lineTotal = Number(item.itemTotal || unitPrice * (item.quantity || 1));
              const hasDiscount = originalPrice > unitPrice;

              return (
                <TouchableOpacity
                  key={item.productId || item.id || `item-${index}`}
                  style={[
                    styles.orderItemCard,
                    index < sellerItems.length - 1 && styles.orderItemBorder,
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
                    <Text style={styles.itemTotalLabel}>Subtotal</Text>
                    <Text style={styles.itemTotalAmount}>
                      ₹{lineTotal.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. Financial Breakdown for Seller */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="calculator-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Consignment Financials</Text>
            </View>
          </View>

          <View style={styles.breakdownTable}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Your Items Subtotal</Text>
              <Text style={styles.breakdownValue}>
                ₹{(sellerDetails?.sellerSubtotal || 0).toLocaleString('en-IN')}
              </Text>
            </View>

            {(sellerDetails?.sellerSavings || 0) > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.success }]}>
                  Wholesale Volume Discount
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.success }]}>
                  - ₹{(sellerDetails.sellerSavings).toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Payment Settlement</Text>
              <Text style={styles.breakdownValue}>
                {order.paymentMethod || 'Trade Credit / RTGS'}
              </Text>
            </View>

            <View style={styles.grandTotalDivider} />

            <View style={styles.breakdownRow}>
              <Text style={styles.grandTotalLabel}>Your Payable Consignment Total</Text>
              <Text style={styles.grandTotalValue}>
                ₹{(sellerDetails?.sellerTotalAmount || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Consignment Progression Milestone Timeline */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="trail-sign-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sectionTitle}>Progression Milestone</Text>
            </View>
            <Text style={styles.sectionBadge}>
              {currentStageIndex >= 0 ? `Stage ${currentStageIndex + 1} of 5` : 'Terminal'}
            </Text>
          </View>

          <View style={styles.timelineContainer}>
            {ORDER_STAGES.map((stage, idx) => {
              const isPassed = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              const isPendingStage = currentStageIndex < idx;
              const isLast = idx === ORDER_STAGES.length - 1;

              return (
                <View key={stage.key} style={styles.timelineRow}>
                  <View style={styles.timelineNodeCol}>
                    <View
                      style={[
                        styles.timelineNode,
                        isPassed && styles.timelineNodePassed,
                        isCurrent && styles.timelineNodeCurrent,
                        isPendingStage && styles.timelineNodePending,
                      ]}
                    >
                      {isPassed ? (
                        <Ionicons name="checkmark" size={13} color={colors.textInverse} />
                      ) : isCurrent ? (
                        <View style={styles.timelineNodePulse} />
                      ) : (
                        <Text style={styles.timelineNodePendingNum}>{idx + 1}</Text>
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
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Return Button */}
        <TouchableOpacity
          style={styles.allOrdersBtn}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.allOrdersBtnText}>Back to Customer Orders</Text>
        </TouchableOpacity>
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
    color: colors.primary,
    fontWeight: '600',
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
  },
  heroHeadline: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  heroSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  rejectHeroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  rejectHeroBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  acceptHeroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
  },
  acceptHeroBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },
  advanceStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 3,
    marginTop: spacing.xs,
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
  advanceStatusBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
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
  sectionMetaCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  buyerDetailsBox: {
    paddingVertical: spacing.xs,
  },
  buyerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: 4,
  },
  buyerFullName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  buyerBizBadge: {
    backgroundColor: colors.primaryLight + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  buyerBizText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  buyerStreet: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  buyerCityState: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  contactBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  callBuyerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  callBuyerText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  gstinPill: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
  },
  gstinText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  multiSellerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  multiSellerNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.info,
    lineHeight: 16,
    fontWeight: '500',
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
    width: 52,
    height: 52,
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
  },
  itemTotalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  timelineContainer: {
    paddingLeft: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineNodeCol: {
    alignItems: 'center',
    width: 26,
  },
  timelineNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  timelineNodePending: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  timelineNodePendingNum: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '700',
  },
  timelineConnectorLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
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
  },
  timelineStageDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  allOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
  },
  allOrdersBtnText: {
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

