import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { submitQuotationRequest } from '../data/quotations';
import {
  getProductMoq,
  getProductStock,
  getApplicableUnitPrice,
} from '../context/CartContext';
import { loadPersistedAddress, getSavedAddress } from '../data/orders';
import {
  getSessionBusinessProfile,
  subscribeBusinessProfile,
  isProductOwnedByCurrentSeller,
} from '../data/businessProfileData';

const DELIVERY_TIMELINES = [
  'Within 7 days',
  'Within 15 days',
  'Within 30 days',
  'Flexible timeline',
];

const PAYMENT_TERMS_OPTIONS = [
  '50% Advance + 50% on Delivery',
  'Net 30 Days (Trade Credit)',
  '100% Advance via RTGS/NEFT',
  'Cash on Delivery (COD)',
  'Letter of Credit (LC)',
];

export default function RequestQuotationScreen({
  navigation,
  route,
  product: propProduct,
  onBackPress,
  onNavigateToBuyerQuotations,
  onNavigateToCatalog,
  onNavigateToHome,
}) {
  const product = useMemo(() => {
    return propProduct || route?.params?.product || {};
  }, [propProduct, route?.params?.product]);

  const initialQty = useMemo(() => {
    const passedQty = Number(route?.params?.quantity);
    const moq = getProductMoq(product);
    return !isNaN(passedQty) && passedQty >= moq ? passedQty : moq;
  }, [route?.params?.quantity, product]);

  const moq = useMemo(() => getProductMoq(product), [product]);
  const stock = useMemo(() => getProductStock(product), [product]);
  const catalogPrice = useMemo(() => Number(product.price) || 0, [product]);

  const [quantity, setQuantity] = useState(initialQty);
  const [quantityText, setQuantityText] = useState(String(initialQty));
  const [targetPrice, setTargetPrice] = useState('');
  const [selectedTimeline, setSelectedTimeline] = useState(DELIVERY_TIMELINES[1]);
  const [selectedPaymentTerms, setSelectedPaymentTerms] = useState(PAYMENT_TERMS_OPTIONS[0]);
  const [buyerNotes, setBuyerNotes] = useState('');

  // Delivery destination state
  const [buyerName, setBuyerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionProfile, setSessionProfile] = useState(getSessionBusinessProfile);

  useEffect(() => {
    setSessionProfile(getSessionBusinessProfile());
    return subscribeBusinessProfile((updated) => {
      setSessionProfile(updated);
    });
  }, []);

  const isOwnProduct = useMemo(() => {
    return isProductOwnedByCurrentSeller(product, sessionProfile);
  }, [product, sessionProfile]);

  // Auto-populate buyer and address details from saved session / address
  useEffect(() => {
    async function loadAddress() {
      try {
        await loadPersistedAddress();
        const saved = getSavedAddress();
        const sessionBiz = getSessionBusinessProfile();

        if (saved) {
          setBuyerName(saved.fullName || '');
          setBusinessName(saved.businessName || sessionBiz?.businessName || '');
          setPhone(saved.phone || '');
          setCity(saved.city || '');
          setState(saved.state || '');
          setPincode(saved.pincode || '');
          setGstin(saved.gstin || '');
        } else if (sessionBiz) {
          setBusinessName(sessionBiz.businessName || '');
          setBuyerName(sessionBiz.ownerName || '');
          setPhone(sessionBiz.contactNumber || '');
          setCity(sessionBiz.city || '');
          setState(sessionBiz.state || '');
        } else {
          setBuyerName('Rajesh Kumar');
          setBusinessName('Kumar Handicrafts & Emporium');
          setPhone('+91 9876543210');
          setCity('Ahmedabad');
          setState('Gujarat');
          setPincode('380015');
          setGstin('24AAECK1234F1Z5');
        }
      } catch (e) {
        console.warn('Failed to load address for quotation:', e);
      }
    }
    loadAddress();
  }, []);

  const handleBack = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (onNavigateToCatalog) {
      onNavigateToCatalog();
    } else if (onNavigateToHome) {
      onNavigateToHome();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  }, [onBackPress, navigation, onNavigateToCatalog, onNavigateToHome]);

  const handleContinueShopping = useCallback(() => {
    if (onNavigateToCatalog) {
      onNavigateToCatalog();
    } else if (onNavigateToHome) {
      onNavigateToHome();
    } else if (navigation?.navigate) {
      navigation.navigate('ProductListing');
    } else {
      handleBack();
    }
  }, [onNavigateToCatalog, onNavigateToHome, navigation, handleBack]);

  const handleQuantityTextChange = (text) => {
    // Sanitize non-digits
    const cleanDigits = text.replace(/[^0-9]/g, '');

    // Allow user to clear text to type freely
    if (cleanDigits === '') {
      setQuantityText('');
      return;
    }

    setQuantityText(cleanDigits);
    const parsed = parseInt(cleanDigits, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (stock !== Infinity && parsed > stock) {
        setQuantity(stock);
      } else if (parsed >= moq) {
        setQuantity(parsed);
      }
    }
  };

  const handleQuantityBlur = () => {
    const cleanDigits = quantityText.replace(/[^0-9]/g, '');
    let clean = parseInt(cleanDigits, 10);
    if (isNaN(clean) || clean < moq) {
      clean = moq;
    } else if (stock !== Infinity && clean > stock) {
      clean = stock;
    }
    setQuantity(clean);
    setQuantityText(String(clean));
  };

  const handleIncrement = () => {
    if (stock !== Infinity && quantity >= stock) {
      Alert.alert(
        'Maximum Available Stock Reached',
        `Only ${stock} ${product.unit || 'units'} are available in inventory for this product.`
      );
      return;
    }
    const current = Number(quantityText) || quantity;
    const next = stock !== Infinity ? Math.min(stock, current + 1) : current + 1;
    setQuantity(next);
    setQuantityText(String(next));
  };

  const handleDecrement = () => {
    const current = Number(quantityText) || quantity;
    if (current > moq) {
      const next = Math.max(moq, current - 1);
      setQuantity(next);
      setQuantityText(String(next));
    }
  };

  // Live estimated total calculation
  const suggestedUnitPrice = useMemo(() => {
    return getApplicableUnitPrice(product, quantity) || catalogPrice;
  }, [product, quantity, catalogPrice]);

  const effectiveUnitPrice = useMemo(() => {
    const tPrice = parseFloat(targetPrice);
    return !isNaN(tPrice) && tPrice > 0 ? tPrice : suggestedUnitPrice;
  }, [targetPrice, suggestedUnitPrice]);

  const estimatedTotal = useMemo(() => {
    return quantity * effectiveUnitPrice;
  }, [quantity, effectiveUnitPrice]);

  const handleSubmit = async () => {
    if (isOwnProduct) {
      Alert.alert(
        'Action Not Allowed',
        'You cannot submit a price quotation request for your own product.'
      );
      return;
    }

    if (!product || !product.id) {
      Alert.alert('Invalid Product', 'Product details are missing or invalid.');
      return;
    }

    if (quantity < moq) {
      Alert.alert(
        'MOQ Requirement',
        `The minimum order quantity for this product is ${moq} ${product.unit || 'units'}.`
      );
      return;
    }

    if (!city.trim()) {
      Alert.alert('Delivery Destination Required', 'Please enter destination city.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetNum = parseFloat(targetPrice);
      const deliveryAddress = {
        fullName: buyerName.trim() || 'Wholesale Buyer',
        businessName: businessName.trim() || 'Verified Buyer',
        phone: phone.trim() || '+91 9876543210',
        city: city.trim(),
        state: state.trim() || 'India',
        pincode: pincode.trim() || '',
        gstin: gstin.trim() || '',
      };

      const result = await submitQuotationRequest({
        product,
        quantity,
        targetPrice: !isNaN(targetNum) && targetNum > 0 ? targetNum : null,
        deliveryAddress,
        paymentTerms: selectedPaymentTerms,
        requiredByDate: selectedTimeline,
        buyerNotes: buyerNotes.trim(),
        buyerInfo: {
          fullName: buyerName.trim() || 'Wholesale Buyer',
          businessName: businessName.trim() || 'Verified Buyer',
          phone: phone.trim(),
          city: city.trim(),
          state: state.trim(),
          gstin: gstin.trim(),
        },
      });

      if (result.success) {
        Alert.alert(
          'Price Request Sent',
          `Your price request #${result.quotation.id} has been submitted to ${product.sellerName || 'the seller'}.\n\nYou can track seller responses and negotiate prices in My Price Requests.`,
          [
            {
              text: 'Continue Shopping',
              style: 'cancel',
              onPress: handleContinueShopping,
            },
            {
              text: 'View My Price Requests',
              onPress: () => {
                if (onNavigateToBuyerQuotations) {
                  onNavigateToBuyerQuotations();
                } else if (navigation?.navigate) {
                  navigation.navigate('BuyerQuotations');
                } else {
                  handleContinueShopping();
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Submission Error', result.message || 'Failed to submit price request.');
      }
    } catch (err) {
      console.warn('Error submitting price request:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageUri =
    product.image ||
    (Array.isArray(product.images) && product.images[0]) ||
    null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
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
          <Text style={styles.headerTitle}>Price Request</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Ask seller for a custom price
          </Text>
        </View>

        <View style={styles.verifiedBadge}>
          <Ionicons name="shield-checkmark" size={13} color={colors.primary} style={{ marginRight: 3 }} />
          <Text style={styles.verifiedBadgeText}>Price Request</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Own Product Blocking Warning Banner */}
        {isOwnProduct && (
          <View style={styles.ownProductBlockedBanner}>
            <View style={styles.ownProductBlockedHeader}>
              <Ionicons name="alert-circle" size={22} color={colors.error} />
              <View style={styles.ownProductBlockedTextWrapper}>
                <Text style={styles.ownProductBlockedTitle}>
                  My Product — Request Not Allowed
                </Text>
                <Text style={styles.ownProductBlockedSubtitle}>
                  You are registered as the seller of this product. Sellers cannot request quotations or negotiate prices for their own products.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Product Card */}
        <View style={styles.card}>
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
                {product.name || product.title || 'Wholesale Product'}
              </Text>

              <Text style={styles.sellerName} numberOfLines={1}>
                Seller: {product.sellerName || 'Verified Seller'}
              </Text>

              <View style={styles.priceMetaRow}>
                <Text style={styles.catalogPrice}>
                  Standard: ₹{catalogPrice.toLocaleString('en-IN')}/{product.unit || 'unit'}
                </Text>
                <View style={styles.moqBadge}>
                  <Text style={styles.moqBadgeText}>
                    Min. Order: {moq} {product.unit || 'units'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quantity & Target Price Section */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Quantity & Target Price</Text>
          <Text style={styles.termExplanation}>
            Ask a seller for a price based on the quantity you want to buy.
          </Text>

          {/* Quantity Stepper */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Required Quantity ({product.unit || 'units'}) *</Text>
              <Text style={styles.helperLabel}>
                Min: {moq}{stock !== Infinity ? ` · Stock: ${stock}` : ''}
              </Text>
            </View>
            <Text style={styles.subHelperLabel}>
              Minimum Order Quantity: The minimum number of pieces a customer must order.
            </Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={[styles.stepperButton, quantity <= moq && styles.stepperButtonDisabled]}
                onPress={handleDecrement}
                disabled={quantity <= moq}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <Ionicons name="remove" size={18} color={quantity <= moq ? colors.textMuted : colors.textPrimary} />
              </TouchableOpacity>

              <TextInput
                style={styles.stepperInput}
                keyboardType="number-pad"
                returnKeyType="done"
                value={quantityText}
                onChangeText={handleQuantityTextChange}
                onBlur={handleQuantityBlur}
                onSubmitEditing={handleQuantityBlur}
                selectTextOnFocus
                accessibilityRole="spinbutton"
                accessibilityLabel="Required quantity"
                accessibilityValue={{ min: moq, max: stock === Infinity ? undefined : stock, now: quantity }}
              />

              <TouchableOpacity
                style={[
                  styles.stepperButton,
                  stock !== Infinity && quantity >= stock && styles.stepperButtonDisabled,
                ]}
                onPress={handleIncrement}
                disabled={stock !== Infinity && quantity >= stock}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={
                    stock !== Infinity && quantity >= stock
                      ? colors.textMuted
                      : colors.textPrimary
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Target Unit Price */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Target Unit Price (₹ / {product.unit || 'unit'})</Text>
              <Text style={styles.helperLabel}>Optional</Text>
            </View>
            <View style={styles.textInputBox}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.inputField}
                placeholder={`Suggested: ₹${suggestedUnitPrice}`}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={targetPrice}
                onChangeText={setTargetPrice}
              />
            </View>
            <Text style={styles.hintText}>
              Catalog list price is ₹{catalogPrice}. Enter your target purchasing budget per unit.
            </Text>
          </View>

          {/* Live Estimated Total Card */}
          <View style={styles.liveCalculationBox}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Estimated Order Value:</Text>
              <Text style={styles.calcValue}>₹{estimatedTotal.toLocaleString('en-IN')}</Text>
            </View>
            <Text style={styles.calcSubtext}>
              {quantity} {product.unit || 'units'} × ₹{effectiveUnitPrice.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Timeline & Terms */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Delivery & Order Terms</Text>

          {/* Delivery Timeline Pills */}
          <Text style={styles.inputLabel}>Required By Timeline</Text>
          <View style={styles.pillsContainer}>
            {DELIVERY_TIMELINES.map((t) => {
              const isSelected = selectedTimeline === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                  onPress={() => setSelectedTimeline(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Payment Terms Selector */}
          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Preferred Payment Terms</Text>
          <View style={styles.pillsContainer}>
            {PAYMENT_TERMS_OPTIONS.map((term) => {
              const isSelected = selectedPaymentTerms === term;
              return (
                <TouchableOpacity
                  key={term}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                  onPress={() => setSelectedPaymentTerms(term)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {term}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Buyer Notes */}
          <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
            <Text style={styles.inputLabel}>Custom Specifications & Notes</Text>
            <TextInput
              style={[styles.textInputBox, styles.textArea]}
              placeholder="E.g., custom branding, specific packaging requirements, grade preferences, or delivery dock requirements..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={buyerNotes}
              onChangeText={setBuyerNotes}
            />
          </View>
        </View>

        {/* Delivery Destination */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Delivery Address</Text>

          <View style={styles.formRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={[styles.textInputBox, styles.singleLineInput]}
                placeholder="Ahmedabad"
                placeholderTextColor={colors.textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>State</Text>
              <TextInput
                style={[styles.textInputBox, styles.singleLineInput]}
                placeholder="Gujarat"
                placeholderTextColor={colors.textMuted}
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
              <Text style={styles.inputLabel}>Business Name</Text>
              <TextInput
                style={[styles.textInputBox, styles.singleLineInput]}
                placeholder="Business Name"
                placeholderTextColor={colors.textMuted}
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={[styles.textInputBox, styles.singleLineInput]}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInfo}>
          <Text style={styles.bottomBarLabel}>Estimated Total ({quantity} {product.unit || 'units'})</Text>
          <Text style={styles.bottomBarTotal}>₹{estimatedTotal.toLocaleString('en-IN')}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (isSubmitting || isOwnProduct) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || isOwnProduct}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Ionicons
                name={isOwnProduct ? 'alert-circle-outline' : 'paper-plane-outline'}
                size={18}
                color={colors.textInverse}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.submitButtonText}>
                {isOwnProduct ? 'Cannot Request Own Product' : 'Send Price Request'}
              </Text>
            </>
          )}
        </TouchableOpacity>
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
  },
  thumbnailContainer: {
    width: 72,
    height: 72,
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
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 3,
  },
  sellerName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  priceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  catalogPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  moqBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moqBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  termExplanation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  subHelperLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  helperLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    height: 44,
    overflow: 'hidden',
  },
  stepperButton: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  stepperButtonDisabled: {
    opacity: 0.5,
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
  },
  singleLineInput: {
    height: 42,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 4,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    height: 42,
    paddingVertical: 0,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  liveCalculationBox: {
    backgroundColor: colors.primaryLight + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight + '40',
    marginTop: spacing.xs,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  calcValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  calcSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  pill: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.textInverse,
  },
  textArea: {
    height: 80,
    alignItems: 'flex-start',
    paddingVertical: spacing.xs + 2,
  },
  formRow: {
    flexDirection: 'row',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
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
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  bottomBarTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    minWidth: 140,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
  ownProductBlockedBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    marginBottom: spacing.md,
  },
  ownProductBlockedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  ownProductBlockedTextWrapper: {
    flex: 1,
  },
  ownProductBlockedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },
  ownProductBlockedSubtitle: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 16,
  },
});

