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
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import {
  getQuotationById,
  respondToQuotation,
  getQuotationStatusColor,
  subscribeQuotations,
} from '../data/quotations';

const RESPONSE_MODES = [
  { key: 'quote', label: 'Provide Quote' },
  { key: 'counter', label: 'Suggest a Different Price' },
  { key: 'reject', label: 'Decline Request' },
];

const VALIDITY_OPTIONS = [7, 14, 30];

const DECLINE_REASONS = [
  'Production capacity currently full',
  'Requested quantity below custom manufacturing Minimum Order Quantity',
  'Cannot meet requested delivery deadline',
  'Target price not economically viable',
  'Custom specification / raw material unavailable',
];

export default function SellerQuotationDetailsScreen({
  navigation,
  route,
  quotation: propQuotation,
  onBackPress,
  onNavigateToSellerQuotations,
  onNavigateToProductDetails,
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

  const [responseMode, setResponseMode] = useState('quote');
  const [quotedPriceText, setQuotedPriceText] = useState('');
  const [quotedQtyText, setQuotedQtyText] = useState('');
  const [validityDays, setValidityDays] = useState(14);
  const [dispatchTimeline, setDispatchTimeline] = useState('3-5 business days');
  const [freightTerms, setFreightTerms] = useState('Standard freight logistics via Delhivery B2B included. GST extra.');
  const [sellerNotes, setSellerNotes] = useState('');

  // Counter-offer state
  const [counterQtyText, setCounterQtyText] = useState('');
  const [counterPriceText, setCounterPriceText] = useState('');
  const [counterReason, setCounterReason] = useState('');

  // Decline state
  const [selectedDeclineReason, setSelectedDeclineReason] = useState(DECLINE_REASONS[0]);

  const [actionLoading, setActionLoading] = useState(false);

  // Initialize form defaults based on quotation
  useEffect(() => {
    const q = getQuotationById(quotationId);
    if (q) {
      setQuotation(q);
      const defaultUnitPrice =
        q.quotedUnitPrice ||
        q.buyerTargetPrice ||
        q.product?.price ||
        250;
      const defaultQty = q.quotedQuantity || q.requestedQuantity || 1;

      setQuotedPriceText(String(defaultUnitPrice));
      setQuotedQtyText(String(defaultQty));
      setCounterPriceText(String(defaultUnitPrice));
      setCounterQtyText(String(Math.round(defaultQty * 1.5)));
    }

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

  const handleDialBuyer = useCallback(() => {
    const phone = quotation?.buyerInfo?.phone || quotation?.deliveryAddress?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Phone Dialing Unavailable', `Cannot place calls directly to ${phone}.`);
      });
    }
  }, [quotation]);

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

  // Submit response handler
  const handleSubmitResponse = useCallback(async () => {
    if (!quotation) return;

    if (responseMode === 'quote') {
      const unitPrice = parseFloat(quotedPriceText);
      const qty = parseInt(quotedQtyText, 10);

      if (isNaN(unitPrice) || unitPrice <= 0) {
        Alert.alert('Invalid Quoted Price', 'Please enter a valid unit price.');
        return;
      }
      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Invalid Quantity', 'Please enter a valid consignment quantity.');
        return;
      }

      setActionLoading(true);
      try {
        const res = await respondToQuotation(quotation.id, {
          type: 'quote',
          quotedUnitPrice: unitPrice,
          quotedQuantity: qty,
          validityDays,
          dispatchTimeline,
          freightTerms,
          sellerNotes: sellerNotes.trim() || 'Formal commercial quote provided by supplier.',
        });

        if (res.success) {
          setQuotation(res.quotation);
          Alert.alert('Quotation Sent', `Commercial quote of ₹${unitPrice}/unit sent to buyer.`);
        } else {
          Alert.alert('Error', res.message || 'Failed to submit quotation.');
        }
      } catch (err) {
        console.warn('Submit quote error:', err);
      } finally {
        setActionLoading(false);
      }
    } else if (responseMode === 'counter') {
      const counterPrice = parseFloat(counterPriceText);
      const counterQty = parseInt(counterQtyText, 10);

      if (isNaN(counterPrice) || counterPrice <= 0) {
        Alert.alert('Invalid Counter Price', 'Please enter a valid counter unit price.');
        return;
      }
      if (isNaN(counterQty) || counterQty <= 0) {
        Alert.alert('Invalid Counter Quantity', 'Please enter a valid counter quantity.');
        return;
      }

      setActionLoading(true);
      try {
        const res = await respondToQuotation(quotation.id, {
          type: 'counter',
          quotedUnitPrice: counterPrice,
          quotedQuantity: counterQty,
          validityDays,
          dispatchTimeline,
          freightTerms,
          sellerNotes:
            counterReason.trim() ||
            `Seller suggested ${counterQty} units at ₹${counterPrice}/unit.`,
        });

        if (res.success) {
          setQuotation(res.quotation);
          Alert.alert('Suggested Price Sent', `Suggested price of ${counterQty} units @ ₹${counterPrice} sent to buyer.`);
        } else {
          Alert.alert('Error', res.message || 'Failed to submit suggested price.');
        }
      } catch (err) {
        console.warn('Submit counter error:', err);
      } finally {
        setActionLoading(false);
      }
    } else if (responseMode === 'reject') {
      setActionLoading(true);
      try {
        const res = await respondToQuotation(quotation.id, {
          type: 'reject',
          rejectionReason: selectedDeclineReason,
        });

        if (res.success) {
          setQuotation(res.quotation);
          Alert.alert('RFQ Declined', 'Quotation request marked as declined.');
        } else {
          Alert.alert('Error', res.message || 'Failed to decline RFQ.');
        }
      } catch (err) {
        console.warn('Decline error:', err);
      } finally {
        setActionLoading(false);
      }
    }
  }, [
    quotation,
    responseMode,
    quotedPriceText,
    quotedQtyText,
    validityDays,
    dispatchTimeline,
    freightTerms,
    sellerNotes,
    counterPriceText,
    counterQtyText,
    counterReason,
    selectedDeclineReason,
  ]);

  if (!quotation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RFQ Not Found</Text>
        </View>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Quotation request not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = getQuotationStatusColor(quotation.status);
  const prod = quotation.product || {};
  const buyer = quotation.buyerInfo || quotation.deliveryAddress || {};
  const imageUri = prod.image || (Array.isArray(prod.images) ? prod.images[0] : null);

  const isPending =
    quotation.status === 'Submitted' || quotation.status === 'Pending';
  const hasResponded =
    quotation.status !== 'Submitted' && quotation.status !== 'Pending';
  const isAccepted =
    quotation.status === 'Accepted' || quotation.status === 'Ordered';
  const isRejected =
    quotation.status?.includes('Rejected') || quotation.status?.includes('Declined');

  // Live calculation for preview
  const previewUnitPrice = parseFloat(quotedPriceText) || 0;
  const previewQty = parseInt(quotedQtyText, 10) || 0;
  const previewTotal = previewUnitPrice * previewQty;

  const counterPreviewPrice = parseFloat(counterPriceText) || 0;
  const counterPreviewQty = parseInt(counterQtyText, 10) || 0;
  const counterPreviewTotal = counterPreviewPrice * counterPreviewQty;

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
          <Text style={styles.headerTitle}>Price Request #{quotation.id || quotation.quotationNumber}</Text>
          <Text style={styles.headerSubtitle}>
            Received {new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Status Callout if Accepted */}
        {isAccepted && (
          <View style={styles.acceptedCallout}>
            <Ionicons name="checkmark-done-circle" size={20} color="#065F46" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.acceptedCalloutTitle}>Buyer Accepted Order Terms</Text>
              <Text style={styles.acceptedCalloutSubtitle}>
                {quotation.status === 'Ordered'
                  ? `Consignment order has been placed (#${quotation.orderId || 'Active'}).`
                  : 'Prepare consignment inventory for upcoming order fulfillment.'}
              </Text>
            </View>
          </View>
        )}

        {/* Buyer Contact Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.buyerIconBox}>
              <Ionicons name="business" size={20} color={colors.primary} />
            </View>
            <View style={styles.buyerInfo}>
              <Text style={styles.buyerBusinessName}>
                {buyer.businessName || buyer.fullName || 'Wholesale Buyer'}
              </Text>
              <Text style={styles.buyerContactName}>
                Contact: {buyer.fullName || 'Authorized Purchase Manager'}
              </Text>
              {buyer.city ? (
                <Text style={styles.buyerLocation}>
                  Location: {buyer.city}{buyer.state ? `, ${buyer.state}` : ''}
                </Text>
              ) : null}
            </View>

            {buyer.phone ? (
              <TouchableOpacity
                style={styles.callButton}
                onPress={handleDialBuyer}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Call Buyer"
              >
                <Ionicons name="call" size={16} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Product Requested Card */}
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={handleProductPress}>
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
              <Text style={styles.productMetaText}>
                Catalog Price: ₹{prod.price || 0}/{prod.unit || 'unit'} · MOQ: {prod.moq || 1}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Buyer Request Details Table */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Buyer Requirements</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Requested Quantity</Text>
            <Text style={styles.detailValueBold}>
              {quotation.requestedQuantity} {prod.unit || 'units'}
            </Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Buyer Target Price</Text>
            <Text style={[styles.detailValueBold, { color: colors.primary }]}>
              {quotation.buyerTargetPrice ? `₹${quotation.buyerTargetPrice}/${prod.unit || 'unit'}` : 'Open to Supplier Quote'}
            </Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Buyer Budget</Text>
            <Text style={styles.detailValueBold}>
              ₹{(
                (quotation.buyerTargetPrice || prod.price || 0) *
                quotation.requestedQuantity
              ).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Required By Date</Text>
            <Text style={styles.detailValueText}>
              {quotation.requiredByDate || 'Flexible timeline'}
            </Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Preferred Payment</Text>
            <Text style={styles.detailValueText}>
              {quotation.paymentTerms || 'Standard Terms'}
            </Text>
          </View>

          {Boolean(quotation.buyerNotes) && (
            <>
              <View style={styles.rowDivider} />
              <View style={{ marginTop: spacing.xs }}>
                <Text style={styles.detailLabel}>Buyer Specifications & Notes:</Text>
                <View style={styles.buyerNotesBox}>
                  <Text style={styles.buyerNotesText}>{quotation.buyerNotes}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Response Section */}
        {isPending ? (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Your Response & Order Terms</Text>

            {/* Mode Selector */}
            <View style={styles.modeTabs}>
              {RESPONSE_MODES.map((m) => {
                const isSelected = responseMode === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.modeTab, isSelected && styles.modeTabSelected]}
                    onPress={() => setResponseMode(m.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeTabText, isSelected && styles.modeTabTextSelected]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Mode 1: Provide Quote */}
            {responseMode === 'quote' && (
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quoted Unit Price (₹ / {prod.unit || 'unit'}) *</Text>
                  <View style={styles.textInputBox}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.inputField}
                      keyboardType="numeric"
                      value={quotedPriceText}
                      onChangeText={setQuotedPriceText}
                      placeholder="e.g. 265"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quoted Consignment Quantity ({prod.unit || 'units'}) *</Text>
                  <View style={styles.textInputBox}>
                    <TextInput
                      style={styles.inputField}
                      keyboardType="numeric"
                      value={quotedQtyText}
                      onChangeText={setQuotedQtyText}
                      placeholder="e.g. 30"
                    />
                  </View>
                </View>

                {/* Live calculation banner */}
                <View style={styles.liveCalcCard}>
                  <Text style={styles.liveCalcLabel}>Total Quoted Consignment Value:</Text>
                  <Text style={styles.liveCalcAmount}>₹{previewTotal.toLocaleString('en-IN')}</Text>
                  <Text style={styles.liveCalcSubtext}>
                    {previewQty} {prod.unit || 'units'} × ₹{previewUnitPrice}
                  </Text>
                </View>

                {/* Validity Period */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quotation Validity Period</Text>
                  <View style={styles.pillsRow}>
                    {VALIDITY_OPTIONS.map((days) => (
                      <TouchableOpacity
                        key={days}
                        style={[styles.pill, validityDays === days && styles.pillSelected]}
                        onPress={() => setValidityDays(days)}
                      >
                        <Text style={[styles.pillText, validityDays === days && styles.pillTextSelected]}>
                          {days} Days
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Dispatch Timeline */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Dispatch Timeline</Text>
                  <TextInput
                    style={[styles.textInputBox, styles.singleLineInput]}
                    value={dispatchTimeline}
                    onChangeText={setDispatchTimeline}
                    placeholder="e.g. 3-5 business days"
                  />
                </View>

                {/* Freight & Tax Terms */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Freight & Tax Terms</Text>
                  <TextInput
                    style={[styles.textInputBox, styles.singleLineInput]}
                    value={freightTerms}
                    onChangeText={setFreightTerms}
                    placeholder="e.g. Freight extra, GST 12%"
                  />
                </View>

                {/* Seller Notes */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Commercial Remarks & Quality Guarantee</Text>
                  <TextInput
                    style={[styles.textInputBox, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    value={sellerNotes}
                    onChangeText={setSellerNotes}
                    placeholder="Add details regarding custom finishes, packaging, or bulk dispatch schedule..."
                  />
                </View>
              </View>
            )}

            {/* Mode 2: Suggest a Different Price */}
            {responseMode === 'counter' && (
              <View style={styles.formContainer}>
                <View style={styles.counterNoticeBox}>
                  <Ionicons name="information-circle" size={16} color="#92400E" style={{ marginRight: 6 }} />
                  <Text style={styles.counterNoticeText}>
                    Suggest a Different Price: Offer a different price to the buyer. Propose an alternate quantity or unit price.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Suggested Quantity ({prod.unit || 'units'}) *</Text>
                  <View style={styles.textInputBox}>
                    <TextInput
                      style={styles.inputField}
                      keyboardType="numeric"
                      value={counterQtyText}
                      onChangeText={setCounterQtyText}
                      placeholder="e.g. 100"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Suggested Unit Price (₹ / {prod.unit || 'unit'}) *</Text>
                  <View style={styles.textInputBox}>
                    <Text style={styles.currencyPrefix}>₹</Text>
                    <TextInput
                      style={styles.inputField}
                      keyboardType="numeric"
                      value={counterPriceText}
                      onChangeText={setCounterPriceText}
                      placeholder="e.g. 155"
                    />
                  </View>
                </View>

                <View style={styles.liveCalcCard}>
                  <Text style={styles.liveCalcLabel}>Suggested Order Total:</Text>
                  <Text style={styles.liveCalcAmount}>₹{counterPreviewTotal.toLocaleString('en-IN')}</Text>
                  <Text style={styles.liveCalcSubtext}>
                    {counterPreviewQty} {prod.unit || 'units'} × ₹{counterPreviewPrice}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Suggested Price Rationale / Notes *</Text>
                  <TextInput
                    style={[styles.textInputBox, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    value={counterReason}
                    onChangeText={setCounterReason}
                    placeholder="Explain why this quantity or pricing is suggested (e.g., minimum batch run, material cost)..."
                  />
                </View>
              </View>
            )}

            {/* Mode 3: Decline Request */}
            {responseMode === 'reject' && (
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>Select Reason for Declining Price Request</Text>
                <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
                  {DECLINE_REASONS.map((r) => {
                    const isSelected = selectedDeclineReason === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[styles.declineOption, isSelected && styles.declineOptionSelected]}
                        onPress={() => setSelectedDeclineReason(r)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={isSelected ? colors.error : colors.textMuted}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.declineOptionText, isSelected && styles.declineOptionTextSelected]}>
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ) : (
          /* Already Responded View */
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Your Submitted Response</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quoted Unit Price</Text>
              <Text style={[styles.detailValueBold, { color: colors.primary }]}>
                ₹{quotation.quotedUnitPrice}/{prod.unit || 'unit'}
              </Text>
            </View>
            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quoted Quantity</Text>
              <Text style={styles.detailValueBold}>
                {quotation.quotedQuantity} {prod.unit || 'units'}
              </Text>
            </View>
            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Consignment Total</Text>
              <Text style={styles.detailValueBold}>
                ₹{(Number(quotation.quotedTotalAmount) || (quotation.quotedUnitPrice * quotation.quotedQuantity)).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Validity Period</Text>
              <Text style={styles.detailValueText}>
                {quotation.validityDays ? `${quotation.validityDays} Days` : 'Standard'}
              </Text>
            </View>
            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dispatch Timeline</Text>
              <Text style={styles.detailValueText}>
                {quotation.dispatchTimeline || 'Standard Freight'}
              </Text>
            </View>

            {Boolean(quotation.sellerNotes) && (
              <>
                <View style={styles.rowDivider} />
                <View style={{ marginTop: spacing.xs }}>
                  <Text style={styles.detailLabel}>Your Notes to Buyer:</Text>
                  <View style={styles.buyerNotesBox}>
                    <Text style={styles.buyerNotesText}>{quotation.sellerNotes}</Text>
                  </View>
                </View>
              </>
            )}

            {Boolean(quotation.rejectionReason) && (
              <>
                <View style={styles.rowDivider} />
                <View style={{ marginTop: spacing.xs }}>
                  <Text style={[styles.detailLabel, { color: colors.error }]}>Decline Reason:</Text>
                  <Text style={[styles.buyerNotesText, { color: colors.error }]}>
                    {quotation.rejectionReason}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Negotiation History & Messages Timeline */}
        {Array.isArray(quotation.messages) && quotation.messages.length > 0 && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionHeading}>Negotiation History ({quotation.messages.length})</Text>
            </View>

            <View style={{ marginTop: spacing.xs }}>
              {quotation.messages.map((msg, idx) => {
                const isBuyerSender = msg.senderRole === 'BUYER';
                return (
                  <View key={msg.id || idx} style={styles.timelineItem}>
                    <View style={[styles.timelineBadge, isBuyerSender ? styles.buyerBadge : styles.sellerBadge]}>
                      <Text style={[styles.timelineBadgeText, isBuyerSender ? styles.buyerBadgeText : styles.sellerBadgeText]}>
                        {isBuyerSender ? 'Buyer' : 'You (Supplier)'}
                      </Text>
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text style={styles.timelineAction}>
                          {msg.action === 'SUBMIT'
                            ? 'Initial Request Submitted'
                            : msg.action === 'QUOTE'
                            ? 'Formal Quotation Provided'
                            : msg.action === 'BUYER_COUNTER'
                            ? 'Buyer Counter-Offer'
                            : msg.action === 'SELLER_COUNTER'
                            ? 'Supplier Counter-Offer'
                            : msg.action === 'ACCEPT'
                            ? 'Quotation Accepted'
                            : msg.action === 'CONVERT_TO_ORDER'
                            ? 'Order Placed'
                            : msg.action.includes('REJECT')
                            ? 'Quotation Declined'
                            : msg.action}
                        </Text>
                        {msg.createdAt && (
                          <Text style={styles.timelineDate}>
                            {new Date(msg.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        )}
                      </View>

                      {msg.price !== null && msg.price !== undefined && (
                        <Text style={styles.timelinePriceText}>
                          {msg.quantity ? `${msg.quantity} ${prod.unit || 'units'} @ ` : ''}₹{msg.price}/unit
                        </Text>
                      )}

                      {msg.notes ? (
                        <Text style={styles.timelineNotes}>{msg.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Footer */}
      {isPending && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryActionBtn,
              responseMode === 'reject' && { backgroundColor: colors.error },
            ]}
            onPress={handleSubmitResponse}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <Ionicons
                  name={
                    responseMode === 'quote'
                      ? 'paper-plane'
                      : responseMode === 'counter'
                      ? 'swap-horizontal'
                      : 'close-circle'
                  }
                  size={18}
                  color={colors.textInverse}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.primaryActionBtnText}>
                  {responseMode === 'quote'
                    ? 'Send Formal Quotation'
                    : responseMode === 'counter'
                    ? 'Send Suggested Price'
                    : 'Decline Price Request'}
                </Text>
              </>
            )}
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
  acceptedCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  acceptedCalloutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  acceptedCalloutSubtitle: {
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyerIconBox: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  buyerInfo: {
    flex: 1,
  },
  buyerBusinessName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  buyerContactName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  buyerLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight + '20',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
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
    marginBottom: 4,
  },
  productMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailValueText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  buyerNotesBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyerNotesText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.sm,
  },
  modeTabSelected: {
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeTabTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  formContainer: {
    marginTop: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
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
  textArea: {
    height: 72,
    alignItems: 'flex-start',
    paddingVertical: spacing.xs + 2,
  },
  liveCalcCard: {
    backgroundColor: colors.primaryLight + '15',
    borderWidth: 1,
    borderColor: colors.primaryLight + '40',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  liveCalcLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  liveCalcAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  liveCalcSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontWeight: '700',
  },
  counterNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  counterNoticeText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  declineOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  declineOptionSelected: {
    borderColor: colors.error,
    backgroundColor: '#FEE2E2',
  },
  declineOptionText: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  declineOptionTextSelected: {
    color: colors.error,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
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
  },
  // Timeline styles
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  timelineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  buyerBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  sellerBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  timelineBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  buyerBadgeText: {
    color: '#1E40AF',
  },
  sellerBadgeText: {
    color: '#92400E',
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineAction: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timelineDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  timelinePriceText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 1,
  },
  timelineNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    fontStyle: 'italic',
  },
});

