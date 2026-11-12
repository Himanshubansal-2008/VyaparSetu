import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  useCart,
  getProductMoq,
  getProductStock,
} from '../context/CartContext';
import EmptyState from '../components/EmptyState';

export default function CartScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToProductDetails,
  onNavigateToHome,
  onNavigateToCheckout,
  onNavigateToRequestQuotation,
  onNavigateToBuyerQuotations,
}) {
  const {
    cartItems,
    cartItemCount,
    totalUnits,
    subtotal,
    totalSavings,
    totalAmount,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  };

  const handleBrowseProducts = () => {
    if (onNavigateToHome) {
      onNavigateToHome();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    } else if (onBackPress) {
      onBackPress();
    }
  };

  const handleProductPress = (item) => {
    const product = item?.product || item;
    if (onNavigateToProductDetails) {
      onNavigateToProductDetails(product);
    } else if (navigation?.navigate) {
      navigation.navigate('ProductDetails', {
        productId: product.id,
        product,
      });
    }
  };

  const handleClearCartPress = () => {
    Alert.alert(
      'Clear Wholesale Cart',
      'Are you sure you want to remove all wholesale items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearCart(),
        },
      ]
    );
  };

  const handleRemoveItem = (item) => {
    const productName = item.product?.name || 'this item';
    Alert.alert(
      'Remove Product',
      `Remove "${productName}" from your cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromCart(item.id),
        },
      ]
    );
  };

  const handleDecrement = (item) => {
    const moq = getProductMoq(item.product);
    const unit = item.product?.unit || 'units';
    if (item.quantity <= moq) {
      Alert.alert(
        'Minimum Order Quantity Reached',
        `The minimum wholesale order quantity for this item is ${moq} ${unit}. To remove it from your cart, tap the Remove button.`,
        [
          { text: 'Keep Item', style: 'cancel' },
          {
            text: 'Remove Item',
            style: 'destructive',
            onPress: () => removeFromCart(item.id),
          },
        ]
      );
      return;
    }
    decreaseQuantity(item.id);
  };

  const handleIncrement = (item) => {
    const stock = getProductStock(item.product);
    const unit = item.product?.unit || 'units';
    if (stock !== Infinity && item.quantity >= stock) {
      Alert.alert(
        'Maximum Available Stock Reached',
        `Only ${stock} ${unit} are currently available in inventory for this product.`,
        [{ text: 'OK' }]
      );
      return;
    }
    increaseQuantity(item.id);
  };

  const handleCheckoutPress = () => {
    if (isEmpty) return;
    if (onNavigateToCheckout) {
      onNavigateToCheckout();
    } else if (navigation?.navigate) {
      navigation.navigate('Checkout');
    }
  };

  const isEmpty = cartItems.length === 0;

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

        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>Wholesale Cart</Text>
          {cartItemCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
              </Text>
            </View>
          )}
        </View>

        {!isEmpty ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCartPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Clear cart"
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* 2. Main Content */}
      {isEmpty ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.emptyContainer}
          showsVerticalScrollIndicator={false}
        >
          <EmptyState
            icon="cart-outline"
            iconSize={64}
            iconColor={colors.primary}
            title="Your Cart is Empty"
            description="You haven't added any wholesale products to your cart yet. Browse verified manufacturers and suppliers to find bulk deals."
            actionText="Browse Wholesale Products"
            actionIcon="storefront-outline"
            onActionPress={handleBrowseProducts}
            style={styles.emptyStateCard}
          />

          <TouchableOpacity
            style={styles.quotationsLinkButton}
            onPress={() => {
              if (onNavigateToBuyerQuotations) {
                onNavigateToBuyerQuotations();
              } else if (navigation?.navigate) {
                navigation.navigate('BuyerQuotations');
              }
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View submitted quotations and RFQs"
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.quotationsLinkButtonText}>
              View Submitted Quotations & RFQs
            </Text>
          </TouchableOpacity>

          {/* Wholesale B2B Assurance Banner */}
          <View style={styles.assuranceCard}>
            <View style={styles.assuranceTitleRow}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={22}
                color={colors.primary}
              />
              <Text style={styles.assuranceTitle}>VyaparSetu Trade Assurance</Text>
            </View>
            <View style={styles.assuranceGrid}>
              <View style={styles.assuranceItem}>
                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color={colors.accent}
                />
                <Text style={styles.assuranceItemText}>
                  Tiered Bulk Pricing Discounts
                </Text>
              </View>
              <View style={styles.assuranceItem}>
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={colors.success}
                />
                <Text style={styles.assuranceItemText}>
                  Verified Direct Manufacturers
                </Text>
              </View>
              <View style={styles.assuranceItem}>
                <Ionicons
                  name="receipt-outline"
                  size={18}
                  color={colors.info}
                />
                <Text style={styles.assuranceItemText}>
                  GST Compliance & Factory Quotations
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cart Notice Banner */}
          <View style={styles.bannerNotice}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.info}
              style={styles.bannerNoticeIcon}
            />
            <Text style={styles.bannerNoticeText}>
              All prices update automatically based on wholesale quantity tiers.
            </Text>
          </View>

          {/* Cart Items List */}
          <View style={styles.itemsListContainer}>
            {cartItems.map((item, index) => {
              const product = item.product || {};
              const moq = getProductMoq(product);
              const stock = getProductStock(product);
              const unitSingular = product.unit || 'unit';
              const unitPlural =
                unitSingular.endsWith('s') || unitSingular === 'pair'
                  ? `${unitSingular}s`
                  : `${unitSingular}s`;

              const isAtMoq = item.quantity <= moq;
              const isAtMaxStock = stock !== Infinity && item.quantity >= stock;
              const hasBulkDiscount =
                Boolean(item.activeTier) &&
                product.price &&
                item.unitPrice < product.price;

              const imageUri =
                product.image ||
                (Array.isArray(product.images) && product.images[0]) ||
                null;

              return (
                <View
                  key={`cart-item-${item.id || index}`}
                  style={styles.itemCard}
                >
                  {/* Top Row: Thumbnail + Details */}
                  <TouchableOpacity
                    style={styles.itemTopRow}
                    onPress={() => handleProductPress(item)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`View details for ${product.name}`}
                  >
                    <View style={styles.thumbnailContainer}>
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.thumbnailFallback}>
                          <Ionicons
                            name="cube-outline"
                            size={28}
                            color={colors.textMuted}
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.itemDetails}>
                      {product.categoryName && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {product.categoryName}
                          </Text>
                        </View>
                      )}

                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name || 'Wholesale Product'}
                      </Text>

                      {(product.sellerName || product.location) && (
                        <View style={styles.sellerRow}>
                          <Ionicons
                            name="storefront-outline"
                            size={13}
                            color={colors.textSecondary}
                          />
                          <Text style={styles.sellerText} numberOfLines={1}>
                            {product.sellerName || 'Verified Seller'}
                            {product.location ? ` · ${product.location}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Pricing Breakdown Row */}
                  <View style={styles.pricingRow}>
                    <View style={styles.unitPriceContainer}>
                      <Text style={styles.unitPriceLabel}>Unit Price:</Text>
                      <View style={styles.unitPriceValues}>
                        <Text style={styles.unitPriceCurrent}>
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.unitPriceUnit}>
                          /{unitSingular}
                        </Text>
                        {hasBulkDiscount && product.price && (
                          <Text style={styles.unitPriceOriginal}>
                            ₹{Number(product.price).toLocaleString('en-IN')}
                          </Text>
                        )}
                      </View>
                    </View>

                    {item.quotationId ? (
                      <View style={styles.quoteAgreedBadge}>
                        <Ionicons
                          name="document-text"
                          size={12}
                          color={colors.primary}
                        />
                        <Text style={styles.quoteAgreedBadgeText}>
                          Quote #{String(item.quotationId).slice(-6)} · Agreed Price
                        </Text>
                      </View>
                    ) : item.activeTier ? (
                      <View style={styles.tierAppliedBadge}>
                        <Ionicons
                          name="sparkles"
                          size={12}
                          color={colors.surplus}
                        />
                        <Text style={styles.tierAppliedText}>
                          Bulk Tier Applied
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.standardPriceBadge}>
                        <Text style={styles.standardPriceText}>
                          Standard Price
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Agreed Quotation Highlight */}
                  {item.quotationId && (
                    <View style={styles.quoteBanner}>
                      <Ionicons
                        name="shield-checkmark"
                        size={14}
                        color={colors.primary}
                      />
                      <Text style={styles.quoteBannerText}>
                        Locked negotiated price ({item.quantity} {unitPlural} at ₹{item.unitPrice.toLocaleString('en-IN')}/{unitSingular})
                      </Text>
                    </View>
                  )}

                  {/* Bulk Savings Highlight */}
                  {!item.quotationId && item.savings > 0 && (
                    <View style={styles.savingsBanner}>
                      <Ionicons
                        name="trending-down-outline"
                        size={14}
                        color={colors.surplus}
                      />
                      <Text style={styles.savingsBannerText}>
                        Saving ₹{item.savings.toLocaleString('en-IN')} with bulk
                        tier ({item.quantity} {unitPlural})
                      </Text>
                    </View>
                  )}

                  <View style={styles.cardDivider} />

                  {/* Controls Row: Stepper + Item Total */}
                  <View style={styles.controlsRow}>
                    {/* Quantity Stepper */}
                    <View style={styles.stepperWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.stepperBtn,
                          isAtMoq && styles.stepperBtnMoq,
                        ]}
                        onPress={() => handleDecrement(item)}
                        activeOpacity={0.7}
                        accessibilityLabel="Decrease quantity"
                      >
                        <Ionicons
                          name={isAtMoq ? 'alert-circle-outline' : 'remove'}
                          size={isAtMoq ? 16 : 18}
                          color={isAtMoq ? colors.warning : colors.primary}
                        />
                      </TouchableOpacity>

                      <View style={styles.quantityDisplay}>
                        <Text style={styles.quantityNumber}>
                          {item.quantity}
                        </Text>
                        <Text style={styles.quantityUnitLabel}>
                          {unitSingular}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.stepperBtn,
                          isAtMaxStock && styles.stepperBtnDisabled,
                        ]}
                        onPress={() => handleIncrement(item)}
                        disabled={isAtMaxStock}
                        activeOpacity={0.7}
                        accessibilityLabel="Increase quantity"
                      >
                        <Ionicons
                          name="add"
                          size={18}
                          color={
                            isAtMaxStock ? colors.textMuted : colors.primary
                          }
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Item Total */}
                    <View style={styles.itemTotalContainer}>
                      <Text style={styles.itemTotalLabel}>Item Total</Text>
                      <Text style={styles.itemTotalAmount}>
                        ₹{item.itemTotal.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Meta & Remove Row */}
                  <View style={styles.itemFooterRow}>
                    <View style={styles.constraintsRow}>
                      <Text style={styles.constraintText}>
                        MOQ: <Text style={styles.boldText}>{moq}</Text>
                      </Text>
                      <Text style={styles.constraintDot}>·</Text>
                      <Text style={styles.constraintText}>
                        Stock:{' '}
                        <Text style={styles.boldText}>
                          {stock !== Infinity
                            ? stock.toLocaleString('en-IN')
                            : 'Available'}
                        </Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveItem(item)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${product.name} from cart`}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color={colors.error}
                      />
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* 3. Order Summary Section */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTitleRow}>
              <Ionicons
                name="receipt-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.summaryTitle}>Wholesale Order Summary</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Products</Text>
              <Text style={styles.summaryValue}>
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Quantity</Text>
              <Text style={styles.summaryValue}>
                {totalUnits.toLocaleString('en-IN')} units
              </Text>
            </View>

            {totalSavings > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summarySavingsLabel}>
                  Bulk Pricing Savings
                </Text>
                <Text style={styles.summarySavingsValue}>
                  -₹{totalSavings.toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Estimated Total</Text>
              <View style={styles.summaryTotalWrapper}>
                <Text style={styles.summaryTotalCurrency}>₹</Text>
                <Text style={styles.summaryTotalAmount}>
                  {totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <View style={styles.summaryNoticeRow}>
              <Ionicons
                name="information-circle"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.summaryNoticeText}>
                Taxes (GST) and freight logistics will be finalized upon seller
                quotation acceptance.
              </Text>
            </View>
          </View>

          {/* Quotations Quick Link */}
          <TouchableOpacity
            style={styles.cartQuotationsRow}
            onPress={() => {
              if (onNavigateToBuyerQuotations) {
                onNavigateToBuyerQuotations();
              } else if (navigation?.navigate) {
                navigation.navigate('BuyerQuotations');
              }
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="View submitted quotations"
          >
            <View style={styles.cartQuotationsLeft}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.cartQuotationsText}>
                View all your active RFQs & Quotations
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.primary}
            />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 4. Sticky Bottom Checkout Bar (when items present) */}
      {!isEmpty && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarTotalWrapper}>
            <Text style={styles.bottomBarTotalLabel}>
              Total ({totalUnits} units)
            </Text>
            <View style={styles.bottomBarPriceRow}>
              <Text style={styles.bottomBarCurrency}>₹</Text>
              <Text style={styles.bottomBarAmount}>
                {totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckoutPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Proceed to Checkout"
          >
            <Ionicons
              name="card-outline"
              size={18}
              color={colors.textInverse}
              style={styles.checkoutButtonIcon}
            />
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerBadge: {
    backgroundColor: colors.primaryLight + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.errorLight,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  headerSpacer: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2.5,
    gap: spacing.md,
  },
  emptyContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  emptyStateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assuranceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  assuranceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  assuranceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  assuranceGrid: {
    gap: spacing.sm + 2,
  },
  assuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  assuranceItemText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bannerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  bannerNoticeIcon: {
    marginRight: spacing.sm,
  },
  bannerNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.info,
    lineHeight: 17,
  },
  itemsListContainer: {
    gap: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
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
  itemTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumbnailContainer: {
    width: 76,
    height: 76,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sellerText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  unitPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  unitPriceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  unitPriceValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  unitPriceCurrent: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  unitPriceUnit: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  unitPriceOriginal: {
    fontSize: 11,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  tierAppliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surplusLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tierAppliedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surplus,
  },
  standardPriceBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  standardPriceText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quoteAgreedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quoteAgreedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  quoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  quoteBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  quotationsLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    gap: spacing.xs + 2,
  },
  quotationsLinkButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  cartQuotationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  cartQuotationsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cartQuotationsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surplusLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  savingsBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.surplus,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtnMoq: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning + '55',
  },
  stepperBtnDisabled: {
    opacity: 0.5,
    backgroundColor: colors.surfaceSubtle,
  },
  quantityDisplay: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  quantityNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  quantityUnitLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  itemTotalContainer: {
    alignItems: 'flex-end',
  },
  itemTotalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  itemTotalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  constraintsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  constraintText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  constraintDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  summaryCard: {
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
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
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
    fontSize: 14,
    fontWeight: '800',
    color: colors.surplus,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryTotalWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryTotalCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 2,
  },
  summaryTotalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  summaryNoticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  summaryNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  bottomBarTotalWrapper: {
    flex: 1,
  },
  bottomBarTotalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bottomBarPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomBarCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 2,
  },
  bottomBarAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  checkoutButtonIcon: {
    marginRight: spacing.xs + 2,
  },
  checkoutButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
});
