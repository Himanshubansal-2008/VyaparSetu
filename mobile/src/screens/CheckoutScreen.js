import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { useCart } from '../context/CartContext';
import {
  saveOrder,
  generateOrderId,
  loadPersistedAddress,
  saveDeliveryAddress,
  getSavedAddress,
} from '../data/orders';
import { markQuotationAsOrdered } from '../data/quotations';
import EmptyState from '../components/EmptyState';

const PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    title: 'Trade Credit / RTGS / NEFT',
    subtitle: 'Direct factory bank transfer settlement',
    icon: 'business-outline',
  },
  {
    id: 'cod',
    title: 'Cash on Delivery (COD)',
    subtitle: 'Payment upon warehouse dock delivery',
    icon: 'cash-outline',
  },
  {
    id: 'invoice_credit',
    title: '30-Day Commercial Credit',
    subtitle: 'Pay on net-30 terms (Verified MSME buyers)',
    icon: 'document-text-outline',
  },
];

export default function CheckoutScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToConfirmation,
  onNavigateToHome,
}) {
  const {
    cartItems,
    cartItemCount,
    totalUnits,
    subtotal,
    totalSavings,
    totalAmount,
    clearCart,
  } = useCart();

  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    businessName: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
  });

  const [errors, setErrors] = useState({});
  const [selectedPayment, setSelectedPayment] = useState('bank_transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load previously saved delivery address if available
  useEffect(() => {
    let isMounted = true;
    async function loadAddress() {
      const cached = getSavedAddress();
      if (cached && isMounted) {
        setAddressForm((prev) => ({ ...prev, ...cached }));
        return;
      }
      const loaded = await loadPersistedAddress();
      if (loaded && isMounted) {
        setAddressForm((prev) => ({ ...prev, ...loaded }));
      }
    }
    loadAddress();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Cart');
    }
  };

  const handleGoHome = () => {
    if (onNavigateToHome) {
      onNavigateToHome();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  };

  const handleInputChange = (field, value) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateAddress = () => {
    const newErrors = {};

    if (!addressForm.name || addressForm.name.trim().length < 2) {
      newErrors.name = 'Contact name is required (min. 2 characters).';
    }

    const cleanPhone = (addressForm.phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone = 'Valid 10-digit mobile number is required.';
    }

    if (!addressForm.street || addressForm.street.trim().length < 5) {
      newErrors.street = 'Street address / premises is required (min. 5 characters).';
    }

    if (!addressForm.city || addressForm.city.trim().length < 2) {
      newErrors.city = 'City / Town is required.';
    }

    if (!addressForm.state || addressForm.state.trim().length < 2) {
      newErrors.state = 'State / Union Territory is required.';
    }

    const cleanPincode = (addressForm.pincode || '').replace(/[^0-9]/g, '');
    if (!cleanPincode || cleanPincode.length !== 6) {
      newErrors.pincode = 'Valid 6-digit PIN code is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;

    if (cartItems.length === 0) {
      Alert.alert(
        'Empty Wholesale Cart',
        'Your cart has no products to checkout. Please add products from the catalog first.',
        [{ text: 'Browse Products', onPress: handleGoHome }]
      );
      return;
    }

    const isValid = validateAddress();
    if (!isValid) {
      Alert.alert(
        'Incomplete Delivery Details',
        'Please review the delivery address fields highlighted in red to complete your order placement.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = generateOrderId();
      const orderPayload = {
        id: orderId,
        orderNumber: orderId,
        createdAt: new Date().toISOString(),
        status: 'Confirmed',
        items: cartItems.map((item) => ({
          id: item.id,
          productId: item.id,
          name: item.product?.name || 'Wholesale Product',
          categoryName: item.product?.categoryName || 'General',
          sellerName: item.product?.sellerName || 'Verified Seller',
          sellerId: item.product?.sellerId,
          image:
            item.product?.image ||
            (Array.isArray(item.product?.images) && item.product.images[0]) ||
            null,
          quantity: item.quantity,
          unit: item.product?.unit || 'unit',
          unitPrice: item.unitPrice,
          itemTotal: item.itemTotal,
          activeTier: item.activeTier || null,
          savings: item.savings || 0,
          quotationId: item.quotationId || null,
          quotationNumber: item.quotationNumber || item.quotationId || null,
          quotationDetails: item.quotationDetails || null,
        })),
        totalItems: cartItemCount,
        totalUnits: totalUnits,
        subtotal: subtotal,
        totalSavings: totalSavings,
        totalAmount: totalAmount,
        deliveryAddress: { ...addressForm },
        paymentMethod:
          PAYMENT_METHODS.find((p) => p.id === selectedPayment)?.title ||
          'Trade Credit / NEFT / RTGS',
        orderDate: new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      };

      // 1. Save placed order locally
      const saved = await saveOrder(orderPayload);

      // 1.1 Transition any originated quotations to ordered status
      for (const item of cartItems) {
        if (item.quotationId) {
          try {
            await markQuotationAsOrdered(item.quotationId, orderPayload.id);
          } catch (quotationErr) {
            console.warn('[Checkout] Failed marking quotation as ordered:', quotationErr);
          }
        }
      }

      // 2. Save delivery address for future orders
      await saveDeliveryAddress(addressForm);

      // 3. Clear the Cart only after successful order placement
      clearCart();

      // 4. Navigate to Order Confirmation Screen
      if (onNavigateToConfirmation) {
        onNavigateToConfirmation(saved || orderPayload);
      } else if (navigation?.navigate) {
        navigation.navigate('OrderConfirmation', {
          order: saved || orderPayload,
          orderId: orderPayload.id,
        });
      }
    } catch (err) {
      console.warn('[CheckoutScreen] Failed to place order:', err);
      Alert.alert(
        'Order Placement Error',
        'An error occurred while saving your wholesale order. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmpty = cartItems.length === 0;

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

        <View style={styles.headerTitleWrapper}>
          <Text style={styles.headerTitle}>Wholesale Checkout</Text>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

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
            description="You have no items in your cart to checkout. Browse our wholesale catalog to discover great deals from verified suppliers."
            actionText="Browse Products"
            actionIcon="storefront-outline"
            onActionPress={handleGoHome}
            style={styles.emptyCard}
          />
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Delivery Address Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleLeft}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Delivery Address</Text>
                </View>
                <View style={styles.b2bTag}>
                  <Text style={styles.b2bTagText}>Warehouse / Premises</Text>
                </View>
              </View>

              <Text style={styles.sectionDescription}>
                Enter the delivery destination for your wholesale cargo freight.
              </Text>

              {/* Form Fields */}
              <View style={styles.formContainer}>
                {/* Contact Name & Phone Row */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Contact Person Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    placeholder="e.g. Ramesh Kumar"
                    value={addressForm.name}
                    onChangeText={(val) => handleInputChange('name', val)}
                    placeholderTextColor={colors.textMuted}
                  />
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Mobile Number <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.phoneInputWrapper,
                      errors.phone && styles.inputError,
                    ]}
                  >
                    <Text style={styles.phonePrefix}>+91</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="9876543210"
                      value={addressForm.phone}
                      onChangeText={(val) => handleInputChange('phone', val)}
                      keyboardType="phone-pad"
                      maxLength={10}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  {errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}
                </View>

                {/* Company / Business Name (Optional) */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Company / Trade Name <Text style={styles.optionalText}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Kumar Retail & Distribution Ltd."
                    value={addressForm.businessName}
                    onChangeText={(val) => handleInputChange('businessName', val)}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* Street Address */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Street Address / Warehouse Unit <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, errors.street && styles.inputError]}
                    placeholder="e.g. Plot No. 18, Industrial Area, Phase II"
                    value={addressForm.street}
                    onChangeText={(val) => handleInputChange('street', val)}
                    placeholderTextColor={colors.textMuted}
                  />
                  {errors.street && (
                    <Text style={styles.errorText}>{errors.street}</Text>
                  )}
                </View>

                {/* City & State Row */}
                <View style={styles.twoColRow}>
                  <View style={[styles.fieldGroup, styles.flexOne]}>
                    <Text style={styles.fieldLabel}>
                      City / Town <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.city && styles.inputError]}
                      placeholder="e.g. Jaipur"
                      value={addressForm.city}
                      onChangeText={(val) => handleInputChange('city', val)}
                      placeholderTextColor={colors.textMuted}
                    />
                    {errors.city && (
                      <Text style={styles.errorText}>{errors.city}</Text>
                    )}
                  </View>

                  <View style={[styles.fieldGroup, styles.flexOne]}>
                    <Text style={styles.fieldLabel}>
                      State <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.state && styles.inputError]}
                      placeholder="e.g. Rajasthan"
                      value={addressForm.state}
                      onChangeText={(val) => handleInputChange('state', val)}
                      placeholderTextColor={colors.textMuted}
                    />
                    {errors.state && (
                      <Text style={styles.errorText}>{errors.state}</Text>
                    )}
                  </View>
                </View>

                {/* PIN Code & GSTIN Row */}
                <View style={styles.twoColRow}>
                  <View style={[styles.fieldGroup, styles.flexOne]}>
                    <Text style={styles.fieldLabel}>
                      PIN Code <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.pincode && styles.inputError]}
                      placeholder="302022"
                      value={addressForm.pincode}
                      onChangeText={(val) => handleInputChange('pincode', val)}
                      keyboardType="numeric"
                      maxLength={6}
                      placeholderTextColor={colors.textMuted}
                    />
                    {errors.pincode && (
                      <Text style={styles.errorText}>{errors.pincode}</Text>
                    )}
                  </View>

                  <View style={[styles.fieldGroup, styles.flexOne]}>
                    <Text style={styles.fieldLabel}>
                      GSTIN <Text style={styles.optionalText}>(Tax Invoicing)</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="08AAAAA0000A1Z5"
                      value={addressForm.gstin}
                      onChangeText={(val) => handleInputChange('gstin', val.toUpperCase())}
                      autoCapitalize="characters"
                      maxLength={15}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Order Summary (Items List) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleLeft}>
                  <Ionicons
                    name="cube-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionTitle}>
                    Order Items ({cartItemCount})
                  </Text>
                </View>
                <Text style={styles.totalUnitsHeader}>
                  {totalUnits} Total Units
                </Text>
              </View>

              <View style={styles.itemsList}>
                {cartItems.map((item, index) => {
                  const product = item.product || {};
                  const unitSingular = product.unit || 'unit';
                  const imageUri =
                    product.image ||
                    (Array.isArray(product.images) && product.images[0]) ||
                    null;

                  return (
                    <View
                      key={`checkout-item-${item.id || index}`}
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
                              size={22}
                              color={colors.textMuted}
                            />
                          </View>
                        )}
                      </View>

                      <View style={styles.itemDetails}>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {product.name || 'Wholesale Product'}
                        </Text>
                        <Text style={styles.itemSeller} numberOfLines={1}>
                          By {product.sellerName || 'Verified Seller'}
                        </Text>

                        <View style={styles.itemPricingRow}>
                          <Text style={styles.itemQtyPrice}>
                            {item.quantity} {unitSingular}s × ₹{item.unitPrice}
                          </Text>
                          {item.quotationId ? (
                            <View style={[styles.tierPill, { backgroundColor: '#EFF6FF' }]}>
                              <Text style={[styles.tierPillText, { color: colors.primary }]}>
                                Agreed Quote
                              </Text>
                            </View>
                          ) : item.activeTier ? (
                            <View style={styles.tierPill}>
                              <Text style={styles.tierPillText}>Bulk Tier</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.itemTotalRight}>
                        <Text style={styles.itemTotal}>
                          ₹{item.itemTotal.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 3. Wholesale Payment Terms */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleLeft}>
                  <Ionicons
                    name="card-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Wholesale Payment Terms</Text>
                </View>
              </View>

              <View style={styles.paymentList}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedPayment === method.id;
                  return (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.paymentOption,
                        isSelected && styles.paymentOptionSelected,
                      ]}
                      onPress={() => setSelectedPayment(method.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.paymentRadio}>
                        {isSelected && <View style={styles.paymentRadioInner} />}
                      </View>
                      <Ionicons
                        name={method.icon}
                        size={20}
                        color={isSelected ? colors.primary : colors.textSecondary}
                        style={styles.paymentIcon}
                      />
                      <View style={styles.paymentTextWrapper}>
                        <Text
                          style={[
                            styles.paymentTitle,
                            isSelected && styles.paymentTitleSelected,
                          ]}
                        >
                          {method.title}
                        </Text>
                        <Text style={styles.paymentSubtitle}>
                          {method.subtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Price Breakdown Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleLeft}>
                  <Ionicons
                    name="receipt-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Price Breakdown</Text>
                </View>
              </View>

              <View style={styles.summaryTable}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    ₹{subtotal.toLocaleString('en-IN')}
                  </Text>
                </View>

                {totalSavings > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summarySavingsLabel}>
                      Bulk Tier Discount Savings
                    </Text>
                    <Text style={styles.summarySavingsValue}>
                      -₹{totalSavings.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Wholesale Cargo Freight</Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>FREE (Included)</Text>
                  </View>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>GST Commercial Invoicing</Text>
                  <Text style={styles.summaryValueMuted}>Included</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryGrandLabel}>Order Total</Text>
                  <View style={styles.grandPriceWrapper}>
                    <Text style={styles.grandPriceCurrency}>₹</Text>
                    <Text style={styles.grandPriceAmount}>
                      {totalAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.assuranceNotice}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.assuranceNoticeText}>
                  Protected by VyaparSetu Trade Assurance. Direct factory invoicing & quality guarantee.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Bottom Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomBarTotalWrapper}>
              <Text style={styles.bottomBarLabel}>
                Grand Total ({totalUnits} units)
              </Text>
              <View style={styles.bottomBarPriceRow}>
                <Text style={styles.bottomBarCurrency}>₹</Text>
                <Text style={styles.bottomBarAmount}>
                  {totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.placeOrderButton,
                isSubmitting && styles.placeOrderButtonDisabled,
              ]}
              onPress={handlePlaceOrder}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Place Wholesale Order"
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={colors.textInverse}
                style={styles.placeOrderIcon}
              />
              <Text style={styles.placeOrderText}>
                {isSubmitting ? 'Placing Order...' : 'Place Order'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
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
  stepBadge: {
    backgroundColor: colors.primaryLight + '22',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
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
    paddingTop: spacing.xxl,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  b2bTag: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  b2bTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.info,
  },
  totalUnitsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  sectionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  formContainer: {
    gap: spacing.md,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  requiredStar: {
    color: colors.error,
    fontWeight: '700',
  },
  optionalText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '400',
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight + '22',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  phonePrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexOne: {
    flex: 1,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '500',
    marginTop: 2,
  },
  itemsList: {
    gap: spacing.sm,
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
    width: 52,
    height: 52,
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
    lineHeight: 18,
  },
  itemSeller: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  itemPricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  itemQtyPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tierPill: {
    backgroundColor: colors.surplusLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.surplus,
  },
  itemTotalRight: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  paymentList: {
    gap: spacing.sm,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '0D',
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  paymentIcon: {
    marginRight: 2,
  },
  paymentTextWrapper: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentTitleSelected: {
    color: colors.primary,
  },
  paymentSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  summaryTable: {
    gap: spacing.sm,
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
  summaryValueMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
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
  freeBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  freeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  summaryGrandLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  grandPriceWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  grandPriceCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 2,
  },
  grandPriceAmount: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.primary,
  },
  assuranceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight + '12',
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  assuranceNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
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
  bottomBarLabel: {
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
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
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
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderIcon: {
    marginRight: spacing.xs + 2,
  },
  placeOrderText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
});

