import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  getQuotationById,
  acceptQuotationByBuyer,
  rejectQuotationByBuyer,
  getQuotationStatusColor,
  subscribeQuotations,
} from '../data/quotations';
import { useCart } from '../context/CartContext';

export default function BuyerQuotationDetailsScreen({
  navigation,
  route,
  quotation: propQuotation,
  onBackPress,
  onNavigateToCart,
  onNavigateToCheckout,
  onNavigateToProductDetails,
  onNavigateToOrderDetails,
}) {
  const quotationId = useMemo(() => {
    return (
      route?.params?.quotationId ||
      route?.params?.quotation?.id ||
      propQuotation?.id ||
      'QUOT-SH-9102'
    );
  }, [route?.params, propQuotation]);

  const [quotation, setQuotation] = useState(() => {
    return propQuotation || route?.params?.quotation || getQuotationById(quotationId);
  });

  const [actionLoading, setActionLoading] = useState(false);
  const cart = useCart();

  // Subscribe to reactive quotation updates
  useEffect(() => {
    const found = getQuotationById(quotationId);
    if (found) setQuotation(found);

    return subscribeQuotations(() => {
      const updated = getQuotationById(quotationId);
      if (updated) setQuotation(updated);
    });
  }, [quotationId]);

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  }, [onBackPress, navigation]);

  const handleProductPress = useCallback(() => {
    if (quotation?.product) {
      if (onNavigateToProductDetails) {
        onNavigateToProductDetails({
          productId: quotation.product.id,
          product: quotation.product,
        });
      } else if (navigation?.navigate) {
        navigation.navigate('ProductDetails', {
          productId: quotation.product.id,
          product: quotation.product,
        });
      }
    }
  }, [quotation?.product, onNavigateToProductDetails, navigation]);

  // Handler: Accept Quotation
  const handleAcceptQuotation = useCallback(() => {
    if (!quotation) return;

    const unitPrice = quotation.quotedUnitPrice || quotation.product?.price || 0;
    const qty = quotation.quotedQuantity || quotation.requestedQuantity || 1;
    const total = quotation.quotedTotalAmount || unitPrice * qty;

    Alert.alert(
      'Accept Wholesale Quotation',
      `Accept quotation #${quotation.id} for ${qty} ${quotation.product?.unit || 'units'} at ₹${unitPrice}/unit?\n\nTotal Consignment Value: ₹${total.toLocaleString('en-IN')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Quote',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await acceptQuotationByBuyer(quotation.id);
              if (res.success) {
                setQuotation(res.quotation);
                Alert.alert(
                  'Quotation Accepted!',
                  `You have accepted the quotation terms. Would you like to add this consignment to your cart at the locked price of ₹${unitPrice}/unit and proceed?`,
                  [
                    { text: 'Keep in Quotations', style: 'cancel' },
                    {
                      text: 'Add to Cart & Checkout',
                      style: 'default',
                      onPress: () => {
                        handleAddToCartAndCheckout(res.quotation);
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Unable to Accept', res.message || 'Failed to accept quotation.');
              }
            } catch (err) {
              console.warn('Accept quote error:', err);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [quotation]);

  // Handler: Decline Quotation
  const handleRejectQuotation = useCallback(() => {
    if (!quotation) return;

    Alert.alert(
      'Decline Quotation',
      `Are you sure you want to decline this quotation?\n\nThe supplier will be notified that you are not proceeding with these commercial terms.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline Quote',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await rejectQuotationByBuyer(
                quotation.id,
                'Buyer declined quoted commercial terms.'
              );
              if (res.success) {
                setQuotation(res.quotation);
                Alert.alert('Quotation Declined', 'This quotation has been marked as declined.');
              } else {
                Alert.alert('Error', res.message || 'Failed to decline quotation.');
              }
            } catch (err) {
              console.warn('Decline quote error:', err);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [quotation]);

  // Handler: Add to Cart at Quoted Price and Proceed to Checkout
  const handleAddToCartAndCheckout = useCallback(
    (quoteItem = quotation) => {
      if (!quoteItem || !quoteItem.product) return;

      const qty = quoteItem.quotedQuantity || quoteItem.requestedQuantity || 1;
      const unitPrice =
        quoteItem.quotedUnitPrice !== undefined && quoteItem.quotedUnitPrice !== null
          ? quoteItem.quotedUnitPrice
          : quoteItem.buyerTargetPrice || quoteItem.product.price;

      if (cart?.addToCart) {
        cart.addToCart(quoteItem.product, qty, {
          replace: true,
          unitPrice: Number(unitPrice),
          quotationId: quoteItem.id,
          quotationNumber: quoteItem.quotationNumber || quoteItem.id,
          quotationDetails: {
            quotedUnitPrice: Number(unitPrice),
            quotedQuantity: qty,
            validUntil: quoteItem.validUntil,
            sellerNotes: quoteItem.sellerNotes,
            freightTerms: quoteItem.freightTerms,
          },
        });
      }

      if (onNavigateToCart) {
        onNavigateToCart();
      } else if (onNavigateToCheckout) {
        onNavigateToCheckout();
      } else if (navigation?.navigate) {
        navigation.navigate('Cart');
      }
    },
    [quotation, cart, onNavigateToCart, onNavigateToCheckout, navigation]
  );

  if (!quotation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quotation Not Found</Text>
        </View>
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.notFoundText}>The requested quotation could not be located.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = getQuotationStatusColor(quotation.status);
  const prod = quotation.product || {};
  const imageUri = prod.image || (Array.isArray(prod.images) ? prod.images[0] : null);

  const hasSellerResponse =
    quotation.quotedUnitPrice !== undefined && quotation.quotedUnitPrice !== null;
  const isPending =
    quotation.status === 'Submitted' || quotation.status === 'Pending';
  const isQuoteProvided =
    quotation.status === 'Quotation Provided' || quotation.status === 'Quote Provided';
  const isCounterOffer = Boolean(quotation.isCounterOffer);
  const isAccepted =
    quotation.status === 'Accepted' || quotation.status === 'Ordered';
  const isRejected =
    quotation.status?.includes('Rejected') || quotation.status?.includes('Declined');
  const isOrdered = quotation.status === 'Ordered';

  const effectiveQty = Number(quotation.quotedQuantity) || Number(quotation.requestedQuantity) || 1;
  const quotedPrice = Number(quotation.quotedUnitPrice) || 0;
  const catalogPrice = Number(prod.price) || 0;
  const targetPrice = Number(quotation.buyerTargetPrice) || 0;

  const totalAmount =
    Number(quotation.quotedTotalAmount) ||
    (hasSellerResponse ? quotedPrice * effectiveQty : targetPrice ? targetPrice * effectiveQty : catalogPrice * effectiveQty);

  const perUnitSavings = catalogPrice > quotedPrice ? catalogPrice - quotedPrice : 0;
  const totalSavings = perUnitSavings * effectiveQty;
  const savingsPercent = catalogPrice > 0 ? Math.round((perUnitSavings / catalogPrice) * 100) : 0;

  // Validity calculation
  let validityText = 'Standard Terms';
  let isExpired = false;
  if (quotation.validUntil) {
    const expiry = new Date(quotation.validUntil);
    const now = new Date();
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      validityText = 'Expired';
      isExpired = true;
    } else if (diffDays === 0) {
      validityText = 'Expires Today';
    } else {
      validityText = `Valid for ${diffDays} more ${diffDays === 1 ? 'day' : 'days'}`;
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Top Header */}
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
          <Text style={styles.headerTitle}>Price Request #{quotation.id || quotation.quotationNumber}</Text>
          <Text style={styles.headerSubtitle}>
            Requested {new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
          <Ionicons name={statusCfg.icon} size={13} color={statusCfg.text} style={{ marginRight: 4 }} />
          <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner for Suggest a Different Price */}
        {isCounterOffer && (
          <View style={styles.counterBanner}>
            <Ionicons name="swap-horizontal" size={18} color="#92400E" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.counterBannerTitle}>Seller Suggested a Different Price</Text>
              <Text style={styles.counterBannerSubtitle}>
                Offer a different price to the buyer. Seller proposed {quotation.quotedQuantity} units at ₹{quotation.quotedUnitPrice}/unit.
              </Text>
            </View>
          </View>
        )}

        {/* Banner for Accepted */}
        {isAccepted && (
          <View style={styles.acceptedBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#065F46" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.acceptedBannerTitle}>Price Request Accepted</Text>
              <Text style={styles.acceptedBannerSubtitle}>
                {isOrdered
                  ? `Order has been placed (Consignment #${quotation.orderId || 'Active'}).`
                  : 'Agreed wholesale pricing is locked. You can now checkout.'}
              </Text>
            </View>
          </View>
        )}

        {/* Product Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={handleProductPress}
        >
          <View style={styles.productRow}>
            <View style={styles.thumbnailContainer}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
              ) : (
                <View style={styles.thumbnailFallback}>
                  <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
                </View>
              )}
            </View>

            <View style={styles.productDetails}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {prod.title || prod.name || 'Wholesale Product'}
              </Text>

              <View style={styles.supplierRow}>
                <Ionicons name="storefront-outline" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.supplierText} numberOfLines={1}>
                  Seller: {quotation.sellerName || prod.sellerName || 'Verified Seller'}
                </Text>
              </View>

              <View style={styles.metaBadgeRow}>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>
                    Catalog: ₹{catalogPrice}/{prod.unit || 'unit'}
                  </Text>
                </View>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>
                    Min. Order: {prod.moq || 1} {prod.unit || 'units'}
                  </Text>
                </View>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Order Terms Comparison Table */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Order Terms Comparison</Text>

          {/* Quantity */}
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Volume / Quantity</Text>
            <View style={styles.compareValues}>
              <Text style={styles.compareValueRequested}>
                Req: {quotation.requestedQuantity} {prod.unit || 'units'}
              </Text>
              {quotation.quotedQuantity ? (
                <Text style={styles.compareValueQuoted}>
                  Quoted: {quotation.quotedQuantity} {prod.unit || 'units'}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.rowDivider} />

          {/* Unit Price Comparison */}
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Unit Price</Text>
            <View style={styles.compareValues}>
              {quotation.buyerTargetPrice ? (
                <Text style={styles.compareValueTarget}>
                  Target: ₹{quotation.buyerTargetPrice}
                </Text>
              ) : null}
              {hasSellerResponse ? (
                <View style={styles.quotedPriceBox}>
                  <Text style={styles.compareValueQuotedBig}>
                    ₹{quotedPrice}
                  </Text>
                  {savingsPercent > 0 && (
                    <View style={styles.savingsTag}>
                      <Text style={styles.savingsTagText}>{savingsPercent}% Off</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.pendingText}>Pending Supplier Quote</Text>
              )}
            </View>
          </View>
          <View style={styles.rowDivider} />

          {/* Total Value & Savings */}
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Consignment Value</Text>
            <View style={styles.compareValues}>
              <Text style={styles.totalValueText}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </Text>
              {totalSavings > 0 && (
                <Text style={styles.savingsTotalText}>
                  Total Savings: ₹{totalSavings.toLocaleString('en-IN')}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.rowDivider} />

          {/* Validity */}
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Quote Validity</Text>
            <View style={styles.compareValues}>
              <Text style={[styles.validityBadgeText, isExpired && { color: colors.error }]}>
                {validityText}
              </Text>
              {quotation.validUntil && (
                <Text style={styles.expiryDateSubtext}>
                  Until {new Date(quotation.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.rowDivider} />

          {/* Dispatch Timeline */}
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Dispatch Timeline</Text>
            <Text style={styles.compareValueText}>
              {quotation.dispatchTimeline || quotation.requiredByDate || 'Standard Freight'}
            </Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Payment Terms */}
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Payment Terms</Text>
            <Text style={styles.compareValueText}>
              {quotation.paymentTerms || '50% Advance + 50% on Delivery'}
            </Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Freight & Tax Terms */}
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel}>Freight & Taxes</Text>
            <Text style={styles.compareValueText}>
              {quotation.freightTerms || 'Standard B2B terms apply.'}
            </Text>
          </View>
        </View>

        {/* Supplier Remarks & Notes */}
        {Boolean(quotation.sellerNotes) && (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeading}>Seller Order Remarks</Text>
            </View>
            <View style={styles.quoteBox}>
              <Text style={styles.quoteBoxText}>{quotation.sellerNotes}</Text>
            </View>
          </View>
        )}

        {/* Buyer Notes */}
        {Boolean(quotation.buyerNotes) && (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="document-text-outline" size={17} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeading}>Your Original Specifications</Text>
            </View>
            <Text style={styles.buyerNotesText}>{quotation.buyerNotes}</Text>
          </View>
        )}

        {/* Rejection / Decline Notice */}
        {isRejected && (
          <View style={styles.declineCard}>
            <Ionicons name="close-circle-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.declineTitle}>Price Request Declined</Text>
              <Text style={styles.declineReason}>
                {quotation.rejectionReason || quotation.buyerRejectionReason || 'Order terms were not concluded.'}
              </Text>
            </View>
          </View>
        )}

        {/* Destination Information */}
        {Boolean(quotation.deliveryAddress) && (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="location-outline" size={17} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeading}>Delivery Address</Text>
            </View>
            <Text style={styles.destinationBusiness}>
              {quotation.deliveryAddress?.businessName || quotation.deliveryAddress?.fullName}
            </Text>
            <Text style={styles.destinationAddress}>
              {[
                quotation.deliveryAddress?.streetAddress,
                quotation.deliveryAddress?.city,
                quotation.deliveryAddress?.state,
                quotation.deliveryAddress?.pincode,
              ]
                .filter(Boolean)
                .join(', ')}
            </Text>
            {quotation.deliveryAddress?.phone && (
              <Text style={styles.destinationPhone}>
                Contact: {quotation.deliveryAddress.phone}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        {(isQuoteProvided || isCounterOffer) && (
          <View style={styles.footerActionsRow}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={handleRejectQuotation}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.error} style={{ marginRight: 4 }} />
              <Text style={styles.declineBtnText}>Decline Price Request</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, isExpired && styles.btnDisabled]}
              onPress={handleAcceptQuotation}
              disabled={actionLoading || isExpired}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
                  <Text style={styles.acceptBtnText}>Accept Price & Order Terms</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isAccepted && !isOrdered && (
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => handleAddToCartAndCheckout(quotation)}
            activeOpacity={0.8}
          >
            <Ionicons name="cart-outline" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
            <Text style={styles.checkoutBtnText}>
              Add to Cart & Proceed to Checkout
            </Text>
          </TouchableOpacity>
        )}

        {isOrdered && (
          <TouchableOpacity
            style={styles.viewOrderBtn}
            onPress={() => {
              if (onNavigateToOrderDetails && quotation.orderId) {
                onNavigateToOrderDetails({ orderId: quotation.orderId });
              } else if (navigation?.navigate) {
                navigation.navigate('OrderHistory');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.viewOrderBtnText}>View Placed Wholesale Order</Text>
          </TouchableOpacity>
        )}

        {isPending && (
          <View style={styles.pendingFooterNotice}>
            <Ionicons name="time-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.pendingFooterText}>
              Awaiting supplier to respond with formal price quotation and delivery terms.
            </Text>
          </View>
        )}
      </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  counterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  counterBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  counterBannerSubtitle: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  acceptedBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  acceptedBannerSubtitle: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supplierText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metaBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs + 2,
  },
  compareLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 120,
  },
  compareValues: {
    flex: 1,
    alignItems: 'flex-end',
  },
  compareValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  compareValueRequested: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  compareValueQuoted: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  compareValueTarget: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  quotedPriceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compareValueQuotedBig: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  savingsTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  savingsTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  totalValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  savingsTotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
    marginTop: 2,
  },
  validityBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  expiryDateSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  pendingText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  quoteBox: {
    backgroundColor: colors.primaryLight + '10',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  quoteBoxText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textPrimary,
  },
  buyerNotesText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    marginTop: 2,
  },
  declineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  declineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },
  declineReason: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 2,
  },
  destinationBusiness: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  destinationAddress: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  destinationPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  footerActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surface,
    flex: 1,
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    flex: 2,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
  },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textInverse,
  },
  viewOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  viewOrderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  pendingFooterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  pendingFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  notFoundText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

