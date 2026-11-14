import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  StatusBar,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

export default function OrderConfirmationScreen({
  navigation,
  route,
  onNavigateToHome,
  onNavigateToCatalog,
  onNavigateToOrderDetails,
  onNavigateToOrders,
  onNavigateToOrderHistory,
}) {
  const order = route?.params?.order || {};
  const orderId = order.id || route?.params?.orderId || 'VS-ORDER';
  const items = order.items || [];
  const address = order.deliveryAddress || {};

  const handleTrackOrder = () => {
    if (onNavigateToOrderDetails) {
      onNavigateToOrderDetails({ order, orderId });
    } else if (navigation?.navigate) {
      navigation.navigate('OrderDetails', { order, orderId });
    }
  };

  const handleGoOrders = () => {
    if (onNavigateToOrderHistory) {
      onNavigateToOrderHistory();
    } else if (onNavigateToOrders) {
      onNavigateToOrders();
    } else if (navigation?.navigate) {
      navigation.navigate('OrderHistory');
    }
  };

  const handleGoHome = () => {
    if (onNavigateToHome) {
      onNavigateToHome();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  };

  const handleGoCatalog = () => {
    if (onNavigateToCatalog) {
      onNavigateToCatalog();
    } else if (navigation?.navigate) {
      navigation.navigate('ProductListing');
    }
  };

  const handleShareOrder = async () => {
    try {
      await Share.share({
        message: `VyaparSetu Wholesale Order Confirmed!\nOrder ID: ${orderId}\nTotal Amount: ₹${(
          order.totalAmount || 0
        ).toLocaleString('en-IN')}\nStatus: ${order.status || 'Confirmed'}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Order Confirmation</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareOrder}
          activeOpacity={0.7}
          accessibilityLabel="Share Order Details"
        >
          <Ionicons
            name="share-social-outline"
            size={20}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Confirmation Card */}
        <View style={styles.heroCard}>
          <View style={styles.successIconWrapper}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={colors.success}
            />
          </View>

          <Text style={styles.heroTitle}>Order Placed Successfully!</Text>
          <Text style={styles.heroSubtitle}>
            Thank you for trading on VyaparSetu. Your wholesale order and commercial quotation have been verified.
          </Text>

          {/* Order ID Pill */}
          <View style={styles.orderIdBadge}>
            <Text style={styles.orderIdLabel}>Order ID:</Text>
            <Text style={styles.orderIdValue}>#{orderId}</Text>
          </View>
        </View>

        {/* 2. Order Metadata & Status Card */}
        <View style={styles.sectionCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Order Date</Text>
              <Text style={styles.metaValue}>
                {order.orderDate || new Date().toLocaleDateString('en-IN')}
              </Text>
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Order Status</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>
                  {order.status || 'Confirmed'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Payment Terms</Text>
              <Text style={styles.metaValue}>
                {order.paymentMethod || 'Trade Credit / Bank Settlement'}
              </Text>
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Total Ordered</Text>
              <Text style={styles.metaValueHighlight}>
                {order.totalUnits || items.length} Units (₹
                {(order.totalAmount || 0).toLocaleString('en-IN')})
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Delivery Information Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>Delivery Destination</Text>
          </View>

          <View style={styles.addressBox}>
            <Text style={styles.addressName}>{address.name || 'Recipient'}</Text>
            {address.businessName ? (
              <Text style={styles.addressCompany}>{address.businessName}</Text>
            ) : null}

            <Text style={styles.addressStreet}>{address.street || 'Address'}</Text>
            <Text style={styles.addressLocation}>
              {address.city ? `${address.city}, ` : ''}
              {address.state ? `${address.state} - ` : ''}
              {address.pincode || ''}
            </Text>

            <View style={styles.phoneRow}>
              <Ionicons
                name="call-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.addressPhone}>+91 {address.phone || ''}</Text>
            </View>

            {address.gstin ? (
              <View style={styles.gstinRow}>
                <Text style={styles.gstinLabel}>GSTIN: </Text>
                <Text style={styles.gstinValue}>{address.gstin}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.freightNotice}>
            <MaterialCommunityIcons
              name="truck-fast-outline"
              size={18}
              color={colors.info}
            />
            <Text style={styles.freightNoticeText}>
              Estimated dispatch in 24–48 hours via VyaparSetu Logistics. Direct warehouse docking.
            </Text>
          </View>
        </View>

        {/* 4. Ordered Items Breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="cube-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>
              Ordered Products ({items.length})
            </Text>
          </View>

          <View style={styles.itemsList}>
            {items.map((item, index) => {
              const imageUri = item.image || null;
              const unitSingular = item.unit || 'unit';

              return (
                <View
                  key={`conf-item-${item.id || index}`}
                  style={[
                    styles.itemRow,
                    index > 0 && styles.itemRowBorder,
                  ]}
                >
                  <View style={styles.itemImageContainer}>
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.itemImageFallback}>
                        <Ionicons
                          name="cube-outline"
                          size={20}
                          color={colors.textMuted}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.name || 'Wholesale Product'}
                    </Text>
                    <Text style={styles.itemSeller} numberOfLines={1}>
                      Seller: {item.sellerName || 'Verified Seller'}
                    </Text>
                    <View style={styles.qtyPriceRow}>
                      <Text style={styles.itemQtyPrice}>
                        {item.quantity} {unitSingular}s × ₹{item.unitPrice}
                      </Text>
                      {item.activeTier && (
                        <View style={styles.bulkTierPill}>
                          <Text style={styles.bulkTierPillText}>Bulk Tier</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={styles.itemTotal}>
                    ₹{(item.itemTotal || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 5. Financial Summary Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons
              name="receipt-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>Payment & Price Summary</Text>
          </View>

          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items Subtotal</Text>
              <Text style={styles.summaryValue}>
                ₹{(order.subtotal || 0).toLocaleString('en-IN')}
              </Text>
            </View>

            {order.totalSavings > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summarySavingsLabel}>
                  Bulk Tier Discount Savings
                </Text>
                <Text style={styles.summarySavingsValue}>
                  -₹{order.totalSavings.toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cargo Freight & Shipping</Text>
              <Text style={styles.summaryFree}>FREE</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Commercial GST Invoice</Text>
              <Text style={styles.summaryMuted}>Included</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalAmount}>
                ₹{(order.totalAmount || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Navigation Actions */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleTrackOrder}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Track Order & Details"
          >
            <Ionicons
              name="trail-sign-outline"
              size={20}
              color={colors.textInverse}
              style={styles.actionButtonIcon}
            />
            <Text style={styles.primaryActionText}>Track Order & Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleGoOrders}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View All Orders"
          >
            <Ionicons
              name="receipt-outline"
              size={18}
              color={colors.primary}
              style={styles.actionButtonIcon}
            />
            <Text style={styles.secondaryActionText}>
              View All Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={handleGoHome}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
          >
            <Ionicons
              name="home-outline"
              size={18}
              color={colors.textSecondary}
              style={styles.actionButtonIcon}
            />
            <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>
              Back to Home
            </Text>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 36,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 1.5,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  successIconWrapper: {
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.sm,
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  orderIdLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  orderIdValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm + 2,
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  addressBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: 3,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addressCompany: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  addressStreet: {
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 2,
  },
  addressLocation: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addressPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  gstinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  gstinLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  gstinValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  freightNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.infoLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  freightNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.info,
    fontWeight: '500',
    lineHeight: 16,
  },
  itemsList: {
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemImageContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 17,
  },
  itemSeller: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  qtyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  itemQtyPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bulkTierPill: {
    backgroundColor: colors.surplusLight,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  bulkTierPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.surplus,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryTable: {
    gap: spacing.xs + 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summarySavingsLabel: {
    fontSize: 13,
    color: colors.surplus,
    fontWeight: '600',
  },
  summarySavingsValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.surplus,
  },
  summaryFree: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  summaryMuted: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  grandTotalAmount: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.primary,
  },
  actionButtonsContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
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
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  actionButtonIcon: {
    marginRight: spacing.xs + 2,
  },
});

