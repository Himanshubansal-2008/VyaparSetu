import AsyncStorage from '@react-native-async-storage/async-storage';
import { isProductOwnedByCurrentSeller } from './businessProfileData.js';

const storage = AsyncStorage.default || AsyncStorage;

export const STORAGE_KEY_QUOTATIONS = '@vyaparsetu_quotations';

/**
 * Standard progression statuses for wholesale quotation workflow.
 */
export const QUOTATION_STATUSES = {
  SUBMITTED: 'Submitted',
  QUOTE_PROVIDED: 'Quotation Provided',
  COUNTER_OFFER: 'Counter-Offer Made',
  ACCEPTED: 'Accepted',
  REJECTED_SELLER: 'Rejected by Seller',
  REJECTED_BUYER: 'Rejected by Buyer',
  ORDERED: 'Ordered',
};

/**
 * Permitted status transitions to strictly guard quotation workflow.
 */
export const VALID_QUOTATION_TRANSITIONS = {
  Submitted: ['Quotation Provided', 'Counter-Offer Made', 'Rejected by Seller', 'Rejected by Buyer'],
  'Quotation Provided': ['Accepted', 'Rejected by Buyer', 'Counter-Offer Made', 'Quotation Provided'],
  'Counter-Offer Made': ['Accepted', 'Rejected by Buyer', 'Counter-Offer Made'],
  Accepted: ['Ordered', 'Rejected by Buyer'],
  'Rejected by Seller': [],
  'Rejected by Buyer': [],
  Ordered: [],
};

export const canTransitionQuotationStatus = (currentStatus, targetStatus) => {
  if (!targetStatus) return false;
  const currentKey = Object.keys(VALID_QUOTATION_TRANSITIONS).find(
    (k) => k.toLowerCase() === String(currentStatus || 'Submitted').trim().toLowerCase()
  );
  if (!currentKey) return false;
  const allowed = VALID_QUOTATION_TRANSITIONS[currentKey] || [];
  return allowed.some(
    (s) => s.toLowerCase() === String(targetStatus).trim().toLowerCase()
  );
};

/**
 * Color tokens and icon descriptors for quotation status badges.
 */
export const getQuotationStatusColor = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  switch (normalized) {
    case 'accepted':
      return {
        bg: '#D1FAE5',
        text: '#065F46',
        border: '#10B981',
        icon: 'checkmark-circle-outline',
        label: 'Quote Accepted',
      };
    case 'ordered':
      return {
        bg: '#ECFDF5',
        text: '#047857',
        border: '#059669',
        icon: 'bag-check-outline',
        label: 'Order Placed',
      };
    case 'quotation provided':
    case 'quote provided':
      return {
        bg: '#DBEAFE',
        text: '#1E40AF',
        border: '#3B82F6',
        icon: 'document-text-outline',
        label: 'Quote Received',
      };
    case 'counter-offer made':
    case 'counter-offer':
    case 'countered':
      return {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#F59E0B',
        icon: 'swap-horizontal-outline',
        label: 'Different Price Suggested',
      };
    case 'rejected by seller':
    case 'rejected by buyer':
    case 'rejected':
      return {
        bg: '#FEE2E2',
        text: '#991B1B',
        border: '#EF4444',
        icon: 'close-circle-outline',
        label: normalized.includes('seller') ? 'Declined by Seller' : 'Declined by Buyer',
      };
    case 'submitted':
    case 'pending':
    default:
      return {
        bg: '#F3E8FF',
        text: '#6B21A8',
        border: '#A855F7',
        icon: 'hourglass-outline',
        label: 'Pending Supplier Response',
      };
  }
};

/**
 * Generates unique wholesale quotation identifier.
 * Example format: QUOT-M1A2B3-7890
 */
export const generateQuotationId = () => {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `QUOT-${timestampPart}-${randomSuffix}`;
};

/**
 * Default mock seed quotations to test multi-seller isolation and workflow immediately.
 */
export const DEFAULT_SEED_QUOTATIONS = [
  {
    id: 'QUOT-SH-9102',
    quotationNumber: 'QUOT-SH-9102',
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    status: 'Quotation Provided',
    buyerId: 'buyer-session-001',
    buyerInfo: {
      fullName: 'Rajesh Kumar',
      businessName: 'Kumar Handicrafts & Emporium',
      phone: '+91 9876543210',
      city: 'Ahmedabad',
      state: 'Gujarat',
      gstin: '24AAECK1234F1Z5',
    },
    productId: 'prod-008',
    product: {
      id: 'prod-008',
      title: 'Handcrafted Wooden Wall Hanging',
      name: 'Handcrafted Wooden Wall Hanging',
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600',
      category: 'Handicrafts',
      unit: 'piece',
      price: 400,
      moq: 15,
      sellerId: 'biz-sharma-handicrafts',
      sellerName: 'Sharma Handicrafts',
    },
    sellerId: 'biz-sharma-handicrafts',
    sellerName: 'Sharma Handicrafts',
    requestedQuantity: 30,
    buyerTargetPrice: 250,
    requiredByDate: 'Within 15 days',
    deliveryAddress: {
      fullName: 'Rajesh Kumar',
      businessName: 'Kumar Handicrafts & Emporium',
      phone: '+91 9876543210',
      streetAddress: 'Shop 14, Commercial Complex, Ring Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
    },
    paymentTerms: '50% Advance + 50% on Delivery',
    buyerNotes: 'Need high-grade teak wood finish with protective lacquer polish for hotel export consignment.',
    // Seller response details
    respondedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    quotedUnitPrice: 265,
    quotedQuantity: 30,
    quotedTotalAmount: 7950,
    validityDays: 14,
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    dispatchTimeline: '3-5 business days from order confirmation',
    freightTerms: 'Freight logistics via Delhivery B2B included. GST extra at 12%.',
    sellerNotes: 'We can fulfill 30 units with premium hand-rubbed teak finish. Sample swatches dispatched yesterday.',
  },
  {
    id: 'QUOT-SH-9103',
    quotationNumber: 'QUOT-SH-9103',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'Submitted',
    buyerId: 'buyer-session-001',
    buyerInfo: {
      fullName: 'Vikram Mehta',
      businessName: 'Apex Corporate Gifts Ltd',
      phone: '+91 9811223344',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstin: '27AAECV9988Z1A1',
    },
    productId: 'prod-007',
    product: {
      id: 'prod-007',
      title: 'Brass Pooja Thali Set',
      name: 'Brass Pooja Thali Set',
      image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600',
      category: 'Handicrafts',
      unit: 'piece',
      price: 550,
      moq: 20,
      sellerId: 'biz-sharma-handicrafts',
      sellerName: 'Sharma Handicrafts',
    },
    sellerId: 'biz-sharma-handicrafts',
    sellerName: 'Sharma Handicrafts',
    requestedQuantity: 50,
    buyerTargetPrice: 380,
    requiredByDate: 'Within 7 days',
    deliveryAddress: {
      fullName: 'Vikram Mehta',
      businessName: 'Apex Corporate Gifts Ltd',
      phone: '+91 9811223344',
      streetAddress: 'Tower B, 4th Floor, Peninsula Park, Lower Parel',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400013',
    },
    paymentTerms: '100% Advance via RTGS/NEFT',
    buyerNotes: 'Need velvet presentation box packaging for corporate Diwali executive gift sets.',
  },
  {
    id: 'QUOT-TH-4821',
    quotationNumber: 'QUOT-TH-4821',
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    status: 'Counter-Offer Made',
    buyerId: 'buyer-session-001',
    buyerInfo: {
      fullName: 'Rajesh Kumar',
      businessName: 'Kumar Handicrafts & Emporium',
      phone: '+91 9876543210',
      city: 'Ahmedabad',
      state: 'Gujarat',
      gstin: '24AAECK1234F1Z5',
    },
    productId: 'prod-001',
    product: {
      id: 'prod-001',
      title: 'Handwoven Cotton Tote Bag',
      name: 'Handwoven Cotton Tote Bag',
      image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600',
      category: 'Clothing',
      unit: 'piece',
      price: 220,
      moq: 50,
      sellerId: 'biz-001',
      sellerName: 'Shree Handloom Works',
    },
    sellerId: 'biz-001',
    sellerName: 'Shree Handloom Works',
    requestedQuantity: 60,
    buyerTargetPrice: 140,
    requiredByDate: 'Within 30 days',
    deliveryAddress: {
      fullName: 'Rajesh Kumar',
      businessName: 'Kumar Handicrafts & Emporium',
      phone: '+91 9876543210',
      streetAddress: 'Shop 14, Commercial Complex, Ring Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
    },
    paymentTerms: 'Net 30 Days',
    buyerNotes: 'Looking for natural unbleached cotton with custom brand stencil on one side.',
    // Counter-Offer details
    respondedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    quotedUnitPrice: 155,
    quotedQuantity: 100,
    quotedTotalAmount: 15500,
    validityDays: 10,
    validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    dispatchTimeline: '7-10 business days',
    freightTerms: 'Door delivery included for batch size >= 100 units.',
    sellerNotes: 'For custom brand stenciling, our loom printing run requires minimum 100 units. We counter-offer 100 units at ₹155/unit with pre-shrunk organic cotton.',
    isCounterOffer: true,
  },
  {
    id: 'QUOT-RP-3012',
    quotationNumber: 'QUOT-RP-3012',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    status: 'Accepted',
    buyerId: 'buyer-session-001',
    buyerInfo: {
      fullName: 'Rajesh Kumar',
      businessName: 'Kumar Handicrafts & Emporium',
      phone: '+91 9876543210',
      city: 'Ahmedabad',
      state: 'Gujarat',
      gstin: '24AAECK1234F1Z5',
    },
    productId: 'prod-003',
    product: {
      id: 'prod-003',
      title: 'Jaipur Blue Pottery Ceramic Vase',
      name: 'Jaipur Blue Pottery Ceramic Vase',
      image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600',
      category: 'Handicrafts',
      unit: 'piece',
      price: 420,
      moq: 10,
      sellerId: 'biz-003',
      sellerName: 'Rang Artisan Collective',
    },
    sellerId: 'biz-003',
    sellerName: 'Rang Artisan Collective',
    requestedQuantity: 25,
    buyerTargetPrice: 300,
    requiredByDate: 'Within 15 days',
    deliveryAddress: {
      fullName: 'Rajesh Kumar',
      businessName: 'Kumar Handicrafts & Emporium',
      phone: '+91 9876543210',
      streetAddress: 'Shop 14, Commercial Complex, Ring Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
    },
    paymentTerms: '50% Advance + 50% on Delivery',
    buyerNotes: 'Need foam-cushioned bubble packing to avoid transit damage.',
    respondedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    quotedUnitPrice: 310,
    quotedQuantity: 25,
    quotedTotalAmount: 7750,
    validityDays: 15,
    validUntil: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    dispatchTimeline: '4-6 business days',
    freightTerms: 'Thermocol boxed wooden crate packaging included.',
    sellerNotes: 'Special glazed ceramic finish with export-grade packaging guaranteed.',
    acceptedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

let inMemoryQuotations = [...DEFAULT_SEED_QUOTATIONS];
const quotationListeners = new Set();

const notifyQuotationListeners = () => {
  quotationListeners.forEach((listener) => {
    try {
      listener([...inMemoryQuotations]);
    } catch (e) {
      console.warn('[quotations] Error notifying listener:', e);
    }
  });
};

export const subscribeQuotations = (listener) => {
  if (typeof listener === 'function') {
    quotationListeners.add(listener);
    listener([...inMemoryQuotations]);
    return () => quotationListeners.delete(listener);
  }
  return () => {};
};

/**
 * Loads quotations from AsyncStorage on startup.
 * Seeds initial mock previous quotations if storage is empty.
 */
export const loadPersistedQuotations = async () => {
  try {
    const raw = await storage.getItem(STORAGE_KEY_QUOTATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryQuotations = parsed;
        notifyQuotationListeners();
        return inMemoryQuotations;
      }
    }
    // If not in storage yet, seed initial mock quotations and persist
    inMemoryQuotations = [...DEFAULT_SEED_QUOTATIONS];
    await storage.setItem(STORAGE_KEY_QUOTATIONS, JSON.stringify(inMemoryQuotations));
    notifyQuotationListeners();
    return inMemoryQuotations;
  } catch (error) {
    console.warn('[quotations] Failed to load persisted quotations:', error);
  }
  if (!inMemoryQuotations.length) {
    inMemoryQuotations = [...DEFAULT_SEED_QUOTATIONS];
  }
  return inMemoryQuotations;
};

/**
 * Returns all quotations in memory.
 */
export const getQuotations = () => {
  return [...inMemoryQuotations];
};

/**
 * Returns a quotation by ID.
 */
export const getQuotationById = (quotationId) => {
  if (!quotationId) return null;
  const cleanId = String(quotationId).trim().toLowerCase();
  return (
    inMemoryQuotations.find(
      (q) =>
        String(q.id || '').trim().toLowerCase() === cleanId ||
        String(q.quotationNumber || '').trim().toLowerCase() === cleanId
    ) || null
  );
};

/**
 * Filters quotations submitted by or belonging to the buyer.
 */
export const getQuotationsForBuyer = (buyerId = null) => {
  if (!buyerId) return [...inMemoryQuotations];
  const cleanBuyerId = String(buyerId).trim().toLowerCase();
  return inMemoryQuotations.filter((q) => {
    const qBuyer = String(q.buyerId || '').trim().toLowerCase();
    return !qBuyer || qBuyer === cleanBuyerId || qBuyer === 'buyer-session-001';
  });
};

/**
 * Strictly filters quotations intended for a specific seller/business.
 * Enforces business identity isolation.
 */
export const getQuotationsForSeller = (sellerId, allProducts = []) => {
  if (!sellerId) return [];
  const cleanSellerId = String(sellerId).trim().toLowerCase();

  return inMemoryQuotations.filter((q) => {
    // 1. Direct match on quote sellerId
    if (q.sellerId && String(q.sellerId).trim().toLowerCase() === cleanSellerId) {
      return true;
    }
    // 2. Direct match on quote product's sellerId / businessId
    if (
      q.product?.sellerId &&
      String(q.product.sellerId).trim().toLowerCase() === cleanSellerId
    ) {
      return true;
    }
    if (
      q.product?.businessId &&
      String(q.product.businessId).trim().toLowerCase() === cleanSellerId
    ) {
      return true;
    }
    // 3. Fallback: match via catalog definition
    if (q.productId && Array.isArray(allProducts)) {
      const matchProd = allProducts.find((p) => p.id === q.productId);
      if (
        matchProd &&
        (String(matchProd.sellerId || '').trim().toLowerCase() === cleanSellerId ||
          String(matchProd.businessId || '').trim().toLowerCase() === cleanSellerId)
      ) {
        return true;
      }
    }
    return false;
  });
};

/**
 * Saves or updates a quotation in memory and AsyncStorage.
 */
export const saveQuotation = async (quotationData) => {
  if (!quotationData) return null;

  const quotationId = quotationData.id || generateQuotationId();
  const newQuotation = {
    ...quotationData,
    id: quotationId,
    quotationNumber: quotationId,
    createdAt: quotationData.createdAt || new Date().toISOString(),
    status: quotationData.status || 'Submitted',
  };

  inMemoryQuotations = [
    newQuotation,
    ...inMemoryQuotations.filter((q) => q.id !== quotationId),
  ];
  notifyQuotationListeners();

  try {
    await storage.setItem(
      STORAGE_KEY_QUOTATIONS,
      JSON.stringify(inMemoryQuotations)
    );
  } catch (error) {
    console.warn('[quotations] Failed to persist quotations:', error);
  }

  return newQuotation;
};

/**
 * Creates and submits a new Buyer Quotation Request.
 */
export const submitQuotationRequest = async ({
  product,
  quantity,
  targetPrice = null,
  deliveryAddress = null,
  paymentTerms = '50% Advance + 50% on Delivery',
  requiredByDate = 'Within 15 days',
  buyerNotes = '',
  buyerInfo = null,
}) => {
  if (!product || !product.id) {
    return { success: false, message: 'Invalid product details.' };
  }

  if (product.isDeleted || product.status === 'archived' || product.isArchived || product.isActive === false) {
    return {
      success: false,
      reason: 'product_unavailable',
      message: 'This product has been removed by the seller and is no longer available for price quotations.',
    };
  }

  if (isProductOwnedByCurrentSeller(product)) {
    return {
      success: false,
      reason: 'own_product',
      message: 'You cannot request a quotation for your own product.',
    };
  }

  const requestedQty = Math.max(1, Number(quantity) || Number(product.moq) || 1);
  const quotationId = generateQuotationId();

  const newRequest = {
    id: quotationId,
    quotationNumber: quotationId,
    createdAt: new Date().toISOString(),
    status: 'Submitted',
    buyerId: buyerInfo?.id || 'buyer-session-001',
    buyerInfo: buyerInfo || {
      fullName: deliveryAddress?.fullName || 'Wholesale Buyer',
      businessName: deliveryAddress?.businessName || 'Verified Wholesale Trader',
      phone: deliveryAddress?.phone || '+91 9876543210',
      city: deliveryAddress?.city || 'New Delhi',
      state: deliveryAddress?.state || 'Delhi',
      gstin: deliveryAddress?.gstin || '07AAAAA0000A1Z5',
    },
    productId: product.id,
    product: {
      id: product.id,
      title: product.title || product.name,
      name: product.name || product.title,
      image: product.image || (Array.isArray(product.images) ? product.images[0] : null),
      category: product.category || product.categoryName || 'General',
      unit: product.unit || 'piece',
      price: Number(product.price) || 0,
      moq: Number(product.moq) || 1,
      sellerId: product.sellerId || product.businessId || 'biz-sharma-handicrafts',
      sellerName: product.sellerName || 'Verified Supplier',
    },
    sellerId: product.sellerId || product.businessId || 'biz-sharma-handicrafts',
    sellerName: product.sellerName || 'Verified Supplier',
    requestedQuantity: requestedQty,
    buyerTargetPrice: targetPrice !== null && targetPrice !== undefined && targetPrice !== '' ? Number(targetPrice) : null,
    requiredByDate: requiredByDate || 'Within 15 days',
    deliveryAddress: deliveryAddress || null,
    paymentTerms: paymentTerms || '50% Advance + 50% on Delivery',
    buyerNotes: buyerNotes || '',
  };

  const saved = await saveQuotation(newRequest);
  return { success: true, quotation: saved };
};

/**
 * Allows a seller to respond to an incoming quotation request with:
 * - Direct Quotation (`type: 'quote'`)
 * - Counter-Offer (`type: 'counter'`)
 * - Rejection (`type: 'reject'`)
 */
export const respondToQuotation = async (quotationId, responseData) => {
  const quote = getQuotationById(quotationId);
  if (!quote) {
    return { success: false, message: 'Quotation request not found.' };
  }

  const {
    type = 'quote',
    quotedUnitPrice,
    quotedQuantity,
    validityDays = 14,
    dispatchTimeline = '3-5 business days',
    freightTerms = 'Standard B2B freight included. GST extra.',
    sellerNotes = '',
    rejectionReason = '',
  } = responseData;

  let newStatus = 'Quotation Provided';
  if (type === 'counter') {
    newStatus = 'Counter-Offer Made';
  } else if (type === 'reject') {
    newStatus = 'Rejected by Seller';
  }

  if (!canTransitionQuotationStatus(quote.status, newStatus)) {
    return {
      success: false,
      message: `Cannot transition quotation from "${quote.status}" to "${newStatus}".`,
    };
  }

  const unitPrice =
    quotedUnitPrice !== undefined && quotedUnitPrice !== null
      ? Number(quotedUnitPrice)
      : quote.buyerTargetPrice || quote.product?.price || 0;
  const qty =
    quotedQuantity !== undefined && quotedQuantity !== null
      ? Number(quotedQuantity)
      : quote.requestedQuantity || 1;
  const totalAmount = unitPrice * qty;

  const validDaysNum = Number(validityDays) || 14;
  const validUntilDate = new Date(Date.now() + validDaysNum * 24 * 60 * 60 * 1000).toISOString();

  const updatedQuote = {
    ...quote,
    status: newStatus,
    respondedAt: new Date().toISOString(),
    quotedUnitPrice: type !== 'reject' ? unitPrice : undefined,
    quotedQuantity: type !== 'reject' ? qty : undefined,
    quotedTotalAmount: type !== 'reject' ? totalAmount : undefined,
    validityDays: type !== 'reject' ? validDaysNum : undefined,
    validUntil: type !== 'reject' ? validUntilDate : undefined,
    dispatchTimeline: type !== 'reject' ? dispatchTimeline : undefined,
    freightTerms: type !== 'reject' ? freightTerms : undefined,
    sellerNotes: sellerNotes || '',
    rejectionReason: type === 'reject' ? rejectionReason || 'Supplier unable to meet request terms at this time.' : undefined,
    isCounterOffer: type === 'counter',
  };

  const saved = await saveQuotation(updatedQuote);
  return { success: true, quotation: saved };
};

/**
 * Buyer accepts a received quotation or counter-offer.
 */
export const acceptQuotationByBuyer = async (quotationId) => {
  const quote = getQuotationById(quotationId);
  if (!quote) {
    return { success: false, message: 'Quotation not found.' };
  }

  if (!canTransitionQuotationStatus(quote.status, 'Accepted')) {
    return {
      success: false,
      message: `Cannot accept quotation in current status "${quote.status}".`,
    };
  }

  // Check validity
  if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
    return {
      success: false,
      message: 'This quotation has expired. Please request an updated quotation.',
    };
  }

  const updatedQuote = {
    ...quote,
    status: 'Accepted',
    acceptedAt: new Date().toISOString(),
  };

  const saved = await saveQuotation(updatedQuote);
  return { success: true, quotation: saved };
};

/**
 * Buyer declines/rejects a received quotation or counter-offer.
 */
export const rejectQuotationByBuyer = async (quotationId, reason = '') => {
  const quote = getQuotationById(quotationId);
  if (!quote) {
    return { success: false, message: 'Quotation not found.' };
  }

  if (!canTransitionQuotationStatus(quote.status, 'Rejected by Buyer')) {
    return {
      success: false,
      message: `Cannot reject quotation in current status "${quote.status}".`,
    };
  }

  const updatedQuote = {
    ...quote,
    status: 'Rejected by Buyer',
    rejectedAt: new Date().toISOString(),
    buyerRejectionReason: reason || 'Buyer chose not to proceed with the quoted terms.',
  };

  const saved = await saveQuotation(updatedQuote);
  return { success: true, quotation: saved };
};

/**
 * Marks quotation as ordered after order placement.
 */
export const markQuotationAsOrdered = async (quotationId, orderId = null) => {
  const quote = getQuotationById(quotationId);
  if (!quote) return null;

  const updatedQuote = {
    ...quote,
    status: 'Ordered',
    orderId: orderId || quote.orderId,
    orderedAt: new Date().toISOString(),
  };

  return await saveQuotation(updatedQuote);
};

/**
 * Helper to convert an accepted quotation directly into a cart item format with locked price.
 */
export const convertQuotationToCartItem = (quotation) => {
  if (!quotation || !quotation.product) return null;

  const effectiveQty = Number(quotation.quotedQuantity) || Number(quotation.requestedQuantity) || 1;
  const effectivePrice =
    Number(quotation.quotedUnitPrice) ||
    Number(quotation.buyerTargetPrice) ||
    Number(quotation.product.price) ||
    0;

  const regularPrice = Number(quotation.product.price) || effectivePrice;
  const savings = Math.max(0, (regularPrice - effectivePrice) * effectiveQty);

  return {
    id: quotation.product.id,
    product: { ...quotation.product },
    quantity: effectiveQty,
    unitPrice: effectivePrice,
    itemTotal: effectiveQty * effectivePrice,
    savings,
    quotationId: quotation.id,
    quotationNumber: quotation.quotationNumber || quotation.id,
    quotationDetails: {
      quotedUnitPrice: effectivePrice,
      quotedQuantity: effectiveQty,
      validUntil: quotation.validUntil,
      dispatchTimeline: quotation.dispatchTimeline,
      sellerNotes: quotation.sellerNotes,
      freightTerms: quotation.freightTerms,
    },
    addedAt: new Date().toISOString(),
  };
};

export const remapQuotationSellerId = async (oldSellerId, newSellerId) => {
  if (!oldSellerId || !newSellerId || oldSellerId === newSellerId) return 0;
  const cleanOld = String(oldSellerId).trim().toLowerCase();
  const cleanNew = String(newSellerId).trim();

  let modifiedCount = 0;
  inMemoryQuotations.forEach((q) => {
    if (!q) return;
    let qChanged = false;
    const qSellerId = q.sellerId ? String(q.sellerId).trim().toLowerCase() : '';
    const qBizId = q.businessId ? String(q.businessId).trim().toLowerCase() : '';
    if (qSellerId === cleanOld || qBizId === cleanOld) {
      q.sellerId = cleanNew;
      q.businessId = cleanNew;
      qChanged = true;
    }
    if (q.product) {
      const prodSellerId = q.product.sellerId ? String(q.product.sellerId).trim().toLowerCase() : '';
      const prodBizId = q.product.businessId ? String(q.product.businessId).trim().toLowerCase() : '';
      if (prodSellerId === cleanOld || prodBizId === cleanOld) {
        q.product.sellerId = cleanNew;
        q.product.businessId = cleanNew;
        qChanged = true;
      }
    }
    if (qChanged) {
      modifiedCount++;
    }
  });

  try {
    if (storage && typeof storage.setItem === 'function') {
      await storage.setItem(STORAGE_KEY_QUOTATIONS, JSON.stringify(inMemoryQuotations));
    }
  } catch (err) {
    console.warn('[quotations] Failed to remap quotations in storage:', err);
  }

  notifyQuotationListeners();
  return modifiedCount;
};

export const remapQuotationProductId = async (oldProductId, newProductId) => {
  if (!oldProductId || !newProductId || oldProductId === newProductId) return 0;
  const cleanOld = String(oldProductId).trim().toLowerCase();
  const cleanNew = String(newProductId).trim();

  let modifiedCount = 0;
  inMemoryQuotations.forEach((q) => {
    if (!q) return;
    let qChanged = false;
    const qPId = q.productId || q.product?.id;
    if (qPId && String(qPId).trim().toLowerCase() === cleanOld) {
      q.productId = cleanNew;
      if (!q.legacyProductId) {
        q.legacyProductId = oldProductId;
      }
      qChanged = true;
    }
    if (q.product) {
      const prodPId = q.product.id || q.product.productId;
      if (prodPId && String(prodPId).trim().toLowerCase() === cleanOld) {
        q.product.id = cleanNew;
        if (!q.product.legacyId) {
          q.product.legacyId = oldProductId;
        }
        qChanged = true;
      }
    }
    if (qChanged) {
      modifiedCount++;
    }
  });

  try {
    if (storage && typeof storage.setItem === 'function') {
      await storage.setItem(STORAGE_KEY_QUOTATIONS, JSON.stringify(inMemoryQuotations));
    }
  } catch (err) {
    console.warn('[quotations] Failed to remap quotations in storage:', err);
  }

  notifyQuotationListeners();
  return modifiedCount;
};
