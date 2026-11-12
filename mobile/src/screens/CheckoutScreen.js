import React, { useState, useEffect } from 'react';

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
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { useCart } from '../context/CartContext';
import {
  loadPersistedAddress,
  getSavedAddress,
} from '../data/orders';
import EmptyState from '../components/EmptyState';

export default function CheckoutScreen({
  navigation,
  route,
  onBackPress,
  onNavigateToHome,
}) {
  const {
    cartItems,
    cartItemCount,
    totalUnits,
    subtotal,
    totalSavings,
    totalAmount,
  } = useCart();

  const [selectedPayment, setSelectedPayment] = useState('bank_transfer');

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
                        {item.activeTier && (
                          <View style={styles.tierPill}>
                            <Text style={styles.tierPillText}>Bulk Tier</Text>
                          </View>
                        )}
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
  totalUnitsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
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
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
